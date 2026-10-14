from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.main import app

client = TestClient(app)

TEST_USER_ID = "user_test_123"
OTHER_USER_ID = "user_other_456"

app.dependency_overrides[get_current_user] = lambda: {
    "user_id": TEST_USER_ID,
    "claims": {"sub": TEST_USER_ID},
}


@patch("app.api.conversations.list_conversations")
def test_list_conversations(mock_list):
    now = datetime.now(timezone.utc)
    mock_list.return_value = [
        {
            "id": "conv-1",
            "title": "Conversation 1",
            "created_at": now,
            "updated_at": now,
        }
    ]

    response = client.get("/api/v1/conversations")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == "conv-1"
    assert data[0]["title"] == "Conversation 1"
    mock_list.assert_called_once_with(user_id=TEST_USER_ID)


@patch("app.api.conversations.create_conversation")
def test_create_conversation(mock_create):
    now = datetime.now(timezone.utc)
    mock_create.return_value = {
        "id": "conv-new",
        "title": "My New Chat",
        "created_at": now,
        "updated_at": now,
    }

    response = client.post(
        "/api/v1/conversations",
        json={"title": "My New Chat"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["id"] == "conv-new"
    assert data["title"] == "My New Chat"
    mock_create.assert_called_once_with(user_id=TEST_USER_ID, title="My New Chat")


@patch("app.api.conversations.create_conversation")
def test_create_conversation_rejects_empty_title(mock_create):
    response = client.post(
        "/api/v1/conversations",
        json={"title": "   "},
    )
    assert response.status_code == 422


@patch("app.api.conversations.rename_conversation")
def test_rename_conversation_success(mock_rename):
    now = datetime.now(timezone.utc)
    mock_rename.return_value = {
        "id": "conv-1",
        "title": "Renamed Chat",
        "created_at": now,
        "updated_at": now,
    }

    response = client.patch(
        "/api/v1/conversations/conv-1",
        json={"title": "Renamed Chat"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "conv-1"
    assert data["title"] == "Renamed Chat"
    mock_rename.assert_called_once_with(
        user_id=TEST_USER_ID,
        conversation_id="conv-1",
        title="Renamed Chat",
    )


@patch("app.api.conversations.rename_conversation")
def test_rename_conversation_not_found_or_unowned(mock_rename):
    mock_rename.return_value = None

    response = client.patch(
        "/api/v1/conversations/conv-unowned",
        json={"title": "Renamed Chat"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Conversation not found"


@patch("app.api.conversations.list_messages")
def test_get_conversation_messages_success(mock_messages):
    now = datetime.now(timezone.utc)
    mock_messages.return_value = [
        {
            "id": "msg-1",
            "role": "user",
            "content": "Hello",
            "created_at": now,
        },
        {
            "id": "msg-2",
            "role": "assistant",
            "content": "Hi there!",
            "created_at": now,
        },
    ]

    response = client.get("/api/v1/conversations/conv-1/messages")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["content"] == "Hello"
    assert data[1]["content"] == "Hi there!"
    mock_messages.assert_called_once_with(
        user_id=TEST_USER_ID,
        conversation_id="conv-1",
    )


@patch("app.api.conversations.list_messages")
def test_get_conversation_messages_not_found_or_unowned(mock_messages):
    mock_messages.return_value = None

    response = client.get("/api/v1/conversations/conv-unowned/messages")

    assert response.status_code == 404
    assert response.json()["detail"] == "Conversation not found"


@patch("app.api.conversations.delete_conversation")
def test_delete_conversation_success(mock_delete):
    mock_delete.return_value = True

    response = client.delete("/api/v1/conversations/conv-1")

    assert response.status_code == 204
    mock_delete.assert_called_once_with(
        user_id=TEST_USER_ID,
        conversation_id="conv-1",
    )


@patch("app.api.conversations.delete_conversation")
def test_delete_conversation_not_found_or_unowned(mock_delete):
    mock_delete.return_value = False

    response = client.delete("/api/v1/conversations/conv-unowned")

    assert response.status_code == 404
    assert response.json()["detail"] == "Conversation not found"
