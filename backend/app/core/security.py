# app/core/security.py

import hashlib
import hmac
from typing import Dict
from fastapi import HTTPException, Request, status
from app.core.config import settings


def verify_shopify_proxy_signature(query_params: Dict[str, str]) -> bool:
    """
    Validates Shopify App Proxy HMAC-SHA256 signature.
    Shopify calculates signature on sorted query parameters (excluding 'signature').
    """
    if "signature" not in query_params:
        return False

    provided_signature = query_params["signature"]

    # Sort parameters alphabetically and concatenate as key=value strings
    sorted_params = sorted(
        [(k, v) for k, v in query_params.items() if k != "signature"],
        key=lambda x: x[0]
    )
    message = "".join([f"{k}={v}" for k, v in sorted_params])

    computed_signature = hmac.new(
        settings.SHOPIFY_API_SECRET.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(computed_signature, provided_signature)