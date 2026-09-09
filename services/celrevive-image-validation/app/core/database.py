"""PostgreSQL connection helpers for CelRevive operational persistence."""

from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg.rows import dict_row

from app.core.config import get_settings


@contextmanager
def get_connection() -> Iterator[psycopg.Connection]:
    """Yield one transaction-scoped PostgreSQL connection."""
    settings = get_settings()
    if not settings.DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured.")

    with psycopg.connect(settings.DATABASE_URL, row_factory=dict_row) as connection:
        yield connection
