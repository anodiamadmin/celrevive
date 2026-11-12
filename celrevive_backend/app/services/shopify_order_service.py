import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx
from dotenv import load_dotenv, set_key
from fastapi import HTTPException, status

# Explicitly load .env from the backend root directory
BACKEND_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE_PATH = BACKEND_ROOT / ".env"
load_dotenv(ENV_FILE_PATH, override=True)

logger = logging.getLogger("uvicorn.error")


async def exchange_session_token_for_offline_token(
    shop_domain: str, id_token: str
) -> Optional[str]:
    """
    Exchanges Shopify's embedded Admin session JWT (id_token) via RFC 8693
    for a permanent offline Admin API access token (shpat_...) and persists
    it to the backend .env file.
    """
    load_dotenv(ENV_FILE_PATH, override=True)
    client_id = os.getenv("SHOPIFY_CLIENT_ID", "").strip()
    client_secret = (
        os.getenv("SHOPIFY_API_SECRET", "").strip()
        or os.getenv("SHOPIFY_CLIENT_SECRET", "").strip()
    )

    if not client_id or not client_secret or not id_token:
        return None

    clean_shop = (
        shop_domain.replace("https://", "").replace("http://", "").strip("/")
    )
    token_url = f"https://{clean_shop}/admin/oauth/access_token"

    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "urn:ietf:params:oauth:grant-type:token-exchange",
        "subject_token": id_token,
        "subject_token_type": "urn:ietf:params:oauth:token-type:id_token",
        "requested_token_type": "urn:shopify:params:oauth:token-type:offline-access-token",
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post(
                token_url,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            )

        if res.status_code != 200:
            logger.error(
                "Shopify RFC 8693 token exchange failed (%s): %s",
                res.status_code,
                res.text,
            )
            return None

        access_token = res.json().get("access_token")
        if access_token:
            os.environ["SHOPIFY_ADMIN_ACCESS_TOKEN"] = access_token
            set_key(
                str(ENV_FILE_PATH),
                "SHOPIFY_ADMIN_ACCESS_TOKEN",
                access_token,
            )
            logger.info(
                "Saved permanent SHOPIFY_ADMIN_ACCESS_TOKEN to %s", ENV_FILE_PATH
            )
            return access_token
    except Exception:
        logger.exception("Error during Shopify token exchange")

    return None


async def _get_shopify_admin_token(shop_domain: str) -> str:
    load_dotenv(ENV_FILE_PATH, override=True)

    static_token = os.getenv("SHOPIFY_ADMIN_ACCESS_TOKEN", "").strip()
    if static_token:
        return static_token

    msg = (
        "SHOPIFY_ADMIN_ACCESS_TOKEN is not in .env yet. "
        "Open 'CelRevive AI Skin Assessment' inside Shopify Admin -> Apps once "
        "so the backend can automatically capture and save the offline token to .env."
    )
    logger.error(msg)
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=msg,
    )

    token_url = f"https://{shop_domain}/admin/oauth/access_token"
    logger.info("Requesting Shopify Admin token from %s for client_id=%s...", token_url, client_id[:6])

    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.post(
            token_url,
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "grant_type": "client_credentials",
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            },
        )

    if res.status_code != 200:
        msg = f"Shopify token exchange failed (HTTP {res.status_code}): {res.text}"
        logger.error(msg)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )

    data = res.json()
    access_token = data.get("access_token")
    if not access_token:
        msg = f"Shopify token response missing access_token: {data}"
        logger.error(msg)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )

    return access_token


