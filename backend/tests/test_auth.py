import pytest
from httpx import AsyncClient


async def test_register(client: AsyncClient):
    resp = await client.post("/auth/register", json={
        "email": "newbie@yard.com",
        "username": "newbie",
        "password": "secret123",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "newbie@yard.com"
    assert data["username"] == "newbie"
    assert "id" in data
    assert "hashed_password" not in data


async def test_register_duplicate_email(client: AsyncClient, test_user: dict):
    resp = await client.post("/auth/register", json={
        "email": "crew@yard.com",  # already registered via test_user fixture
        "username": "someone_else",
        "password": "password123",
    })
    assert resp.status_code == 400


async def test_register_duplicate_username(client: AsyncClient, test_user: dict):
    resp = await client.post("/auth/register", json={
        "email": "other@yard.com",
        "username": "crewdog",  # already taken
        "password": "password123",
    })
    assert resp.status_code == 400


async def test_login_success(client: AsyncClient, test_user: dict):
    resp = await client.post("/auth/login", json={
        "email": "crew@yard.com",
        "password": "password123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client: AsyncClient, test_user: dict):
    resp = await client.post("/auth/login", json={
        "email": "crew@yard.com",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


async def test_login_unknown_email(client: AsyncClient):
    resp = await client.post("/auth/login", json={
        "email": "ghost@yard.com",
        "password": "password123",
    })
    assert resp.status_code == 401
