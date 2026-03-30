import json


def test_chat_endpoint_returns_groq_reply(client, monkeypatch):
  monkeypatch.setattr(
    "app.generate_groq_completion",
    lambda messages, temperature=0.4: "Groq says handmade pottery is trending.",
  )

  response = client.post(
    "/api/ai/chat",
    json={
      "messages": [
        {"role": "user", "content": "What is trending right now?"},
      ]
    },
  )

  assert response.status_code == 200
  assert response.json()["reply"] == "Groq says handmade pottery is trending."


def test_market_trends_endpoint_returns_structured_groq_insights(client, monkeypatch):
  payload = {
    "summary": "Handcrafted home decor is showing strong buyer interest.",
    "market_signal": "Pottery and woodcraft are outperforming other categories.",
    "trending_categories": ["Pottery", "Woodcraft", "Textiles"],
    "buyer_opportunities": ["Gift-ready bundles", "Seasonal decor", "Personalized craft sets"],
    "recommended_actions": ["Feature pottery", "Promote bundles", "Highlight artisan stories"],
    "monthly_trend": [{"label": "Jan", "value": 12}],
    "category_share": [{"name": "Pottery", "value": 48}],
    "trending_products": [{"name": "Clay Vase", "score": 91}],
  }

  monkeypatch.setattr("app.generate_groq_completion", lambda messages, temperature=0.3: json.dumps(payload))

  response = client.get("/api/ai/market-trends")

  assert response.status_code == 200
  body = response.json()
  assert body["summary"] == payload["summary"]
  assert body["trending_categories"] == payload["trending_categories"]
  assert body["monthly_trend"] == payload["monthly_trend"]
  assert "snapshot" in body


def test_market_trends_endpoint_falls_back_when_groq_returns_plain_text(client, monkeypatch):
  monkeypatch.setattr(
    "app.generate_groq_completion",
    lambda messages, temperature=0.3: "Demand is rising for pottery and gift-oriented craft products.",
  )

  response = client.get("/api/ai/market-trends")

  assert response.status_code == 200
  body = response.json()
  assert body["summary"] == "Demand is rising for pottery and gift-oriented craft products."
  assert body["trending_categories"] == []
  assert body["monthly_trend"] == []


def test_recommendations_endpoint_returns_top_five_items(client, monkeypatch, auth_header):
  headers, _ = auth_header(email="artisan@example.com", role="artisan")
  monkeypatch.setattr(
    "app.generate_groq_completion",
    lambda messages, temperature=0.35: json.dumps(
      {
        "recommendations": [
          "Create a festive pottery collection",
          "Offer gift bundle sets",
          "Launch custom engraved pieces",
          "Highlight heritage process videos",
          "Introduce smaller entry-price products",
        ]
      }
    ),
  )

  response = client.get("/api/ai/recommendations", headers=headers)

  assert response.status_code == 200
  assert len(response.json()["recommendations"]) == 5
