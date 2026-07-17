"""Shared, lazy SQLAlchemy connection for Supabase PostgreSQL."""
from __future__ import annotations

import logging
import os
from functools import lru_cache

from dotenv import load_dotenv
from sqlalchemy import Engine, create_engine

logger = logging.getLogger(__name__)
load_dotenv()


@lru_cache(maxsize=1)
def get_engine() -> Engine | None:
    """Return the configured database engine without failing API startup."""
    database_url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
    if not database_url:
        logger.warning("DATABASE_URL is not configured; returning empty context")
        return None
    try:
        return create_engine(database_url, pool_pre_ping=True, pool_recycle=1800)
    except Exception:
        logger.exception("Unable to configure database engine")
        return None
