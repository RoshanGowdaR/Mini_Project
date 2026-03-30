from copy import deepcopy

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient

import app as app_module


class InsertOneResult:
  def __init__(self, inserted_id):
    self.inserted_id = inserted_id


class FakeCollection:
  def __init__(self):
    self.documents = []

  def _clone(self, document):
    return deepcopy(document)

  def _matches(self, document, query):
    for key, value in query.items():
      if document.get(key) != value:
        return False
    return True

  def _project(self, document, projection):
    if not projection:
      return self._clone(document)

    include_keys = [key for key, enabled in projection.items() if enabled]
    projected = {}
    if "_id" in document:
      projected["_id"] = document["_id"]
    for key in include_keys:
      if key in document:
        projected[key] = document[key]
    return self._clone(projected)

  def insert_one(self, document):
    stored = self._clone(document)
    stored.setdefault("_id", ObjectId())
    self.documents.append(stored)
    return InsertOneResult(stored["_id"])

  def find_one(self, query, projection=None):
    for document in self.documents:
      if self._matches(document, query):
        return self._project(document, projection)
    return None

  def find(self, query=None):
    query = query or {}
    return [self._clone(document) for document in self.documents if self._matches(document, query)]

  def update_one(self, query, update):
    for document in self.documents:
      if self._matches(document, query):
        for key, value in update.get("$set", {}).items():
          document[key] = value
        return

  def delete_one(self, query):
    for index, document in enumerate(self.documents):
      if self._matches(document, query):
        self.documents.pop(index)
        return


@pytest.fixture
def fake_db(monkeypatch):
  collections = {
    "users": FakeCollection(),
    "products": FakeCollection(),
    "orders": FakeCollection(),
    "artisans": FakeCollection(),
  }
  monkeypatch.setattr(app_module, "users", collections["users"])
  monkeypatch.setattr(app_module, "products", collections["products"])
  monkeypatch.setattr(app_module, "orders", collections["orders"])
  monkeypatch.setattr(app_module, "artisans", collections["artisans"])
  monkeypatch.setattr(app_module, "jwt_secret", "test-secret")
  return collections


@pytest.fixture
def client(fake_db):
  return TestClient(app_module.app)


@pytest.fixture
def create_user(fake_db):
  def _create_user(email="user@example.com", password="password123", role="buyer"):
    password_hash = app_module.bcrypt.hashpw(password.encode("utf-8"), app_module.bcrypt.gensalt()).decode("utf-8")
    user = {"email": email, "password": password_hash, "role": role}
    result = fake_db["users"].insert_one(user)
    user["_id"] = result.inserted_id
    return user

  return _create_user


@pytest.fixture
def auth_header(create_user):
  def _auth_header(email="user@example.com", password="password123", role="buyer"):
    user = create_user(email=email, password=password, role=role)
    token = app_module.create_token(user)
    return {"Authorization": f"Bearer {token}"}, user

  return _auth_header
