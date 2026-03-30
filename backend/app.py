import json
import os
import hashlib
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any, Dict, List, Optional

import bcrypt
import jwt
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from groq import Groq
from pymongo import MongoClient
from pydantic import BaseModel, Field


load_dotenv()


class InMemoryCollection:
  def __init__(self):
    self.documents: List[Dict[str, Any]] = []

  def _matches(self, document: Dict[str, Any], query: Dict[str, Any]):
    for key, expected in query.items():
      if document.get(key) != expected:
        return False
    return True

  def _project(self, document: Dict[str, Any], projection: Optional[Dict[str, int]] = None):
    if not projection:
      return deepcopy(document)

    projected = {"_id": document["_id"]}
    for key, include in projection.items():
      if include and key in document:
        projected[key] = deepcopy(document[key])
    return projected

  def find_one(self, query: Dict[str, Any], projection: Optional[Dict[str, int]] = None):
    for document in self.documents:
      if self._matches(document, query):
        return self._project(document, projection)
    return None

  def find(self, query: Optional[Dict[str, Any]] = None):
    query = query or {}
    return [deepcopy(document) for document in self.documents if self._matches(document, query)]

  def insert_one(self, document: Dict[str, Any]):
    stored = deepcopy(document)
    stored.setdefault("_id", ObjectId())
    self.documents.append(stored)
    return SimpleNamespace(inserted_id=stored["_id"])

  def update_one(self, query: Dict[str, Any], update: Dict[str, Any]):
    for document in self.documents:
      if self._matches(document, query):
        document.update(deepcopy(update.get("$set", {})))
        return SimpleNamespace(matched_count=1, modified_count=1)
    return SimpleNamespace(matched_count=0, modified_count=0)

  def delete_one(self, query: Dict[str, Any]):
    for index, document in enumerate(self.documents):
      if self._matches(document, query):
        del self.documents[index]
        return SimpleNamespace(deleted_count=1)
    return SimpleNamespace(deleted_count=0)


app = FastAPI(title="Ophelia Backend", version="1.0.0")
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/Ophelia_AI")
jwt_secret = os.getenv("JWT_SECRET", "secret")
groq_api_key = os.getenv("GROQ_API_KEY", "")
groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


def connect_collections():
  try:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
    client.admin.command("ping")
    db = client.get_default_database()
    if db is None:
      db_name = mongo_uri.rsplit("/", 1)[-1] or "Ophelia_AI"
      db = client[db_name]

    return {
      "mode": "mongo",
      "client": client,
      "users": db["users"],
      "products": db["products"],
      "orders": db["orders"],
      "artisans": db["artisans"],
      "reviews": db["reviews"],
    }
  except Exception:
    return {
      "mode": "memory",
      "client": None,
      "users": InMemoryCollection(),
      "products": InMemoryCollection(),
      "orders": InMemoryCollection(),
      "artisans": InMemoryCollection(),
      "reviews": InMemoryCollection(),
    }


collections = connect_collections()
database_mode = collections["mode"]
users = collections["users"]
products = collections["products"]
orders = collections["orders"]
artisans = collections["artisans"]
reviews = collections["reviews"]


class AuthPayload(BaseModel):
  email: str
  password: str
  userType: Optional[str] = "buyer"
  fullName: Optional[str] = None


class ProductPayload(BaseModel):
  title: str
  description: str
  story: Optional[str] = None
  price: float
  category: str
  materials: List[str] = Field(default_factory=list)
  dimensions: Optional[str] = None
  weight: Optional[str] = None
  images: List[str] = Field(default_factory=list)
  stock_quantity: Optional[int] = 0
  is_available: Optional[bool] = True


class ArtisanPayload(BaseModel):
  craftType: str
  yearsOfExperience: Optional[int] = 0
  specialties: List[str] = Field(default_factory=list)
  workshopLocation: str
  story: str
  latitude: Optional[float] = None
  longitude: Optional[float] = None


