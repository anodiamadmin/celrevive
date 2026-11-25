"""populate base and active image_urls

Revision ID: 645fa625f7fd
Revises: 9c549137704a
Create Date: 2026-11-25 15:54:02.401807

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "645fa625f7fd"
down_revision: Union[str, Sequence[str], None] = "9c549137704a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


BASE_IMAGE_URLS: dict[str, str] = {
    "Light Lotion": "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/CelRiv_Light_Lotion.png?v=1795601686",
    "Moisturiser": "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/CelRiv_Moisturiser.png?v=1795601650",
    "Cream": "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/CelRiv_Cream.png?v=1795601635",
    "Serum": "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/CelRiv_Serum.png?v=1795601619",
    "Oil": "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/CelRiv_Oil.png?v=1795601669",
}

ACTIVE_IMAGE_URLS: dict[int, str] = {
    1: "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/Ectoin.png?v=1795601486",
    2: "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/SKINMIMICS_PRO_MB.png?v=1795601155",
    3: "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/Dermabiotics.png?v=1795601511",
    4: "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/Defensil_Plus.png?v=1795601155",
    5: "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/AmelioSense.png?v=1795601154",
    6: "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/Agefinity.png?v=1795601155",
    7: "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/ETERWELL_YOUTH.png?v=1795601152",
    8: "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/SYN-COLL_CB.png?v=1795601545",
    9: "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/ILUMYS.png?v=1795601138",
    10: "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/ENDOTHELYOL.png?v=1795601152",
    11: "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/Sytenol_A.png?v=1795601155",
    12: "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/NovoRetin.png?v=1795601434",
    13: "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/TRI-SOLVE.png?v=1795601413",
    14: "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/Glycoin_natural.png?v=1795601138",
    15: "https://cdn.shopify.com/s/files/1/0849/7220/8448/files/Vetivyne.png?v=1795601466",
}


def upgrade() -> None:
    """Populate image_url on base and active rows."""
    conn = op.get_bind()
    for base_name, url in BASE_IMAGE_URLS.items():
        conn.execute(
            sa.text("UPDATE base SET image_url = :url WHERE base_name = :base_name"),
            {"url": url, "base_name": base_name},
        )
    for active_id, url in ACTIVE_IMAGE_URLS.items():
        conn.execute(
            sa.text("UPDATE active SET image_url = :url WHERE active_id = :active_id"),
            {"url": url, "active_id": active_id},
        )


def downgrade() -> None:
    """Clear populated image_url values on base and active rows."""
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE base SET image_url = NULL"))
    conn.execute(sa.text("UPDATE active SET image_url = NULL"))
