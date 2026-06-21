import asyncio
import os
from logging.config import fileConfig

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import pool

from alembic import context

# Import all models so they register with Base.metadata
from app.models import user, workout, goal, group, feed  # noqa: F401
from app.database import Base
from app.config import settings

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Prefer DATABASE_PUBLIC_URL: its host resolves via public DNS during Railway's
# build phase, where the private `*.railway.internal` host (used by DATABASE_URL)
# is not reachable. Fall back to the configured DATABASE_URL otherwise. Normalize
# to the asyncpg driver, matching app/database.py.
_raw_url = os.getenv("DATABASE_PUBLIC_URL") or settings.database_url
_db_url = _raw_url.replace("postgresql://", "postgresql+asyncpg://")
config.set_main_option("sqlalchemy.url", _db_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    url = config.get_main_option("sqlalchemy.url")
    connectable = create_async_engine(url, poolclass=pool.NullPool)

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