class OrderPayload(BaseModel):
  product_id: str
  quantity: int
  total_amount: float
  status: Optional[str] = "pending"
  shipping_address: Dict[str, Any] = Field(default_factory=dict)


class ReviewPayload(BaseModel):
  rating: int = Field(ge=1, le=5)
  title: Optional[str] = None
  comment: Optional[str] = None


class ChatMessagePayload(BaseModel):
  role: str
  content: str


class ChatRequestPayload(BaseModel):
  messages: List[ChatMessagePayload]


def serialize_datetime(value: Any):
  if isinstance(value, datetime):
    return value.isoformat()
  return value


def to_object_id(value: Any):
  if isinstance(value, ObjectId):
    return value
  if not value:
    return None
  try:
    return ObjectId(value)
  except Exception:
    return None


def serialize_user(user: Dict[str, Any]):
  return {
    "id": str(user["_id"]),
    "email": user["email"],
    "role": user.get("role", "buyer"),
  }


def serialize_product(product: Dict[str, Any]):
  artisan_value = product.get("artisan_id")
  if isinstance(artisan_value, dict):
    artisan_payload = {
      "_id": str(artisan_value.get("_id")),
      "email": artisan_value.get("email"),
    }
  else:
    artisan_payload = str(artisan_value) if artisan_value else None

  product_reviews = reviews.find({"product_id": product["_id"]})
  review_count = len(product_reviews)
  average_rating = round(
    sum(float(review.get("rating", 0) or 0) for review in product_reviews) / review_count,
    1,
  ) if review_count else 0

  return {
    "_id": str(product["_id"]),
    "artisan_id": artisan_payload,
    "title": product["title"],
    "description": product["description"],
    "story": product.get("story"),
    "price": product["price"],
    "category": product["category"],
    "materials": product.get("materials", []),
    "dimensions": product.get("dimensions"),
    "weight": product.get("weight"),
    "images": product.get("images", []),
    "stock_quantity": product.get("stock_quantity", 0),
    "is_available": product.get("is_available", True),
    "created_at": serialize_datetime(product.get("created_at")),
    "average_rating": average_rating,
    "review_count": review_count,
  }


def serialize_artisan(artisan: Dict[str, Any]):
  user_value = artisan.get("userId")
  if isinstance(user_value, dict):
    user_payload = {
      "_id": str(user_value.get("_id")),
      "email": user_value.get("email"),
      "role": user_value.get("role"),
    }
  else:
    user_payload = str(user_value) if user_value else None

  return {
    "_id": str(artisan["_id"]),
    "userId": user_payload,
    "craftType": artisan["craftType"],
    "yearsOfExperience": artisan.get("yearsOfExperience", 0),
    "specialties": artisan.get("specialties", []),
    "workshopLocation": artisan["workshopLocation"],
    "story": artisan["story"],
    "latitude": artisan.get("latitude"),
    "longitude": artisan.get("longitude"),
    "createdAt": serialize_datetime(artisan.get("createdAt")),
    "updatedAt": serialize_datetime(artisan.get("updatedAt")),
  }


def serialize_order(order: Dict[str, Any]):
  product_value = order.get("product_id")
  if isinstance(product_value, dict):
    product_payload = serialize_product(product_value)
  else:
    product_payload = str(product_value) if product_value else None

  return {
    "_id": str(order["_id"]),
    "buyer_id": str(order["buyer_id"]),
    "product_id": product_payload,
    "quantity": order["quantity"],
    "total_amount": order["total_amount"],
    "status": order.get("status", "pending"),
    "shipping_address": order.get("shipping_address", {}),
    "created_at": serialize_datetime(order.get("created_at")),
  }


