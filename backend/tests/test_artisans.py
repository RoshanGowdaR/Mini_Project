def test_save_artisan_profile_creates_profile(client, auth_header):
  headers, user = auth_header(email="artisan@example.com", role="artisan")

  response = client.post(
    "/api/artisans",
    headers=headers,
    json={
      "craftType": "Pottery",
      "yearsOfExperience": 12,
      "specialties": ["Blue pottery", "Custom work"],
      "workshopLocation": "Jaipur",
      "story": "Fourth generation artisan",
      "latitude": 26.9124,
      "longitude": 75.7873,
    },
  )

  assert response.status_code == 200
  body = response.json()
  assert body["message"] == "Artisan profile saved successfully"
  assert body["artisan"]["userId"] == str(user["_id"])
  assert body["artisan"]["craftType"] == "Pottery"


def test_save_artisan_profile_updates_existing_profile(client, fake_db, auth_header):
  headers, user = auth_header(email="artisan@example.com", role="artisan")
  fake_db["artisans"].insert_one(
    {
      "userId": user["_id"],
      "craftType": "Textiles",
      "yearsOfExperience": 8,
      "specialties": ["Weaving"],
      "workshopLocation": "Mysuru",
      "story": "Old story",
      "createdAt": "2026-01-01T00:00:00",
      "updatedAt": "2026-01-01T00:00:00",
    }
  )

  response = client.post(
    "/api/artisans",
    headers=headers,
    json={
      "craftType": "Pottery",
      "yearsOfExperience": 12,
      "specialties": ["Blue pottery"],
      "workshopLocation": "Jaipur",
      "story": "New story",
    },
  )

  assert response.status_code == 200
  assert response.json()["artisan"]["craftType"] == "Pottery"
  assert len(fake_db["artisans"].documents) == 1


def test_get_artisan_profile_requires_existing_profile(client, auth_header):
  headers, _ = auth_header(email="artisan@example.com", role="artisan")

  response = client.get("/api/artisans/profile", headers=headers)

  assert response.status_code == 404
  assert response.json()["message"] == "Artisan profile not found"


def test_get_artisans_lists_profiles_with_user_details(client, fake_db, create_user):
  artisan_user = create_user(email="artisan@example.com", role="artisan")
  fake_db["artisans"].insert_one(
    {
      "userId": artisan_user["_id"],
      "craftType": "Pottery",
      "yearsOfExperience": 12,
      "specialties": ["Blue pottery"],
      "workshopLocation": "Jaipur",
      "story": "Fourth generation artisan",
      "createdAt": "2026-01-01T00:00:00",
      "updatedAt": "2026-01-01T00:00:00",
    }
  )

  response = client.get("/api/artisans")

  assert response.status_code == 200
  body = response.json()
  assert len(body) == 1
  assert body[0]["userId"]["email"] == "artisan@example.com"
