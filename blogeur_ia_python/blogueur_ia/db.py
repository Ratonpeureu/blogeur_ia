from contextlib import asynccontextmanager
from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from blogueur_ia.config import settings

engine = create_async_engine(settings.database_url, echo=False, future=True)
_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@asynccontextmanager
async def get_session():
    async with _session_factory() as session:
        yield session


async def init_db() -> None:
    """Crée les tables si elles n'existent pas encore.
    Pour un usage en production avec des migrations versionnées, préférez Alembic —
    ceci est un démarrage rapide pour cloner et travailler immédiatement."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)