def serialize_review(review: Dict[str, Any]):
  reviewer_value = review.get("user_id")
  if isinstance(reviewer_value, dict):
    reviewer_payload = {
      "_id": str(reviewer_value.get("_id")),
      "email": reviewer_value.get("email"),
      "fullName": reviewer_value.get("fullName"),
      "role": reviewer_value.get("role"),
    }
  else:
    reviewer_payload = str(reviewer_value) if reviewer_value else None

  return {
    "_id": str(review["_id"]),
    "product_id": str(review["product_id"]),
    "user_id": reviewer_payload,
    "rating": review["rating"],
    "title": review.get("title"),
    "comment": review.get("comment"),
    "verified_purchase": bool(review.get("verified_purchase", False)),
    "created_at": serialize_datetime(review.get("created_at")),
    "updated_at": serialize_datetime(review.get("updated_at")),
  }


def create_token(user: Dict[str, Any]):
  payload = {
    "id": str(user["_id"]),
    "role": user.get("role", "buyer"),
    "exp": datetime.now(timezone.utc) + timedelta(days=7),
  }
  return jwt.encode(payload, jwt_secret, algorithm="HS256")


def hash_password(password: str):
  try:
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    return f"bcrypt${hashed}"
  except Exception:
    digest = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return f"sha256${digest}"


def verify_password(password: str, stored_password: str):
  if not stored_password:
    return False

  if stored_password.startswith("bcrypt$"):
    try:
      return bcrypt.checkpw(password.encode("utf-8"), stored_password.split("$", 1)[1].encode("utf-8"))
    except Exception:
      return False

  if stored_password.startswith("sha256$"):
    digest = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return digest == stored_password.split("$", 1)[1]

  try:
    return bcrypt.checkpw(password.encode("utf-8"), stored_password.encode("utf-8"))
  except Exception:
    digest = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return digest == stored_password


def require_user(authorization: Optional[str]):
  if not authorization or not authorization.startswith("Bearer "):
    raise HTTPException(status_code=401, detail={"message": "No token"})

  token = authorization.split(" ", 1)[1]
  try:
    return jwt.decode(token, jwt_secret, algorithms=["HS256"])
  except jwt.InvalidTokenError as exc:
    raise HTTPException(status_code=401, detail={"message": "Invalid token"}) from exc


def extract_message(detail: Any):
  if isinstance(detail, dict) and "message" in detail:
    return detail["message"]
  return str(detail)


def get_groq_client():
  if not groq_api_key:
    return None
  try:
    return Groq(api_key=groq_api_key)
  except Exception:
    return None


def fallback_market_trends(context: Dict[str, Any]):
  sorted_categories = sorted(context["categories"].items(), key=lambda item: item[1], reverse=True)
  top_categories = [name for name, _ in sorted_categories[:3]] or ["Handcrafted Goods", "Home Decor", "Giftable Crafts"]
  top_products = []
  for index, product in enumerate(context["products"][:5], start=1):
    top_products.append({
      "name": product.get("title", f"Product {index}"),
      "score": max(50, 100 - (index * 8)),
    })

  if not top_products:
    top_products = [
      {"name": "Signature Craft Collection", "score": 92},
      {"name": "Festive Handmade Set", "score": 84},
      {"name": "Artisan Decor Piece", "score": 76},
    ]

  monthly_trend = []
  base_value = max(1, context["total_orders"])
  month_labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
  for index, label in enumerate(month_labels):
    monthly_trend.append({"label": label, "value": base_value + (index * 2)})

  category_share = [
    {"name": name, "value": count}
    for name, count in (sorted_categories[:5] or [("Handcrafted Goods", max(1, context["total_products"]))])
  ]

  return {
    "summary": (
      f"Marketplace running in {database_mode} mode with {context['total_products']} products, "
      f"{context['total_orders']} orders, and {context['total_artisans']} artisan profiles."
    ),
    "market_signal": "Demand is strongest around unique artisan-made products with clear storytelling and multi-image listings.",
    "trending_categories": top_categories,
    "buyer_opportunities": [
      "Highlight handcrafted gift-ready collections.",
      "Promote products with stronger artisan stories.",
      "Feature categories with repeat buyer demand.",
    ],
    "recommended_actions": [
      "Upload more images for top-performing products.",
      "Keep pricing and stock updated on active listings.",
      "Focus on categories showing the highest marketplace share.",
    ],
    "monthly_trend": monthly_trend,
    "category_share": category_share,
    "trending_products": top_products,
    "snapshot": {
      "total_products": context["total_products"],
      "total_orders": context["total_orders"],
      "total_artisans": context["total_artisans"],
      "total_revenue": context["total_revenue"],
    },
  }


