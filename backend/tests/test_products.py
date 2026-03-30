from bson import ObjectId


def test_create_product_requires_authentication(client):
  response = client.post(
    "/api/products",
    json={
      "title": "Clay Vase",
      "description": "Handcrafted pottery",
      "price": 120,
      "category": "Pottery",
    },
  )

  assert response.status_code == 401
  assert response.json()["message"] == "No token"


def test_create_product_assigns_authenticated_artisan(client, auth_header):
  headers, user = auth_header(role="artisan")

  response = client.post(
    "/api/products",
    headers=headers,
    json={
      "title": "Clay Vase",
      "description": "Handcrafted pottery",
      "story": "Made using traditional methods",
      "price": 120,
      "category": "Pottery",
      "materials": ["Clay"],
      "images": ["img-1"],
      "stock_quantity": 4,
      "is_available": True,
    },
  )

  assert response.status_code == 200
  body = response.json()
  assert body["title"] == "Clay Vase"
  assert body["artisan_id"] == str(user["_id"])
  assert body["category"] == "Pottery"


def test_get_products_filters_by_artisan_and_populates_email(client, fake_db, create_user):
  artisan = create_user(email="artisan@example.com", role="artisan")
  other_artisan = create_user(email="other@example.com", role="artisan")
  fake_db["products"].insert_one(
    {
      "artisan_id": artisan["_id"],
      "title": "Clay Vase",
      "description": "Handcrafted pottery",
      "price": 120,
      "category": "Pottery",
      "created_at": "2026-01-01T00:00:00",
    }
  )
  fake_db["products"].insert_one(
    {
      "artisan_id": other_artisan["_id"],
      "title": "Wood Bowl",
      "description": "Carved bowl",
      "price": 80,
      "category": "Woodwork",
      "created_at": "2026-01-01T00:00:00",
    }
  )

  response = client.get(f"/api/products?artisan_id={artisan['_id']}")

  assert response.status_code == 200
  body = response.json()
  assert len(body) == 1
  assert body[0]["artisan_id"]["email"] == "artisan@example.com"


def test_get_single_product_returns_404_for_unknown_id(client):
  response = client.get(f"/api/products/{ObjectId()}")

  assert response.status_code == 404
  assert response.json()["message"] == "Not found"


def test_update_product_enforces_ownership(client, fake_db, auth_header, create_user):
  owner_headers, owner = auth_header(email="owner@example.com", role="artisan")
  other_headers, _ = auth_header(email="other@example.com", role="artisan")
  product_id = fake_db["products"].insert_one(
    {
      "artisan_id": owner["_id"],
      "title": "Clay Vase",
      "description": "Handcrafted pottery",
      "price": 120,
      "category": "Pottery",
    }
  ).inserted_id

  forbidden = client.put(
    f"/api/products/{product_id}",
    headers=other_headers,
    json={"title": "Updated"},
  )
  allowed = client.put(
    f"/api/products/{product_id}",
    headers=owner_headers,
    json={"title": "Updated"},
  )

  assert forbidden.status_code == 403
  assert forbidden.json()["message"] == "Forbidden"
  assert allowed.status_code == 200
  assert allowed.json()["title"] == "Updated"


def test_delete_product_removes_owned_product(client, fake_db, auth_header):
  headers, user = auth_header(email="artisan@example.com", role="artisan")
  product_id = fake_db["products"].insert_one(
    {
      "artisan_id": user["_id"],
      "title": "Clay Vase",
      "description": "Handcrafted pottery",
      "price": 120,
      "category": "Pottery",
    }
  ).inserted_id

  response = client.delete(f"/api/products/{product_id}", headers=headers)

  assert response.status_code == 200
  assert response.json()["message"] == "Deleted"
  assert fake_db["products"].find_one({"_id": product_id}) is None
