def test_register_creates_user_and_returns_token(client):
  response = client.post(
    "/api/auth/register",
    json={"email": "artisan@example.com", "password": "secret123", "userType": "artisan"},
  )

  assert response.status_code == 200
  body = response.json()
  assert body["user"]["email"] == "artisan@example.com"
  assert body["user"]["role"] == "artisan"
  assert isinstance(body["token"], str)


def test_register_rejects_duplicate_email(client, create_user):
  create_user(email="artisan@example.com")

  response = client.post(
    "/api/auth/register",
    json={"email": "artisan@example.com", "password": "secret123", "userType": "artisan"},
  )

  assert response.status_code == 400
  assert response.json()["message"] == "Email already in use"


def test_login_returns_token_for_valid_credentials(client, create_user):
  create_user(email="buyer@example.com", password="secret123", role="buyer")

  response = client.post(
    "/api/auth/login",
    json={"email": "buyer@example.com", "password": "secret123"},
  )

  assert response.status_code == 200
  body = response.json()
  assert body["user"]["email"] == "buyer@example.com"
  assert body["user"]["role"] == "buyer"
  assert isinstance(body["token"], str)


def test_login_rejects_invalid_credentials(client, create_user):
  create_user(email="buyer@example.com", password="secret123")

  response = client.post(
    "/api/auth/login",
    json={"email": "buyer@example.com", "password": "wrong-password"},
  )

  assert response.status_code == 400
  assert response.json()["message"] == "Invalid credentials"