def generate_groq_completion(messages: List[Dict[str, str]], temperature: float = 0.4):
  client = get_groq_client()
  if not client:
    return None

  try:
    completion = client.chat.completions.create(
      model=groq_model,
      messages=messages,
      temperature=temperature,
    )
    return completion.choices[0].message.content
  except Exception:
    return None


def build_market_context():
  all_products = [serialize_product(attach_artisan_user(product)) for product in products.find({})]
  all_orders = [serialize_order(order) for order in orders.find({})]
  all_artisans = [serialize_artisan(attach_artisan_profile_user(artisan)) for artisan in artisans.find({})]

  category_counts = {}
  for product in all_products:
    category = product.get("category") or "Other"
    category_counts[category] = category_counts.get(category, 0) + 1

  total_revenue = sum(float(order.get("total_amount", 0) or 0) for order in all_orders)

  return {
    "total_products": len(all_products),
    "total_orders": len(all_orders),
    "total_artisans": len(all_artisans),
    "total_revenue": total_revenue,
    "categories": category_counts,
    "products": all_products[:20],
    "orders": all_orders[:20],
    "artisans": all_artisans[:20],
  }


def generate_market_trends():
  context = build_market_context()
  prompt = (
    "You are an e-commerce market analyst for a handcrafted artisan marketplace. "
    "Use the provided marketplace data to generate current trend insights. "
    "Return valid JSON with exactly these keys: "
    "summary, market_signal, trending_categories, buyer_opportunities, recommended_actions, "
    "monthly_trend, category_share, trending_products. "
    "summary and market_signal must be strings. "
    "trending_categories, buyer_opportunities, and recommended_actions must be arrays of 3 short strings each. "
    "monthly_trend must be an array of 6 objects with keys label and value. "
    "category_share must be an array of up to 5 objects with keys name and value. "
    "trending_products must be an array of up to 5 objects with keys name and score."
  )
  raw = generate_groq_completion(
    [
      {"role": "system", "content": prompt},
      {"role": "user", "content": json.dumps(context)},
    ],
    temperature=0.3,
  )

  if not raw:
    return fallback_market_trends(context)

  try:
    parsed = json.loads(raw)
  except json.JSONDecodeError:
    return fallback_market_trends(context)

  fallback = fallback_market_trends(context)
  return {
    "summary": parsed.get("summary", fallback["summary"]),
    "market_signal": parsed.get("market_signal", fallback["market_signal"]),
    "trending_categories": parsed.get("trending_categories", fallback["trending_categories"])[:3],
    "buyer_opportunities": parsed.get("buyer_opportunities", fallback["buyer_opportunities"])[:3],
    "recommended_actions": parsed.get("recommended_actions", fallback["recommended_actions"])[:3],
    "monthly_trend": parsed.get("monthly_trend", fallback["monthly_trend"])[:6],
    "category_share": parsed.get("category_share", fallback["category_share"])[:5],
    "trending_products": parsed.get("trending_products", fallback["trending_products"])[:5],
    "snapshot": fallback["snapshot"],
  }


