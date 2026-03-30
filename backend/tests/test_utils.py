from datetime import datetime

import jwt
import pytest
from fastapi import HTTPException

import app as app_module


def test_serialize_datetime_returns_iso_string():
  timestamp = datetime(2026, 1, 1, 12, 30, 0)

  assert app_module.serialize_datetime(timestamp) == "2026-01-01T12:30:00"


def test_extract_message_supports_dict_and_plain_values():
  assert app_module.extract_message({"message": "Bad request"}) == "Bad request"
  assert app_module.extract_message("Oops") == "Oops"


def test_require_user_decodes_valid_token(create_user, monkeypatch):
  monkeypatch.setattr(app_module, "jwt_secret", "test-secret")
  user = create_user(email="artisan@example.com", role="artisan")
  token = app_module.create_token(user)

  payload = app_module.require_user(f"Bearer {token}")

  assert payload["id"] == str(user["_id"])
  assert payload["role"] == "artisan"


def test_require_user_rejects_invalid_token(monkeypatch):
  monkeypatch.setattr(app_module, "jwt_secret", "test-secret")
  bad_token = jwt.encode({"id": "123"}, "wrong-secret", algorithm="HS256")

  with pytest.raises(HTTPException) as exc:
    app_module.require_user(f"Bearer {bad_token}")

  assert exc.value.status_code == 401
