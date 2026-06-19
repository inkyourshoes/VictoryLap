import asyncio

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Import all models so they register with Base.metadata before create_all
from app.models import user, workout, goal, group  # noqa: F401
from app.database import Base, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="session")
async def db_session(test_engine) -> AsyncSession:
    async_session = async_sessionmaker(test_engine, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture(scope="session")
async def client(db_session: AsyncSession) -> AsyncClient:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="session")
async def test_user(client: AsyncClient) -> dict:
    resp = await client.post("/auth/register", json={
        "email": "crew@yard.com",
        "username": "crewdog",
        "password": "password123",
    })
    assert resp.status_code == 201
    login_resp = await client.post("/auth/login", json={
        "email": "crew@yard.com",
        "password": "password123",
    })
    token = login_resp.json()["access_token"]
    return {"user": resp.json(), "token": token}


@pytest.fixture(scope="session")
def auth_headers(test_user: dict) -> dict:
    return {"Authorization": f"Bearer {test_user['token']}"}