def generate_artisan_recommendations(user_id: str):
  artisan = artisans.find_one({"userId": to_object_id(user_id)})
  context = build_market_context()
  prompt = (
    "You are advising an artisan seller on what to create next for a handcrafted marketplace. "
    "Use the artisan profile and current market data. Return valid JSON with one key: "
    "recommendations, which must be an array of exactly 5 concise recommendation strings."
  )
  raw = generate_groq_completion(
    [
      {"role": "system", "content": prompt},
      {
        "role": "user",
        "content": json.dumps(
          {
            "artisan_profile": serialize_artisan(artisan) if artisan else None,
            "market_context": context,
          }
        ),
      },
    ],
    temperature=0.35,
  )

  if raw:
    try:
      parsed = json.loads(raw)
      recommendations = parsed.get("recommendations", [])
      if recommendations:
        return {"recommendations": recommendations[:5]}
    except json.JSONDecodeError:
      recommendations = [line.strip("- ").strip() for line in raw.splitlines() if line.strip()]
      if recommendations:
        return {"recommendations": recommendations[:5]}

  craft_type = artisan.get("craftType") if artisan else "artisan products"
  top_categories = sorted(context["categories"].items(), key=lambda item: item[1], reverse=True)
  lead_category = top_categories[0][0] if top_categories else "gift-ready crafts"
  return {
    "recommendations": [
      f"Create a premium {craft_type} piece inspired by the demand around {lead_category}.",
      "Bundle smaller handcrafted products into a gift-ready collection.",
      "Use 3 to 5 images that show detail, scale, and craftsmanship process.",
      "Write a stronger artisan story that explains materials and heritage.",
      "Keep one affordable listing and one premium flagship listing live at the same time.",
    ]
  }


def attach_artisan_user(product: Dict[str, Any]):
  artisan_id = to_object_id(product.get("artisan_id"))
  artisan_user = users.find_one({"_id": artisan_id}, {"email": 1})
  hydrated = dict(product)
  hydrated["artisan_id"] = artisan_user or artisan_id
  return hydrated


def attach_artisan_profile_user(artisan: Dict[str, Any]):
  user_id = to_object_id(artisan.get("userId"))
  artisan_user = users.find_one({"_id": user_id}, {"email": 1, "role": 1})
  hydrated = dict(artisan)
  hydrated["userId"] = artisan_user or user_id
  return hydrated


def attach_review_user(review: Dict[str, Any]):
  user_id = to_object_id(review.get("user_id"))
  reviewer = users.find_one({"_id": user_id}, {"email": 1, "fullName": 1, "role": 1})
  hydrated = dict(review)
  hydrated["user_id"] = reviewer or user_id
  return hydrated


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
  return JSONResponse(
    status_code=exc.status_code,
    content={"message": extract_message(exc.detail)},
  )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
  return JSONResponse(
    status_code=500,
    content={"message": str(exc) or "Internal server error"},
  )


@app.get("/api/health")
async def health_check():
  return {
    "status": "ok",
    "database_mode": database_mode,
    "groq_enabled": bool(groq_api_key),
  }


@app.post("/api/auth/register")
async def register(payload: AuthPayload):
  try:
    email = (payload.email or "").strip().lower()
    if not email:
      raise HTTPException(status_code=400, detail={"message": "Email is required"})

    if users.find_one({"email": email}):
      raise HTTPException(status_code=400, detail={"message": "Email already in use"})

    if len(payload.password or "") < 6:
      raise HTTPException(status_code=400, detail={"message": "Password must be at least 6 characters"})

    user = {
      "email": email,
      "password": hash_password(payload.password),
      "role": payload.userType or "buyer",
      "fullName": payload.fullName,
      "created_at": datetime.utcnow(),
    }
    inserted = users.insert_one(user)
    user["_id"] = inserted.inserted_id

    return {"user": serialize_user(user), "token": create_token(user)}
  except HTTPException:
    raise
  except Exception as exc:
    raise HTTPException(status_code=500, detail={"message": f"Registration failed: {exc}"}) from exc


