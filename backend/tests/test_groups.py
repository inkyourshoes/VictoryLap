import pytest
from httpx import AsyncClient


async def test_create_group(client: AsyncClient, auth_headers: dict):
    resp = await client.post("/groups/", json={"name": "Iron Yard Crew"}, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Iron Yard Crew"
    assert len(data["invite_code"]) == 8
    assert data["created_by"] is not None


async def test_list_my_groups(client: AsyncClient, auth_headers: dict):
    await client.post("/groups/", json={"name": "List Test Crew"}, headers=auth_headers)
    resp = await client.get("/groups/", headers=auth_headers)
    assert resp.status_code == 200
    groups = resp.json()
    assert isinstance(groups, list)
    names = [g["name"] for g in groups]
    assert "List Test Crew" in names


async def test_get_group_by_invite_code(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post("/groups/", json={"name": "Chain Gang"}, headers=auth_headers)
    invite_code = create_resp.json()["invite_code"]

    # Public endpoint — no auth required
    resp = await client.get(f"/groups/invite/{invite_code}")
    assert resp.status_code == 200
    assert resp.json()["invite_code"] == invite_code
    assert resp.json()["name"] == "Chain Gang"


async def test_get_group_by_invalid_invite_code(client: AsyncClient):
    resp = await client.get("/groups/invite/BADCODE1")
    assert resp.status_code == 404


async def test_join_group_by_code(client: AsyncClient, auth_headers: dict):
    # Create group as first user
    create_resp = await client.post("/groups/", json={"name": "Rust Crew"}, headers=auth_headers)
    invite_code = create_resp.json()["invite_code"]

    # Register and log in a second user
    await client.post("/auth/register", json={
        "email": "newguy@yard.com",
        "username": "newguy",
        "password": "pass1234",
    })
    login = await client.post("/auth/login", json={"email": "newguy@yard.com", "password": "pass1234"})
    second_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    join_resp = await client.post(f"/groups/join-by-code/{invite_code}", headers=second_headers)
    assert join_resp.status_code == 200
    assert join_resp.json()["invite_code"] == invite_code


async def test_join_group_idempotent(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post("/groups/", json={"name": "Idempotent Crew"}, headers=auth_headers)
    invite_code = create_resp.json()["invite_code"]

    # Join again as creator — should not fail
    resp = await client.post(f"/groups/join-by-code/{invite_code}", headers=auth_headers)
    assert resp.status_code == 200


async def test_get_group_detail(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post("/groups/", json={"name": "Detail Crew"}, headers=auth_headers)
    group_id = create_resp.json()["id"]

    resp = await client.get(f"/groups/{group_id}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "members" in data
    assert "goals" in data
    assert len(data["members"]) >= 1  # creator is auto-joined


async def test_get_group_detail_non_member_forbidden(client: AsyncClient, auth_headers: dict):
    # Register a second user
    await client.post("/auth/register", json={
        "email": "outsider@yard.com",
        "username": "outsider",
        "password": "pass1234",
    })
    login = await client.post("/auth/login", json={"email": "outsider@yard.com", "password": "pass1234"})
    outsider_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    create_resp = await client.post("/groups/", json={"name": "Private Crew"}, headers=auth_headers)
    group_id = create_resp.json()["id"]

    resp = await client.get(f"/groups/{group_id}", headers=outsider_headers)
    assert resp.status_code == 403


async def test_create_goal(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post("/groups/", json={"name": "Goal Crew"}, headers=auth_headers)
    group_id = create_resp.json()["id"]

    resp = await client.post(
        f"/groups/{group_id}/goals",
        json={"title": "Run 5K", "description": "Daily grind", "target_date": "2026-12-31"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Run 5K"
    assert data["completed"] is False
    assert data["completed_by"] is None


async def test_mark_goal_complete(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post("/groups/", json={"name": "Complete Crew"}, headers=auth_headers)
    group_id = create_resp.json()["id"]

    goal_resp = await client.post(
        f"/groups/{group_id}/goals",
        json={"title": "Push Day"},
        headers=auth_headers,
    )
    goal_id = goal_resp.json()["id"]

    complete_resp = await client.patch(
        f"/groups/{group_id}/goals/{goal_id}/complete",
        headers=auth_headers,
    )
    assert complete_resp.status_code == 200
    data = complete_resp.json()
    assert data["completed"] is True
    assert data["completed_by"] is not None


async def test_get_messages_empty(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post("/groups/", json={"name": "Chat Crew"}, headers=auth_headers)
    group_id = create_resp.json()["id"]

    resp = await client.get(f"/groups/{group_id}/messages", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_get_messages_non_member_forbidden(client: AsyncClient, auth_headers: dict):
    await client.post("/auth/register", json={
        "email": "snoop@yard.com",
        "username": "snoop",
        "password": "pass1234",
    })
    login = await client.post("/auth/login", json={"email": "snoop@yard.com", "password": "pass1234"})
    snoop_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    create_resp = await client.post("/groups/", json={"name": "Secret Chat Crew"}, headers=auth_headers)
    group_id = create_resp.json()["id"]

    resp = await client.get(f"/groups/{group_id}/messages", headers=snoop_headers)
    assert resp.status_code == 403
