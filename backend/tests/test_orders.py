def test_create_order_requires_authentication(client):
  response = client.post(
    "/api/orders",
    json={
      "product_id": "507f1f77bcf86cd799439011",
      "quantity": 2,
      "total_amount": 240,
      "shipping_address": {"city": "Jaipur"},
    },
  )

  assert response.status_code == 401
  assert response.json()["message"] == "No token"


def test_create_order_assigns_authenticated_buyer(client, fake_db, auth_header):
  headers, buyer = auth_header(email="buyer@example.com", role="buyer")
  product_id = fake_db["products"].insert_one(
    {
      "artisan_id": buyer["_id"],
      "title": "Clay Vase",
      "description": "Handcrafted pottery",
      "price": 120,
      "category": "Pottery",
    }
  ).inserted_id

  response = client.post(
    "/api/orders",
    headers=headers,
    json={
      "product_id": str(product_id),
      "quantity": 2,
      "total_amount": 240,
      "shipping_address": {"city": "Jaipur", "country": "India"},
    },
  )

  assert response.status_code == 200
  body = response.json()
  assert body["buyer_id"] == str(buyer["_id"])
  assert body["product_id"] == str(product_id)
  assert body["status"] == "pending"


def test_get_orders_returns_orders_for_authenticated_buyer(client, fake_db, auth_header, create_user):
  headers, buyer = auth_header(email="buyer@example.com", role="buyer")
  artisan = create_user(email="artisan@example.com", role="artisan")
  product_id = fake_db["products"].insert_one(
    {
      "artisan_id": artisan["_id"],
      "title": "Clay Vase",
      "description": "Handcrafted pottery",
      "price": 120,
      "category": "Pottery",
    }
  ).inserted_id
  fake_db["orders"].insert_one(
    {
      "buyer_id": buyer["_id"],
      "product_id": product_id,
      "quantity": 2,
      "total_amount": 240,
      "status": "pending",
      "shipping_address": {"city": "Jaipur"},
    }
  )

  response = client.get("/api/orders", headers=headers)

  assert response.status_code == 200
  body = response.json()
  assert len(body) == 1
  assert body[0]["product_id"]["title"] == "Clay Vase"
  assert body[0]["product_id"]["artisan_id"]["email"] == "artisan@example.com"
