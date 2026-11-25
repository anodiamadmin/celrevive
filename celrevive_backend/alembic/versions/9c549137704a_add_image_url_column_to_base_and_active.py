"""add image_url column to base and active

Revision ID: 9c549137704a
Revises: cab37086cd32
Create Date: 2026-11-25 15:02:29.122385

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c549137704a'
down_revision: Union[str, Sequence[str], None] = 'cab37086cd32'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("base", sa.Column("image_url", sa.Text(), nullable=True))
    op.add_column("active", sa.Column("image_url", sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("active", "image_url")
    op.drop_column("base", "image_url")