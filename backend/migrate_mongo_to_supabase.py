import os
from datetime import datetime

from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient
from supabase import create_client

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"), override=True)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/Ophelia_AI")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
  raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

client = MongoClient(MONGO_URI)
db = client.get_default_database()
if db is None:
  db_name = MONGO_URI.rsplit("/", 1)[-1] or "Ophelia_AI"
  db = client[db_name]

users_col = db["users"]
artisans_col = db["artisans"]
products_col = db["products"]
orders_col = db["orders"]
reviews_col = db["product_reviews"]


def to_str(value):
  if isinstance(value, ObjectId):
    return str(value)
  return str(value) if value is not None else None


def ensure_user_map():
  user_map = {}
  for user in users_col.find({}):
    email = (user.get("email") or "").strip().lower()
    if not email:
      continue

    existing = supabase.table("users").select("id,email").eq("email", email).execute().data
    if existing:
      user_map[to_str(user.get("_id"))] = existing[0]["id"]
      continue

    payload = {
      "email": email,
      "password_hash": user.get("password") or user.get("password_hash") or "",
      "role": user.get("role", "buyer"),
      "full_name": user.get("fullName") or user.get("full_name"),
      "created_at": (user.get("created_at") or datetime.utcnow()).isoformat(),
    }
    inserted = supabase.table("users").insert(payload).execute().data or []
    if inserted:
      user_map[to_str(user.get("_id"))] = inserted[0]["id"]
  return user_map


def ensure_products(user_map):
  product_map = {}
  for product in products_col.find({}):
    old_id = to_str(product.get("_id"))
    artisan_id = user_map.get(to_str(product.get("artisan_id")))
    payload = {
      "artisan_id": artisan_id,
      "title": product.get("title"),
      "description": product.get("description"),
      "story": product.get("story"),
      "price": float(product.get("price") or 0),
      "category": product.get("category"),
      "materials": product.get("materials") or [],
      "dimensions": product.get("dimensions"),
      "weight": product.get("weight"),
      "images": product.get("images") or [],
      "stock_quantity": int(product.get("stock_quantity") or 0),
      "is_available": bool(product.get("is_available", True)),
      "created_at": (product.get("created_at") or datetime.utcnow()).isoformat(),
    }

    existing = supabase.table("products").select("id").eq("title", payload["title"]).eq("artisan_id", artisan_id).execute().data
    if existing:
      product_map[old_id] = existing[0]["id"]
      continue

    inserted = supabase.table("products").insert(payload).execute().data or []
    if inserted:
      product_map[old_id] = inserted[0]["id"]
  return product_map


def ensure_artisans(user_map):
  for artisan in artisans_col.find({}):
    user_id = user_map.get(to_str(artisan.get("userId")))
    if not user_id:
      continue
    payload = {
      "user_id": user_id,
      "craft_type": artisan.get("craftType"),
      "years_of_experience": int(artisan.get("yearsOfExperience") or 0),
      "specialties": artisan.get("specialties") or [],
      "workshop_location": artisan.get("workshopLocation"),
      "story": artisan.get("story"),
      "latitude": artisan.get("latitude"),
      "longitude": artisan.get("longitude"),
      "created_at": (artisan.get("createdAt") or datetime.utcnow()).isoformat(),
      "updated_at": (artisan.get("updatedAt") or datetime.utcnow()).isoformat(),
    }

    existing = supabase.table("artisans").select("id").eq("user_id", user_id).execute().data
    if existing:
      supabase.table("artisans").update(payload).eq("id", existing[0]["id"]).execute()
    else:
      supabase.table("artisans").insert(payload).execute()


def ensure_orders(user_map, product_map):
  for order in orders_col.find({}):
    buyer_id = user_map.get(to_str(order.get("buyer_id")))
    product_id = product_map.get(to_str(order.get("product_id")))
    if not buyer_id:
      continue

    payload = {
      "buyer_id": buyer_id,
      "product_id": product_id,
      "quantity": int(order.get("quantity") or 1),
      "total_amount": float(order.get("total_amount") or 0),
      "status": order.get("status", "pending"),
      "shipping_address": order.get("shipping_address") or {},
      "created_at": (order.get("created_at") or datetime.utcnow()).isoformat(),
    }

    existing = supabase.table("orders").select("id").eq("buyer_id", buyer_id).eq("product_id", product_id).eq("created_at", payload["created_at"]).execute().data
    if existing:
      continue

    supabase.table("orders").insert(payload).execute()


def ensure_reviews(user_map, product_map):
  for review in reviews_col.find({}):
    user_id = user_map.get(to_str(review.get("user_id")))
    product_id = product_map.get(to_str(review.get("product_id")))
    if not user_id or not product_id:
      continue

    payload = {
      "product_id": product_id,
      "user_id": user_id,
      "rating": int(review.get("rating") or 0),
      "title": review.get("title"),
      "comment": review.get("comment"),
      "verified_purchase": bool(review.get("verified_purchase", False)),
      "created_at": (review.get("created_at") or datetime.utcnow()).isoformat(),
      "updated_at": (review.get("updated_at") or datetime.utcnow()).isoformat(),
    }

    existing = supabase.table("product_reviews").select("id").eq("product_id", product_id).eq("user_id", user_id).execute().data
    if existing:
      continue

    supabase.table("product_reviews").insert(payload).execute()


if __name__ == "__main__":
  user_map = ensure_user_map()
  product_map = ensure_products(user_map)
  ensure_artisans(user_map)
  ensure_orders(user_map, product_map)
  ensure_reviews(user_map, product_map)
  print("Migration complete.")
