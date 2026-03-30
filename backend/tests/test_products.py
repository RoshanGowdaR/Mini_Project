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


def test_get_single_product_includes_review_summary(client, fake_db, create_user):
  artisan = create_user(email="artisan@example.com", role="artisan")
  buyer = create_user(email="buyer@example.com", role="buyer")
  product_id = fake_db["products"].insert_one(
    {
      "artisan_id": artisan["_id"],
      "title": "Clay Vase",
      "description": "Handcrafted pottery",
      "price": 120,
      "category": "Pottery",
    }
  ).inserted_id
  fake_db["product_reviews"].insert_one(
    {
      "product_id": product_id,
      "user_id": buyer["_id"],
      "rating": 5,
      "title": "Excellent",
      "comment": "Beautiful finish",
    }
  )

  response = client.get(f"/api/products/{product_id}")

  assert response.status_code == 200
  body = response.json()
  assert body["average_rating"] == 5.0
  assert body["review_count"] == 1


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


def test_review_requires_verified_purchase(client, fake_db, auth_header, create_user):
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

  response = client.post(
    f"/api/products/{product_id}/reviews",
    headers=headers,
    json={"rating": 5, "title": "Excellent", "comment": "Loved it"},
  )

  assert response.status_code == 400
  assert response.json()["message"] == "Only buyers who purchased this product can review it"


def test_review_creation_and_listing_work_for_verified_buyer(client, fake_db, auth_header, create_user):
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
      "quantity": 1,
      "total_amount": 120,
      "status": "delivered",
      "shipping_address": {"city": "Jaipur"},
    }
  )

  save_response = client.post(
    f"/api/products/{product_id}/reviews",
    headers=headers,
    json={"rating": 4, "title": "Great quality", "comment": "Very nice work"},
  )
  list_response = client.get(f"/api/products/{product_id}/reviews")

  assert save_response.status_code == 200
  save_body = save_response.json()
  assert save_body["review"]["rating"] == 4
  assert save_body["review"]["verified_purchase"] is True
  assert save_body["summary"]["review_count"] == 1
  assert save_body["summary"]["average_rating"] == 4.0

  assert list_response.status_code == 200
  list_body = list_response.json()
  assert len(list_body["reviews"]) == 1
  assert list_body["reviews"][0]["user_id"]["email"] == "buyer@example.com"
  assert list_body["summary"]["average_rating"] == 4.0


def test_review_submission_updates_existing_review_for_same_buyer(client, fake_db, auth_header, create_user):
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
      "quantity": 1,
      "total_amount": 120,
      "status": "delivered",
      "shipping_address": {"city": "Jaipur"},
    }
  )

  client.post(
    f"/api/products/{product_id}/reviews",
    headers=headers,
    json={"rating": 4, "title": "Good", "comment": "Nice"},
  )
  update_response = client.post(
    f"/api/products/{product_id}/reviews",
    headers=headers,
    json={"rating": 5, "title": "Excellent", "comment": "Even better after use"},
  )
  list_response = client.get(f"/api/products/{product_id}/reviews")

  assert update_response.status_code == 200
  assert update_response.json()["review"]["rating"] == 5
  assert len(list_response.json()["reviews"]) == 1
  assert list_response.json()["summary"]["average_rating"] == 5.0
