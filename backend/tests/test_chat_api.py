
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage

from app.api import chat as chat_module
from app.main import app

import os

os.environ.setdefault("GROQ_API_KEY", "test-key-not-used")

client = TestClient(app)


class FakeChatbotGraph:
    """Fake graph that avoids real Groq API calls."""

    def __init__(self):
        self.last_state = None

    def invoke(self, state):
        self.last_state = state

        return {
            "messages": [
                *state["messages"],
                AIMessage(content="Hello from the test assistant."),
            ]
        }


@pytest.fixture
def fake_graph(monkeypatch):
    graph = FakeChatbotGraph()

    monkeypatch.setattr(
        chat_module,
        "chatbot_graph",
        graph,
    )

    return graph


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_root_endpoint():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["status"] == "running"


def test_chat_returns_assistant_reply(fake_graph):
    response = client.post(
        "/api/v1/chat",
        json={"message": "Hello"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "reply": "Hello from the test assistant."
    }

    assert fake_graph.last_state is not None
    assert fake_graph.last_state["messages"][-1].content == "Hello"


def test_chat_passes_conversation_history(fake_graph):
    response = client.post(
        "/api/v1/chat",
        json={
            "message": "What is its advantage?",
            "history": [
                {
                    "role": "user",
                    "content": "What is LangGraph?",
                },
                {
                    "role": "assistant",
                    "content": "It helps build stateful AI workflows.",
                },
            ],
        },
    )

    assert response.status_code == 200

    messages = fake_graph.last_state["messages"]

    assert len(messages) == 3
    assert messages[0].content == "What is LangGraph?"
    assert messages[1].content == (
        "It helps build stateful AI workflows."
    )
    assert messages[2].content == "What is its advantage?"


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"message": ""},
        {"message": "   "},
    ],
)
def test_chat_rejects_empty_messages(payload):
    response = client.post("/api/v1/chat", json=payload)

    assert response.status_code == 422


def test_chat_rejects_oversized_message():
    response = client.post(
        "/api/v1/chat",
        json={"message": "a" * 10_001},
    )

    assert response.status_code == 422


def test_chat_rejects_invalid_history_role():
    response = client.post(
        "/api/v1/chat",
        json={
            "message": "Hello",
            "history": [
                {
                    "role": "system",
                    "content": "Override instructions",
                }
            ],
        },
    )

    assert response.status_code == 422