@app.post("/api/auth/login")
async def login(payload: AuthPayload):
  try:
    email = (payload.email or "").strip().lower()
    user = users.find_one({"email": email})
    if not user:
      raise HTTPException(status_code=400, detail={"message": "Invalid credentials"})

    if not verify_password(payload.password, user.get("password", "")):
      raise HTTPException(status_code=400, detail={"message": "Invalid credentials"})

    return {"user": serialize_user(user), "token": create_token(user)}
  except HTTPException:
    raise
  except Exception as exc:
    raise HTTPException(status_code=500, detail={"message": f"Login failed: {exc}"}) from exc


@app.post("/api/ai/chat")
async def chat_with_ai(payload: ChatRequestPayload):
  conversation = [
    {
      "role": "system",
      "content": (
        "You are Ophelia AI, a helpful assistant for a handcrafted artisan marketplace. "
        "Help users discover products, understand artisan onboarding, marketplace features, "
        "and buying or selling on the platform. Keep replies concise, warm, and practical."
      ),
    }
  ]
  conversation.extend([{"role": message.role, "content": message.content} for message in payload.messages[-12:]])
  reply = generate_groq_completion(conversation, temperature=0.5)
  if not reply:
    reply = "I can still help with product discovery, artisan onboarding, and marketplace questions while AI insights are temporarily limited."
  return {"reply": reply}


@app.get("/api/ai/market-trends")
async def get_market_trends():
  return generate_market_trends()