async def create_and_complete_zero_cost_order(
    *,
    session_id: str,
    shopify_customer_id: Optional[str],
    shopify_customer_email: Optional[str],
    shopify_customer_name: Optional[str],
    skin_type: Optional[str],
    skin_concerns: List[Dict[str, Any]],
    recommended_base: Dict[str, Any],
    formulation_weight_g: Optional[Any],
    recommended_actives: List[Dict[str, Any]],
) -> Dict[str, Any]:
    try:
        load_dotenv(BACKEND_ROOT / ".env", override=True)
        shop_domain = (
            os.getenv("SHOPIFY_STORE_DOMAIN", "46a312.myshopify.com")
            .replace("https://", "")
            .replace("http://", "")
            .strip("/")
        )
        if not shop_domain:
            shop_domain = "46a312.myshopify.com"

        api_version = os.getenv("SHOPIFY_API_VERSION", "2026-07").strip() or "2026-07"
        access_token = await _get_shopify_admin_token(shop_domain)
        graphql_url = f"https://{shop_domain}/admin/api/{api_version}/graphql.json"

        base_name = (recommended_base or {}).get("base_name", "Custom Base")
        weight_str = f"{formulation_weight_g}g" if formulation_weight_g else "100g"
        line_item_title = f"CelRevive Bespoke Formula — {base_name} ({weight_str})"
        customer_display_name = (shopify_customer_name or "").strip() or "Customer"

        actives_summary = ", ".join(
            f"{a.get('active_name')} ({a.get('recommended_usage_percentage')}%)"
            if isinstance(a, dict) and a.get("recommended_usage_percentage") is not None
            else str(a.get("active_name") if isinstance(a, dict) else a)
            for a in (recommended_actives or [])
        ) or "None (Base only)"

        concerns_summary = ", ".join(
            (c.get("skin_concern_name") or c.get("concern_name") or str(c))
            if isinstance(c, dict)
            else str(c)
            for c in (skin_concerns or [])
        ) or "None"

        custom_attributes = [
            {"key": "Customer Name", "value": customer_display_name},
            {"key": "Session ID", "value": str(session_id)},
            {"key": "Skin Type", "value": str(skin_type or "Normal")},
            {"key": "Primary Concerns", "value": concerns_summary},
            {"key": "Base Formula", "value": f"{base_name} ({weight_str})"},
            {"key": "Active Ingredients", "value": actives_summary},
        ]

        draft_input: Dict[str, Any] = {
            "note": (
                f"CelRevive AI Skin Assessment MVP Order | "
                f"Customer: {customer_display_name} | Session: {session_id}"
            ),
            "tags": ["CelRevive-AI", "MVP-Zero-Cost"],
            "customAttributes": custom_attributes,
            "lineItems": [
                {
                    "title": line_item_title,
                    "quantity": 1,
                    "originalUnitPrice": "0.00",
                    "customAttributes": custom_attributes,
                }
            ],
        }

        if shopify_customer_id and str(shopify_customer_id).isdigit():
            draft_input["customerId"] = f"gid://shopify/Customer/{shopify_customer_id}"
        elif shopify_customer_email and "@" in str(shopify_customer_email):
            draft_input["email"] = str(shopify_customer_email).strip()

        draft_create_mutation = """
        mutation draftOrderCreate($input: DraftOrderInput!) {
          draftOrderCreate(input: $input) {
            draftOrder {
              id
              name
            }
            userErrors {
              field
              message
            }
          }
        }
        """

        draft_complete_mutation = """
        mutation draftOrderComplete($id: ID!) {
          draftOrderComplete(id: $id) {
            draftOrder {
              id
              name
              order {
                id
                name
              }
            }
            userErrors {
              field
              message
            }
          }
        }
        """

        headers = {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": access_token,
        }

        async with httpx.AsyncClient(timeout=25.0) as client:
            # Step 1: Create Draft Order
            create_res = await client.post(
                graphql_url,
                json={"query": draft_create_mutation, "variables": {"input": draft_input}},
                headers=headers,
            )
            if create_res.status_code != 200:
                msg = f"Shopify draftOrderCreate failed ({create_res.status_code}): {create_res.text}"
                logger.error(msg)
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

            create_body = create_res.json()
            if create_body.get("errors"):
                msg = f"GraphQL error (draftOrderCreate): {create_body['errors']}"
                logger.error(msg)
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

            payload_create = create_body.get("data", {}).get("draftOrderCreate", {})
            user_errors = payload_create.get("userErrors") or []
            if user_errors:
                msg = f"Draft order validation error: {user_errors}"
                logger.error(msg)
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

            draft_order = payload_create.get("draftOrder")
            if not draft_order or not draft_order.get("id"):
                msg = f"Draft order ID missing from response: {create_body}"
                logger.error(msg)
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

            draft_order_gid = draft_order["id"]

            # Step 2: Complete Draft Order into a real $0.00 Paid Order
            complete_res = await client.post(
                graphql_url,
                json={"query": draft_complete_mutation, "variables": {"id": draft_order_gid}},
                headers=headers,
            )
            if complete_res.status_code != 200:
                msg = f"Shopify draftOrderComplete failed ({complete_res.status_code}): {complete_res.text}"
                logger.error(msg)
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

            complete_body = complete_res.json()
            if complete_body.get("errors"):
                msg = f"GraphQL error (draftOrderComplete): {complete_body['errors']}"
                logger.error(msg)
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

            payload_complete = complete_body.get("data", {}).get("draftOrderComplete", {})
            complete_errors = payload_complete.get("userErrors") or []
            if complete_errors:
                msg = f"Draft order completion error: {complete_errors}"
                logger.error(msg)
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

            completed_draft = payload_complete.get("draftOrder") or {}
            final_order = completed_draft.get("order") or {}
            order_name = final_order.get("name") or completed_draft.get("name") or "Placed"

            logger.info("Successfully created & completed Shopify order %s for session %s", order_name, session_id)

            return {
                "status": "ORDER_PLACED",
                "draft_order_id": draft_order_gid,
                "order_id": final_order.get("id") or draft_order_gid,
                "order_name": order_name,
            }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unhandled error in create_and_complete_zero_cost_order")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order error: {type(exc).__name__}: {str(exc)}",
        )