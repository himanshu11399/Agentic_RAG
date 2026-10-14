from unittest.mock import patch

from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.core.security import AuthenticationError


app = FastAPI()


@app.get("/protected")
def protected_route(user: dict = Depends(get_current_user)):
    return {"user_id": user["user_id"]}


client = TestClient(app)


def test_missing_token_is_rejected():
    response = client.get("/protected")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


@patch("app.api.dependencies.verify_clerk_token")
def test_valid_token_returns_verified_user(mock_verify):
    mock_verify.return_value = {
        "sub": "user_test_123",
        "iss": "https://issuer.example",
    }

    response = client.get(
        "/protected",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    assert response.json() == {"user_id": "user_test_123"}


@patch("app.api.dependencies.verify_clerk_token")
def test_invalid_token_is_rejected(mock_verify):
    mock_verify.side_effect = AuthenticationError("Invalid token")

    response = client.get(
        "/protected",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert response.status_code == 401