@app.get("/api/ai/recommendations")
async def get_artisan_recommendations(authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  return generate_artisan_recommendations(user["id"])


@app.post("/api/products")
async def create_product(payload: ProductPayload, authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  document = payload.model_dump()
  document["artisan_id"] = to_object_id(user["id"])
  document["created_at"] = datetime.utcnow()
  inserted = products.insert_one(document)
  product = products.find_one({"_id": inserted.inserted_id})
  return serialize_product(product)


@app.get("/api/products")
async def get_products(artisan_id: Optional[str] = None):
  query = {}
  if artisan_id:
    query["artisan_id"] = to_object_id(artisan_id)
  return [serialize_product(attach_artisan_user(product)) for product in products.find(query)]


@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
  object_id = to_object_id(product_id)
  product = products.find_one({"_id": object_id})
  if not product:
    raise HTTPException(status_code=404, detail={"message": "Not found"})
  return serialize_product(attach_artisan_user(product))


@app.get("/api/products/{product_id}/reviews")
async def get_product_reviews(product_id: str):
  object_id = to_object_id(product_id)
  product = products.find_one({"_id": object_id})
  if not product:
    raise HTTPException(status_code=404, detail={"message": "Not found"})

  items = [attach_review_user(review) for review in reviews.find({"product_id": object_id})]
  items.sort(key=lambda review: str(review.get("updated_at") or review.get("created_at") or ""), reverse=True)
  return {
    "reviews": [serialize_review(review) for review in items],
    "summary": serialize_product(attach_artisan_user(product)),
  }


@app.post("/api/products/{product_id}/reviews")
async def save_product_review(
  product_id: str,
  payload: ReviewPayload,
  authorization: Optional[str] = Header(default=None),
):
  user = require_user(authorization)
  product_object_id = to_object_id(product_id)
  user_object_id = to_object_id(user["id"])
  product = products.find_one({"_id": product_object_id})
  if not product:
    raise HTTPException(status_code=404, detail={"message": "Not found"})

  if str(product.get("artisan_id")) == user["id"]:
    raise HTTPException(status_code=400, detail={"message": "You cannot review your own product"})

  has_purchase = bool(
    orders.find_one({
      "buyer_id": user_object_id,
      "product_id": product_object_id,
    })
  )
  if not has_purchase:
    raise HTTPException(status_code=400, detail={"message": "Only buyers who purchased this product can review it"})

  now = datetime.utcnow()
  review_data = {
    "product_id": product_object_id,
    "user_id": user_object_id,
    "rating": payload.rating,
    "title": (payload.title or "").strip() or None,
    "comment": (payload.comment or "").strip() or None,
    "verified_purchase": True,
    "updated_at": now,
  }

  existing = reviews.find_one({"product_id": product_object_id, "user_id": user_object_id})
  if existing:
    reviews.update_one({"_id": existing["_id"]}, {"$set": review_data})
    stored = reviews.find_one({"_id": existing["_id"]})
  else:
    review_data["created_at"] = now
    inserted = reviews.insert_one(review_data)
    stored = reviews.find_one({"_id": inserted.inserted_id})

  return {
    "message": "Review saved successfully",
    "review": serialize_review(attach_review_user(stored)),
    "summary": serialize_product(attach_artisan_user(product)),
  }


@app.put("/api/products/{product_id}")
async def update_product(
  product_id: str,
  payload: Dict[str, Any],
  authorization: Optional[str] = Header(default=None),
):
  user = require_user(authorization)
  object_id = to_object_id(product_id)
  product = products.find_one({"_id": object_id})
  if not product:
    raise HTTPException(status_code=404, detail={"message": "Not found"})
  if str(product["artisan_id"]) != user["id"]:
    raise HTTPException(status_code=403, detail={"message": "Forbidden"})

  payload.pop("artisan_id", None)
  products.update_one({"_id": object_id}, {"$set": payload})
  updated = products.find_one({"_id": object_id})
  return serialize_product(updated)


@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str, authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  object_id = to_object_id(product_id)
  product = products.find_one({"_id": object_id})
  if not product:
    raise HTTPException(status_code=404, detail={"message": "Not found"})
  if str(product["artisan_id"]) != user["id"]:
    raise HTTPException(status_code=403, detail={"message": "Forbidden"})

  products.delete_one({"_id": object_id})
  return {"message": "Deleted"}


@app.post("/api/artisans")
async def save_artisan(payload: ArtisanPayload, authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  user_id = to_object_id(user["id"])
  now = datetime.utcnow()
  artisan_data = payload.model_dump()
  artisan_data["updatedAt"] = now

  existing = artisans.find_one({"userId": user_id})
  if existing:
    artisans.update_one({"_id": existing["_id"]}, {"$set": artisan_data})
    artisan = artisans.find_one({"_id": existing["_id"]})
  else:
    artisan_data["userId"] = user_id
    artisan_data["createdAt"] = now
    inserted = artisans.insert_one(artisan_data)
    artisan = artisans.find_one({"_id": inserted.inserted_id})

  return {
    "message": "Artisan profile saved successfully",
    "artisan": serialize_artisan(artisan),
  }


@app.get("/api/artisans/profile")
async def artisan_profile(authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  user_id = to_object_id(user["id"])
  artisan = artisans.find_one({"userId": user_id})
  if not artisan:
    raise HTTPException(status_code=404, detail={"message": "Artisan profile not found"})
  return serialize_artisan(artisan)


@app.get("/api/artisans")
async def get_artisans(userId: Optional[str] = None):
  query = {}
  if userId:
    query["userId"] = to_object_id(userId)
  return [serialize_artisan(attach_artisan_profile_user(artisan)) for artisan in artisans.find(query)]


@app.post("/api/orders")
async def create_order(payload: OrderPayload, authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  document = payload.model_dump()
  document["buyer_id"] = to_object_id(user["id"])
  document["product_id"] = to_object_id(document.get("product_id"))
  document["created_at"] = datetime.utcnow()
  inserted = orders.insert_one(document)
  order = orders.find_one({"_id": inserted.inserted_id})
  return serialize_order(order)


@app.get("/api/orders")
async def get_orders(authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  buyer_id = to_object_id(user["id"])
  items = []
  for order in orders.find({"buyer_id": buyer_id}):
    hydrated = dict(order)
    hydrated["product_id"] = products.find_one({"_id": to_object_id(order.get("product_id"))})
    if hydrated["product_id"]:
      hydrated["product_id"] = attach_artisan_user(hydrated["product_id"])
    items.append(serialize_order(hydrated))
  return items
