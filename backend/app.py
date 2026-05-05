import asyncio
import json
import os
import re
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import bcrypt
import jwt
import resend
import razorpay
import hmac
import hashlib
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from groq import Groq
from pydantic import BaseModel, Field
from supabase import Client, create_client


load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"), override=True)


app = FastAPI(title="Ophelia Backend", version="1.0.0")

frontend_url = os.getenv("FRONTEND_URL", "*")
cors_origins = [frontend_url] if frontend_url != "*" else ["*"]

app.add_middleware(
  CORSMiddleware,
  allow_origins=cors_origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

jwt_secret = os.getenv("JWT_SECRET", "secret")
groq_api_key = os.getenv("GROQ_API_KEY", "")
groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
groq_market_model = os.getenv("GROQ_MARKET_MODEL", "groq/compound")
supabase_url = os.getenv("SUPABASE_URL", "")
supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
supabase_anon_key = os.getenv("SUPABASE_ANON_KEY", "")
resend_api_key = os.getenv("RESEND_API_KEY", "")
admin_secret_key = os.getenv("ADMIN_SECRET_KEY", "secret-admin")

razorpay_key_id = os.getenv("RAZORPAY_KEY_ID", "")
razorpay_key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
if razorpay_key_id and razorpay_key_secret:
    razorpay_client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))
else:
    razorpay_client = None

supabase_client: Optional[Client] = None
if supabase_url and supabase_service_key:
  supabase_client = create_client(supabase_url, supabase_service_key)
else:
  print("Supabase not configured: set SUPABASE_URL and SUPABASE_SERVICE_KEY")

resend.api_key = resend_api_key

login_attempts: Dict[str, List[float]] = {}
LOGIN_WINDOW_SECONDS = 15 * 60
LOGIN_MAX_ATTEMPTS = 5

ART_MARKET_BASELINE = {
  "categories": [
    {"name": "Pottery & Ceramics", "weight": 18},
    {"name": "Textile Weaving", "weight": 16},
    {"name": "Handmade Jewelry", "weight": 15},
    {"name": "Wood Carving", "weight": 12},
    {"name": "Home Decor Crafts", "weight": 14},
    {"name": "Paintings & Folk Art", "weight": 13},
    {"name": "Giftable Handicrafts", "weight": 12},
  ],
  "trending_products": [
    {"name": "Handpainted Ceramic Tableware", "score": 94},
    {"name": "Handwoven Sustainable Home Textiles", "score": 91},
    {"name": "Statement Handmade Jewelry", "score": 88},
    {"name": "Folk Art Wall Decor", "score": 86},
    {"name": "Premium Wooden Decor Pieces", "score": 83},
  ],
  "monthly_trend": [
    {"label": "Jan", "value": 64},
    {"label": "Feb", "value": 69},
    {"label": "Mar", "value": 74},
    {"label": "Apr", "value": 79},
    {"label": "May", "value": 84},
    {"label": "Jun", "value": 89},
  ],
}


database_mode = "supabase"


class AuthPayload(BaseModel):
  email: str
  password: str
  userType: Optional[str] = "buyer"
  fullName: Optional[str] = None


class AdminLoginPayload(BaseModel):
  email: str
  password: str


class AuctionApprovePayload(BaseModel):
  title: str
  description: Optional[str] = None
  story: Optional[str] = None
  starting_bid: float
  scheduled_start: Optional[str] = None
  scheduled_end: Optional[str] = None
  admin_notes: Optional[str] = None


class AuctionRejectPayload(BaseModel):
  reason: str


class AuctionUpdatePayload(BaseModel):
  title: Optional[str] = None
  description: Optional[str] = None
  story: Optional[str] = None
  images: Optional[List[str]] = None
  starting_bid: Optional[float] = None
  current_bid: Optional[float] = None
  current_winner_id: Optional[str] = None
  current_winner_name: Optional[str] = None
  status: Optional[str] = None
  scheduled_start: Optional[str] = None
  scheduled_end: Optional[str] = None
  admin_notes: Optional[str] = None


class AuctionRequestPayload(BaseModel):
  title: str
  description: Optional[str] = None
  story: Optional[str] = None
  images: List[str] = Field(default_factory=list)
  starting_bid: float
  product_id: Optional[str] = None


class AuctionBidPayload(BaseModel):
  amount: float


class AuctionStatusUpdatePayload(BaseModel):
  status: str
  note: Optional[str] = None


class ContactRequestPayload(BaseModel):
  phone: str


class ContactRespondPayload(BaseModel):
  phone: str
  action: str


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

def fetch_users_by_ids(user_ids: List[str]):
  if not user_ids:
    return {}
  response = require_supabase().table("users").select("id,email,role,full_name").in_("id", user_ids).execute()
  rows = response.data or []
  return {row["id"]: row for row in rows}


def fetch_user_by_email(email: str):
  response = require_supabase().table("users").select("id,email,role,full_name,password_hash").eq("email", email).execute()
  rows = response.data or []
  return rows[0] if rows else None


def fetch_user_by_id(user_id: str):
  response = require_supabase().table("users").select("id,email,role,full_name").eq("id", user_id).execute()
  rows = response.data or []
  return rows[0] if rows else None


def fetch_review_summary(product_ids: List[str]):
  if not product_ids:
    return {}
  response = require_supabase().table("product_reviews").select("product_id,rating").in_("product_id", product_ids).execute()
  rows = response.data or []
  summary: Dict[str, Dict[str, Any]] = {}
  for row in rows:
    product_id = row.get("product_id")
    rating = float(row.get("rating") or 0)
    if product_id not in summary:
      summary[product_id] = {"count": 0, "sum": 0.0}
    summary[product_id]["count"] += 1
    summary[product_id]["sum"] += rating
  return summary


def serialize_user(user: Dict[str, Any]):
  return {
    "id": user["id"],
    "email": user.get("email"),
    "role": user.get("role", "buyer"),
    "fullName": user.get("full_name"),
  }


def serialize_product(product: Dict[str, Any], artisan_map: Optional[Dict[str, Dict[str, Any]]] = None, review_summary: Optional[Dict[str, Dict[str, Any]]] = None):
  artisan_value = product.get("artisan_id")
  artisan_payload = None
  if artisan_map and artisan_value in artisan_map:
    artisan_payload = {
      "_id": artisan_map[artisan_value]["id"],
      "email": artisan_map[artisan_value].get("email"),
    }
  elif artisan_value:
    artisan_payload = str(artisan_value)

  summary = (review_summary or {}).get(product.get("id"), {"count": 0, "sum": 0.0})
  review_count = summary.get("count", 0) or 0
  average_rating = round(summary.get("sum", 0.0) / review_count, 1) if review_count else 0

  return {
    "_id": product["id"],
    "artisan_id": artisan_payload,
    "title": product.get("title"),
    "description": product.get("description"),
    "story": product.get("story"),
    "price": product.get("price"),
    "category": product.get("category"),
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


def serialize_artisan(artisan: Dict[str, Any], user_map: Optional[Dict[str, Dict[str, Any]]] = None):
  user_value = artisan.get("user_id")
  user_payload = None
  if user_map and user_value in user_map:
    user_payload = {
      "_id": user_map[user_value]["id"],
      "email": user_map[user_value].get("email"),
      "role": user_map[user_value].get("role"),
    }
  elif user_value:
    user_payload = str(user_value)

  return {
    "_id": artisan.get("id"),
    "userId": user_payload,
    "craftType": artisan.get("craft_type"),
    "yearsOfExperience": artisan.get("years_of_experience", 0),
    "specialties": artisan.get("specialties", []),
    "workshopLocation": artisan.get("workshop_location"),
    "story": artisan.get("story"),
    "latitude": artisan.get("latitude"),
    "longitude": artisan.get("longitude"),
    "createdAt": serialize_datetime(artisan.get("created_at")),
    "updatedAt": serialize_datetime(artisan.get("updated_at")),
  }


def serialize_order(order: Dict[str, Any], product_map: Optional[Dict[str, Dict[str, Any]]] = None):
  product_value = order.get("product_id")
  product_payload = None
  if product_map and product_value in product_map:
    product_payload = serialize_product(product_map[product_value])
  elif product_value:
    product_payload = str(product_value)

  return {
    "_id": order.get("id"),
    "buyer_id": order.get("buyer_id"),
    "product_id": product_payload,
    "quantity": order.get("quantity"),
    "total_amount": order.get("total_amount"),
    "status": order.get("status", "pending"),
    "shipping_address": order.get("shipping_address", {}),
    "created_at": serialize_datetime(order.get("created_at")),
  }


def serialize_review(review: Dict[str, Any], user_map: Optional[Dict[str, Dict[str, Any]]] = None):
  reviewer_value = review.get("user_id")
  reviewer_payload = None
  if user_map and reviewer_value in user_map:
    reviewer_payload = {
      "_id": user_map[reviewer_value]["id"],
      "email": user_map[reviewer_value].get("email"),
      "fullName": user_map[reviewer_value].get("full_name"),
      "role": user_map[reviewer_value].get("role"),
    }
  elif reviewer_value:
    reviewer_payload = str(reviewer_value)

  return {
    "_id": review.get("id"),
    "product_id": review.get("product_id"),
    "user_id": reviewer_payload,
    "rating": review.get("rating"),
    "title": review.get("title"),
    "comment": review.get("comment"),
    "verified_purchase": bool(review.get("verified_purchase", False)),
    "created_at": serialize_datetime(review.get("created_at")),
    "updated_at": serialize_datetime(review.get("updated_at")),
  }


def create_token(user: Dict[str, Any]):
  payload = {
    "id": user.get("id") or user.get("_id"),
    "role": user.get("role", "buyer"),
    "iat": datetime.now(timezone.utc),
    "jti": str(uuid.uuid4()),
    "exp": datetime.now(timezone.utc) + timedelta(days=7),
  }
  return jwt.encode(payload, jwt_secret, algorithm="HS256")


def hash_password(password: str):
  hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")
  return f"bcrypt${hashed}"


def verify_password(password: str, stored_password: str):
  if not stored_password:
    return False

  if stored_password.startswith("bcrypt$"):
    try:
      return bcrypt.checkpw(password.encode("utf-8"), stored_password.split("$", 1)[1].encode("utf-8"))
    except Exception:
      return False

  try:
    return bcrypt.checkpw(password.encode("utf-8"), stored_password.encode("utf-8"))
  except Exception:
    return False


def get_client_ip(request: Request):
  forwarded = request.headers.get("x-forwarded-for")
  if forwarded:
    return forwarded.split(",")[0].strip()
  if request.client:
    return request.client.host
  return "unknown"


def rate_limit_login(ip_address: str):
  now = time.time()
  attempts = [ts for ts in login_attempts.get(ip_address, []) if now - ts < LOGIN_WINDOW_SECONDS]
  login_attempts[ip_address] = attempts
  if len(attempts) >= LOGIN_MAX_ATTEMPTS:
    raise HTTPException(
      status_code=429,
      detail={"message": "Too many login attempts. Try again in 15 minutes."},
    )


def record_login_failure(ip_address: str):
  now = time.time()
  attempts = login_attempts.get(ip_address, [])
  attempts.append(now)
  login_attempts[ip_address] = attempts


def reset_login_attempts(ip_address: str):
  login_attempts.pop(ip_address, None)


def validate_password_policy(password: str):
  failures = []
  if len(password) < 8:
    failures.append("at least 8 characters")
  if not re.search(r"[A-Z]", password or ""):
    failures.append("1 uppercase letter")
  if not re.search(r"\d", password or ""):
    failures.append("1 number")
  if not re.search(r"[!@#$%^&*()_+\-=\[\]{}|;':\",./<>?]", password or ""):
    failures.append("1 special character")
  return failures


def create_admin_token(admin: Dict[str, Any]):
  payload = {
    "id": admin["id"],
    "email": admin.get("email"),
    "iat": datetime.now(timezone.utc),
    "jti": str(uuid.uuid4()),
    "exp": datetime.now(timezone.utc) + timedelta(days=7),
  }
  return jwt.encode(payload, admin_secret_key, algorithm="HS256")


def require_admin(authorization: Optional[str]):
  if not authorization or not authorization.startswith("Bearer "):
    raise HTTPException(status_code=401, detail={"message": "No admin token"})

  token = authorization.split(" ", 1)[1]
  try:
    return jwt.decode(token, admin_secret_key, algorithms=["HS256"])
  except jwt.InvalidTokenError as exc:
    raise HTTPException(status_code=401, detail={"message": "Invalid admin token"}) from exc


def send_auction_email(to: List[str], subject: str, html: str):
  if not resend_api_key or not to:
    return
  try:
    resend.Emails.send({
      "from": "Ophelia AI <onboarding@resend.dev>",
      "to": to,
      "subject": subject,
      "html": html,
    })
  except Exception as exc:
    print(f"Email send failed: {exc}")


def require_supabase():
  if supabase_client is None:
    raise HTTPException(status_code=500, detail={"message": "Supabase not configured"})
  return supabase_client


async def auction_scheduler():
  while True:
    await asyncio.sleep(30)
    if supabase_client is None:
      continue
    now = datetime.now(timezone.utc).isoformat()
    try:
      supabase_client.table("auction_items").update({
        "status": "live",
        "actual_start": now,
        "updated_at": now,
      }).eq("status", "scheduled").lte("scheduled_start", now).execute()

      supabase_client.table("auction_items").update({
        "status": "ended",
        "actual_end": now,
        "updated_at": now,
      }).eq("status", "live").lte("scheduled_end", now).execute()
    except Exception as exc:
      print(f"Auction scheduler error: {exc}")


@app.on_event("startup")
async def start_scheduler():
  asyncio.create_task(auction_scheduler())


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


def fallback_market_trends():
  baseline_categories = {
    entry["name"]: entry["weight"] for entry in ART_MARKET_BASELINE["categories"]
  }
  sorted_categories = sorted(baseline_categories.items(), key=lambda item: item[1], reverse=True)
  top_categories = [name for name, _ in sorted_categories[:3]]

  top_products = [dict(item) for item in ART_MARKET_BASELINE["trending_products"]]

  monthly_trend = [dict(item) for item in ART_MARKET_BASELINE["monthly_trend"]]

  category_share = [{"name": name, "value": value} for name, value in sorted_categories[:5]]

  return {
    "summary": (
      "The broader handmade and artisan art market is showing strong buyer demand in decor, ceramics, "
      "wearable crafts, giftable handmade pieces, and culturally rooted art products."
    ),
    "market_signal": (
      "Across the wider art and handicraft market, buyers are responding to culturally rooted products, "
      "functional home pieces, premium gifting items, and listings with strong craftsmanship storytelling."
    ),
    "trending_categories": top_categories,
    "buyer_opportunities": [
      "Position collections around home decor, festive gifting, and everyday premium-use products.",
      "Showcase heritage, making process, and material authenticity to improve trust and conversions.",
      "Bundle related handmade products into themed sets buyers can discover quickly.",
    ],
    "recommended_actions": [
      "Expand into categories with broad market pull rather than relying on a single artisan style.",
      "Upload multiple lifestyle and close-up images for every product you want to push.",
      "Track which categories attract repeat attention and keep those collections refreshed.",
    ],
    "monthly_trend": monthly_trend,
    "category_share": category_share,
    "trending_products": top_products,
    "snapshot": {
      "source": "fallback_art_market_baseline",
    },
  }


def generate_groq_completion(
  messages: List[Dict[str, str]],
  temperature: float = 0.4,
  model: Optional[str] = None,
):
  client = get_groq_client()
  if not client:
    return None

  try:
    completion = client.chat.completions.create(
      model=model or groq_model,
      messages=messages,
      temperature=temperature,
    )
    return completion.choices[0].message.content
  except Exception:
    return None


def get_cached_or_fetch(cache_key: str, prompt: str, temperature: float = 0.4, model: Optional[str] = None):
  client = require_supabase()
  # 1. Query Supabase cache
  response = client.table("groq_cache").select("response").eq("cache_key", cache_key).gte("created_at", (datetime.utcnow() - timedelta(hours=1)).isoformat()).execute()
  if response.data and len(response.data) > 0:
    return response.data[0]["response"]
      
  # 2. Cache miss, call Groq API
  try:
    messages = json.loads(prompt)
  except Exception:
    messages = [{"role": "user", "content": prompt}]
      
  fresh_response = generate_groq_completion(messages, temperature=temperature, model=model)
  if not fresh_response:
    return None
      
  # 3. Upsert into cache
  upsert_data = {
    "cache_key": cache_key,
    "response": fresh_response,
    "created_at": datetime.utcnow().isoformat()
  }
  client.table("groq_cache").upsert(upsert_data, on_conflict="cache_key").execute()
  
  return fresh_response


def extract_json_payload(raw: str):
  if not raw:
    return None

  text = raw.strip()
  try:
    return json.loads(text)
  except Exception:
    pass

  fenced_match = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL | re.IGNORECASE)
  if fenced_match:
    try:
      return json.loads(fenced_match.group(1))
    except Exception:
      pass

  object_match = re.search(r"(\{[\s\S]*\})", text)
  if object_match:
    try:
      return json.loads(object_match.group(1))
    except Exception:
      return None

  return None


def build_market_context():
  client = require_supabase()
  product_rows = client.table("products").select("*").execute().data or []
  order_rows = client.table("orders").select("*").execute().data or []
  artisan_rows = client.table("artisans").select("*").execute().data or []

  artisan_user_ids = [row.get("user_id") for row in artisan_rows if row.get("user_id")]
  artisan_user_map = fetch_users_by_ids(artisan_user_ids)
  review_summary = fetch_review_summary([row.get("id") for row in product_rows if row.get("id")])

  product_map = {row.get("id"): row for row in product_rows if row.get("id")}

  all_products = [serialize_product(row, artisan_map=artisan_user_map, review_summary=review_summary) for row in product_rows]
  all_orders = [serialize_order(row, product_map=product_map) for row in order_rows]
  all_artisans = [serialize_artisan(row, user_map=artisan_user_map) for row in artisan_rows]

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
  live_market_prompt = (
    "You are a real-time market analyst for the global handcrafted art and artisan goods market. "
    "Use current web information and live online market signals. "
    "Do not analyze a local app catalog or one seller. "
    "Focus on broader market movement across ceramics, textiles, jewelry, paintings, folk art, decor, gifting, and premium handmade products. "
    "Give a concise current market analysis with the strongest categories, buyer demand signals, likely top-trending product types, and a simple 6-point momentum view."
  )
  messages = [
      {"role": "system", "content": live_market_prompt},
      {
        "role": "user",
        "content": json.dumps(
          {
            "request": "Generate current real-world artisan and handmade art market trends for dashboards and charts.",
            "market_baseline": ART_MARKET_BASELINE,
          }
        ),
      },
    ]
  prompt_str = json.dumps(messages)
  cache_key = hashlib.md5(prompt_str.encode()).hexdigest()
  raw_market_report = get_cached_or_fetch(
    cache_key=cache_key,
    prompt=prompt_str,
    temperature=0.3,
    model=groq_market_model,
  )

  if not raw_market_report:
    return fallback_market_trends()

  normalization_prompt = (
    "Convert the supplied market analysis into valid JSON only. "
    "Return exactly these keys: summary, market_signal, trending_categories, buyer_opportunities, "
    "recommended_actions, monthly_trend, category_share, trending_products. "
    "Rules: summary and market_signal are strings. "
    "trending_categories, buyer_opportunities, recommended_actions are arrays of exactly 3 strings. "
    "monthly_trend is an array of exactly 6 objects with keys label and value. "
    "category_share is an array of up to 5 objects with keys name and value. "
    "trending_products is an array of up to 5 objects with keys name and score. "
    "Do not include markdown, explanation, or code fences."
  )
  norm_messages = [
      {"role": "system", "content": normalization_prompt},
      {"role": "user", "content": raw_market_report},
    ]
  norm_prompt_str = json.dumps(norm_messages)
  norm_cache_key = hashlib.md5(norm_prompt_str.encode()).hexdigest()
  normalized = get_cached_or_fetch(
    cache_key=norm_cache_key,
    prompt=norm_prompt_str,
    temperature=0.1,
  )

  parsed = extract_json_payload(normalized or "")
  if not parsed:
    parsed = extract_json_payload(raw_market_report)
  if not parsed:
    return fallback_market_trends()

  chart_prompt = (
    "Using only the supplied live market analysis, return valid JSON only with exactly these keys: "
    "monthly_trend, category_share, trending_products. "
    "monthly_trend must contain 6 objects with keys label and value representing current 6-point market momentum. "
    "category_share must contain up to 5 objects with keys name and value representing current market category strength. "
    "trending_products must contain up to 5 objects with keys name and score representing current real-world trending handmade product types. "
    "Do not include markdown or explanations."
  )
  chart_messages = [
      {"role": "system", "content": chart_prompt},
      {"role": "user", "content": raw_market_report},
    ]
  chart_prompt_str = json.dumps(chart_messages)
  chart_cache_key = hashlib.md5(chart_prompt_str.encode()).hexdigest()
  chart_raw = get_cached_or_fetch(
    cache_key=chart_cache_key,
    prompt=chart_prompt_str,
    temperature=0.15,
  )
  chart_data = extract_json_payload(chart_raw or "") or {}

  fallback = fallback_market_trends()
  return {
    "summary": parsed.get("summary", fallback["summary"]),
    "market_signal": parsed.get("market_signal", fallback["market_signal"]),
    "trending_categories": parsed.get("trending_categories", fallback["trending_categories"])[:3],
    "buyer_opportunities": parsed.get("buyer_opportunities", fallback["buyer_opportunities"])[:3],
    "recommended_actions": parsed.get("recommended_actions", fallback["recommended_actions"])[:3],
    "monthly_trend": chart_data.get("monthly_trend", parsed.get("monthly_trend", fallback["monthly_trend"]))[:6],
    "category_share": chart_data.get("category_share", parsed.get("category_share", fallback["category_share"]))[:5],
    "trending_products": chart_data.get("trending_products", parsed.get("trending_products", fallback["trending_products"]))[:5],
    "snapshot": {"source": "groq_live_market_analysis"},
  }


def generate_artisan_recommendations(user_id: str):
  artisan_rows = require_supabase().table("artisans").select("*").eq("user_id", user_id).execute().data or []
  artisan = artisan_rows[0] if artisan_rows else None
  context = build_market_context()
  prompt = (
    "You are advising an artisan seller on what to create next for a handcrafted marketplace. "
    "Use the artisan profile and current market data. Return valid JSON with one key: "
    "recommendations, which must be an array of exactly 5 concise recommendation strings."
  )
  messages = [
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
    ]
  prompt_str = json.dumps(messages)
  cache_key = hashlib.md5(prompt_str.encode()).hexdigest()
  raw = get_cached_or_fetch(
    cache_key=cache_key,
    prompt=prompt_str,
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

  craft_type = artisan.get("craft_type") if artisan else "artisan products"
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



@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
  message = extract_message(exc.detail)
  return JSONResponse(
    status_code=exc.status_code,
    content={"error": message, "message": message},
  )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
  message = str(exc) or "Internal server error"
  return JSONResponse(
    status_code=500,
    content={"error": message, "message": message},
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

    if fetch_user_by_email(email):
      raise HTTPException(status_code=400, detail={"message": "Email already in use"})

    policy_failures = validate_password_policy(payload.password or "")
    if policy_failures:
      raise HTTPException(
        status_code=400,
        detail={"message": "Password must include: " + ", ".join(policy_failures)},
      )

    user_payload = {
      "email": email,
      "password_hash": hash_password(payload.password),
      "role": payload.userType or "buyer",
      "full_name": payload.fullName,
    }
    response = require_supabase().table("users").insert(user_payload).execute()
    user = (response.data or [None])[0]
    if not user:
      raise HTTPException(status_code=500, detail={"message": "Registration failed"})

    return {"user": serialize_user(user), "token": create_token(user)}
  except HTTPException:
    raise
  except Exception as exc:
    raise HTTPException(status_code=500, detail={"message": f"Registration failed: {exc}"}) from exc


@app.post("/api/auth/login")
async def login(payload: AuthPayload, request: Request):
  try:
    client_ip = get_client_ip(request)
    rate_limit_login(client_ip)

    email = (payload.email or "").strip().lower()
    user = fetch_user_by_email(email)
    if user and verify_password(payload.password, user.get("password_hash", "")):
      reset_login_attempts(client_ip)
      return {"user": serialize_user(user), "token": create_token(user)}

    admin_row = None
    if supabase_client:
      response = supabase_client.table("admin_users").select("id,email,full_name,password_hash").eq("email", email).execute()
      rows = response.data or []
      if rows:
        admin_row = rows[0]

    if admin_row and bcrypt.checkpw(payload.password.encode("utf-8"), admin_row["password_hash"].encode("utf-8")):
      reset_login_attempts(client_ip)
      token = create_admin_token(admin_row)
      return {
        "admin_login": True,
        "admin_token": token,
        "admin": {"id": admin_row["id"], "email": admin_row["email"], "full_name": admin_row.get("full_name")},
      }

    record_login_failure(client_ip)
    raise HTTPException(status_code=400, detail={"message": "Invalid credentials"})
  except HTTPException:
    raise
  except Exception as exc:
    raise HTTPException(status_code=500, detail={"message": f"Login failed: {exc}"}) from exc


@app.post("/api/admin/login")
async def admin_login(payload: AdminLoginPayload):
  client = require_supabase()
  email = (payload.email or "").strip().lower()
  if not email:
    raise HTTPException(status_code=400, detail={"message": "Email is required"})

  response = client.table("admin_users").select("id,email,full_name,password_hash").eq("email", email).execute()
  admin_rows = response.data or []
  if not admin_rows:
    raise HTTPException(status_code=400, detail={"message": "Invalid credentials"})

  admin = admin_rows[0]
  if not bcrypt.checkpw(payload.password.encode("utf-8"), admin["password_hash"].encode("utf-8")):
    raise HTTPException(status_code=400, detail={"message": "Invalid credentials"})

  token = create_admin_token(admin)
  return {
    "admin_token": token,
    "admin": {"id": admin["id"], "email": admin["email"], "full_name": admin["full_name"]},
  }


@app.get("/api/admin/me")
async def admin_me(authorization: Optional[str] = Header(default=None)):
  admin = require_admin(authorization)
  return {"id": admin.get("id"), "email": admin.get("email")}


@app.get("/api/admin/auction-requests")
async def get_auction_requests(authorization: Optional[str] = Header(default=None)):
  require_admin(authorization)
  client = require_supabase()
  response = client.table("auction_items").select("*").eq("status", "pending_review").order("created_at", desc=True).execute()
  return response.data or []


@app.get("/api/admin/auctions")
async def get_admin_auctions(authorization: Optional[str] = Header(default=None)):
  require_admin(authorization)
  client = require_supabase()
  response = client.table("auction_items").select("*").order("created_at", desc=True).execute()
  items = response.data or []
  
  # Fetch all relevant users for contact info
  user_ids = set()
  for item in items:
    if item.get("artisan_id"):
      user_ids.add(item["artisan_id"])
    if item.get("current_winner_id"):
      user_ids.add(item["current_winner_id"])
      
  user_map = fetch_users_by_ids(list(user_ids)) if user_ids else {}
  
  for item in items:
    if item.get("status") == "ended":
      artisan = user_map.get(item.get("artisan_id"))
      if artisan:
        item["artisan_email"] = artisan.get("email")
      winner = user_map.get(item.get("current_winner_id"))
      if winner:
        item["winner_email"] = winner.get("email")
        
  return items


@app.post("/api/admin/auctions/{auction_id}/approve")
async def approve_auction(
  auction_id: str,
  payload: AuctionApprovePayload,
  authorization: Optional[str] = Header(default=None),
):
  require_admin(authorization)
  client = require_supabase()
  now = datetime.now(timezone.utc).isoformat()
  update = {
    "title": payload.title,
    "description": payload.description,
    "story": payload.story,
    "starting_bid": payload.starting_bid,
    "scheduled_start": payload.scheduled_start,
    "scheduled_end": payload.scheduled_end,
    "admin_notes": payload.admin_notes,
    "status": "scheduled",
    "current_bid": payload.starting_bid,
    "updated_at": now,
  }
  response = client.table("auction_items").update(update).eq("id", auction_id).execute()
  item = (response.data or [None])[0]

  user_rows = client.table("users").select("email").execute().data or []
  user_emails = [row.get("email") for row in user_rows if row.get("email")]
  if item:
    send_auction_email(
      user_emails,
      f"New Auction: {item.get('title')} starts {payload.scheduled_start}",
      f"<p>A new auction has been scheduled.</p><p><strong>{item.get('title')}</strong></p>",
    )

  return item or {}


@app.post("/api/admin/auctions/{auction_id}/reject")
async def reject_auction(
  auction_id: str,
  payload: AuctionRejectPayload,
  authorization: Optional[str] = Header(default=None),
):
  require_admin(authorization)
  client = require_supabase()
  now = datetime.now(timezone.utc).isoformat()
  response = client.table("auction_items").update({
    "status": "rejected",
    "admin_notes": payload.reason,
    "updated_at": now,
  }).eq("id", auction_id).execute()

  item = (response.data or [None])[0]
  if item:
    artisan = fetch_user_by_id(item.get("artisan_id")) if item.get("artisan_id") else None
    artisan_email = artisan.get("email") if artisan else None
    if artisan_email:
      send_auction_email(
        [artisan_email],
        f"Update on your auction request for {item.get('title')}",
        f"<p>Your auction request was rejected.</p><p>Reason: {payload.reason}</p>",
      )

  return item or {}


@app.put("/api/admin/auctions/{auction_id}")
async def update_auction(
  auction_id: str,
  payload: AuctionUpdatePayload,
  authorization: Optional[str] = Header(default=None),
):
  require_admin(authorization)
  client = require_supabase()
  update = {k: v for k, v in payload.model_dump().items() if v is not None}
  update["updated_at"] = datetime.now(timezone.utc).isoformat()
  response = client.table("auction_items").update(update).eq("id", auction_id).execute()
  return (response.data or [{}])[0]


@app.post("/api/admin/auctions/{auction_id}/go-live")
async def go_live_auction(auction_id: str, authorization: Optional[str] = Header(default=None)):
  require_admin(authorization)
  client = require_supabase()
  now = datetime.now(timezone.utc).isoformat()
  response = client.table("auction_items").update({
    "status": "live",
    "actual_start": now,
    "updated_at": now,
  }).eq("id", auction_id).execute()

  registrations = client.table("auction_registrations").select("user_email").eq("auction_id", auction_id).execute().data or []
  send_auction_email(
    [row["user_email"] for row in registrations if row.get("user_email")],
    "LIVE NOW: Auction has started!",
    "<p>The auction you registered for is now live.</p>",
  )

  return (response.data or [{}])[0]


@app.post("/api/admin/auctions/{auction_id}/end")
async def end_auction(auction_id: str, authorization: Optional[str] = Header(default=None)):
  require_admin(authorization)
  client = require_supabase()
  now = datetime.now(timezone.utc).isoformat()
  response = client.table("auction_items").update({
    "status": "ended",
    "actual_end": now,
    "updated_at": now,
  }).eq("id", auction_id).execute()
  item = (response.data or [None])[0]

  if item:
    registrations = client.table("auction_registrations").select("user_email,user_id").eq("auction_id", auction_id).execute().data or []
    winner_id = item.get("current_winner_id")
    winner_email = None
    other_emails = []
    for row in registrations:
      if row.get("user_id") == winner_id:
        winner_email = row.get("user_email")
      elif row.get("user_email"):
        other_emails.append(row.get("user_email"))

    if winner_email:
      send_auction_email([winner_email], f"You won the auction for {item.get('title')}!", "<p>Congratulations! You won the auction.</p>")
    if other_emails:
      send_auction_email(other_emails, f"Auction ended: {item.get('title')}", "<p>The auction has ended. Thank you for participating.</p>")

    # Auto-create auction_orders row for the winner
    if winner_id:
      try:
        client.table("auction_orders").insert({
          "auction_id": auction_id,
          "artisan_id": item.get("artisan_id", ""),
          "winner_id": winner_id,
          "status": "won",
          "created_at": now,
          "updated_at": now,
        }).execute()
      except Exception as e:
        print(f"Failed to create auction_order: {e}")

  return item or {}


@app.post("/api/artisans/bid-requests")
async def submit_bid_request(payload: AuctionRequestPayload, authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  if user.get("role") != "artisan":
    raise HTTPException(status_code=403, detail={"message": "Only artisans can submit auction requests"})

  client = require_supabase()
  now = datetime.now(timezone.utc).isoformat()
  response = client.table("auction_items").insert({
    "product_id": payload.product_id or "",
    "artisan_id": user.get("id"),
    "title": payload.title,
    "description": payload.description,
    "story": payload.story,
    "images": payload.images,
    "starting_bid": payload.starting_bid,
    "status": "pending_review",
    "created_at": now,
    "updated_at": now,
  }).execute()
  return (response.data or [{}])[0]


@app.get("/api/artisans/bid-requests")
async def get_bid_requests(authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  if user.get("role") != "artisan":
    raise HTTPException(status_code=403, detail={"message": "Only artisans can view auction requests"})

  client = require_supabase()
  response = client.table("auction_items").select("*").eq("artisan_id", user.get("id")).order("created_at", desc=True).execute()
  items = response.data or []
  
  user_ids = set()
  for item in items:
    if item.get("current_winner_id"):
      user_ids.add(item["current_winner_id"])
      
  user_map = fetch_users_by_ids(list(user_ids)) if user_ids else {}
  
  for item in items:
    if item.get("status") == "ended":
      winner = user_map.get(item.get("current_winner_id"))
      if winner:
        item["winner_email"] = winner.get("email")

  return items


@app.get("/api/auctions")
async def get_public_auctions():
  client = require_supabase()
  response = client.table("auction_items").select("*").in_("status", ["scheduled", "live", "ended"]).order("scheduled_start", desc=False).execute()
  return response.data or []


# IMPORTANT: /api/auctions/won MUST be defined BEFORE /api/auctions/{auction_id}
# otherwise FastAPI matches "won" as an auction_id path parameter
@app.get("/api/auctions/won")
async def get_won_auctions(authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  client = require_supabase()
  response = client.table("auction_items").select("*").eq("current_winner_id", user.get("id")).eq("status", "ended").order("actual_end", desc=True).execute()
  
  items = response.data or []
  for item in items:
    artisan_db = fetch_user_by_id(item.get("artisan_id")) if item.get("artisan_id") else None
    if artisan_db:
      item["artisan_email"] = artisan_db.get("email")
      
  return items


@app.get("/api/auctions/{auction_id}")
async def get_auction_detail(auction_id: str, authorization: Optional[str] = Header(default=None)):
  client = require_supabase()
  auction = client.table("auction_items").select("*").eq("id", auction_id).execute().data
  bids = client.table("auction_bids").select("*").eq("auction_id", auction_id).order("placed_at", desc=True).execute().data
  registrations = client.table("auction_registrations").select("id").eq("auction_id", auction_id).execute().data
  if not auction:
    raise HTTPException(status_code=404, detail={"message": "Auction not found"})
  item = auction[0]

  winner_email = None
  artisan_email = None
  if item.get("status") == "ended" and authorization:
    try:
      # Try as normal user
      user = None
      try:
        user = require_user(authorization)
      except Exception:
        pass
      
      # Try as admin
      is_admin = False
      try:
        require_admin(authorization)
        is_admin = True
      except Exception:
        pass

      user_id = user.get("id") if user else None
      
      if is_admin or user_id == item.get("artisan_id"):
        if item.get("current_winner_id"):
          winner_db = fetch_user_by_id(item.get("current_winner_id"))
          if winner_db:
            winner_email = winner_db.get("email")
      
      if is_admin or user_id == item.get("current_winner_id"):
        if item.get("artisan_id"):
          artisan_db = fetch_user_by_id(item.get("artisan_id"))
          if artisan_db:
            artisan_email = artisan_db.get("email")
    except Exception:
      pass

  if winner_email:
    item["winner_email"] = winner_email
  if artisan_email:
    item["artisan_email"] = artisan_email

  return {
    "auction": item,
    "bids": bids or [],
    "registration_count": len(registrations or []),
    "accepts_registration": item.get("status") == "scheduled",
  }


@app.post("/api/auctions/{auction_id}/register")
async def register_for_auction(auction_id: str, authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  client = require_supabase()

  # Only allow registration when auction is in 'scheduled' status
  auction_data = client.table("auction_items").select("status").eq("id", auction_id).execute().data
  if not auction_data:
    raise HTTPException(status_code=404, detail={"message": "Auction not found"})
  if auction_data[0].get("status") != "scheduled":
    raise HTTPException(status_code=400, detail={"message": "Registration is only open during the scheduled phase"})

  existing = client.table("auction_registrations").select("*").eq("auction_id", auction_id).eq("user_id", user.get("id")).execute().data
  if existing:
    return existing[0]

  # Look up user details from DB
  db_user = fetch_user_by_id(user.get("id"))
  user_name = (db_user.get("full_name") if db_user else None) or user.get("email", "Buyer")
  user_email = (db_user.get("email") if db_user else None) or user.get("email", "")

  response = client.table("auction_registrations").insert({
    "auction_id": auction_id,
    "user_id": user.get("id"),
    "user_name": user_name,
    "user_email": user_email,
  }).execute()
  return (response.data or [{}])[0]


@app.get("/api/auctions/{auction_id}/registrations/me")
async def registration_status(auction_id: str, authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  client = require_supabase()
  existing = client.table("auction_registrations").select("id").eq("auction_id", auction_id).eq("user_id", user.get("id")).execute().data
  return {"registered": bool(existing)}


@app.post("/api/auctions/{auction_id}/bid")
async def place_bid(
  auction_id: str,
  payload: AuctionBidPayload,
  authorization: Optional[str] = Header(default=None),
):
  user = require_user(authorization)
  client = require_supabase()

  auction_data = client.table("auction_items").select("*").eq("id", auction_id).execute().data
  if not auction_data:
    raise HTTPException(status_code=404, detail={"message": "Auction not found"})

  auction = auction_data[0]
  if auction.get("status") != "live":
    raise HTTPException(status_code=400, detail={"message": "Auction is not live"})

  if auction.get("artisan_id") == user.get("id"):
    raise HTTPException(status_code=403, detail={"message": "Artisans cannot bid on their own auctions"})

  registration = client.table("auction_registrations").select("id").eq("auction_id", auction_id).eq("user_id", user.get("id")).execute().data
  if not registration:
    raise HTTPException(status_code=403, detail={"message": "You must register before bidding"})

  current_bid = auction.get("current_bid") or auction.get("starting_bid") or 0
  if payload.amount <= float(current_bid):
    raise HTTPException(status_code=400, detail={"message": "Bid must be higher than current bid"})

  # Look up full user info from DB for proper bidder name
  db_user = fetch_user_by_id(user.get("id"))
  bidder_name = (db_user.get("full_name") if db_user else None) or (db_user.get("email") if db_user else None) or "Bidder"

  client.table("auction_bids").insert({
    "auction_id": auction_id,
    "bidder_id": user.get("id"),
    "bidder_name": bidder_name,
    "amount": payload.amount,
  }).execute()

  client.table("auction_items").update({
    "current_bid": payload.amount,
    "current_winner_id": user.get("id"),
    "current_winner_name": bidder_name,
    "updated_at": datetime.now(timezone.utc).isoformat(),
  }).eq("id", auction_id).execute()

  return {"success": True, "new_amount": payload.amount, "bidder_name": bidder_name}


@app.get("/api/auctions/{auction_id}/bids")
async def get_bids(auction_id: str):
  client = require_supabase()
  bids = client.table("auction_bids").select("*").eq("auction_id", auction_id).order("placed_at", desc=True).execute().data
  return bids or []


@app.get("/api/admin/auctions/{auction_id}/registrations")
async def get_auction_registrations(auction_id: str, authorization: Optional[str] = Header(default=None)):
  require_admin(authorization)
  client = require_supabase()
  registrations = client.table("auction_registrations").select("*").eq("auction_id", auction_id).order("registered_at", desc=True).execute().data
  return registrations or []


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


@app.post("/api/products/upload-images")
async def upload_product_images(
    files: List[UploadFile] = File(...),
    authorization: Optional[str] = Header(default=None)
):
    user = require_user(authorization)
    if user.get("role") != "artisan":
        raise HTTPException(status_code=403, detail={"message": "Only artisans can upload product images"})
        
    client = require_supabase()
    
    if len(files) > 8:
        raise HTTPException(status_code=400, detail={"message": "Maximum 8 files allowed"})
        
    uploaded_urls = []
    
    for file in files:
        if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
            raise HTTPException(status_code=400, detail={"message": "Only JPEG, PNG, and WEBP formats are allowed"})
            
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        
        if size > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail={"message": "File size must be under 5MB"})
            
        file_bytes = file.file.read()
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        file_path = f"{user['id']}/{uuid.uuid4()}.{file_ext}"
        
        try:
            client.storage.from_("product-images").upload(
                file_path, 
                file_bytes, 
                file_options={"content-type": file.content_type}
            )
            public_url = client.storage.from_("product-images").get_public_url(file_path)
            uploaded_urls.append(public_url)
        except Exception as e:
            print("Upload failed:", e)
            raise HTTPException(status_code=500, detail={"message": "Failed to upload image"})
            
    return {"image_urls": uploaded_urls}


@app.post("/api/products")
async def create_product(payload: ProductPayload, authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  client = require_supabase()
  document = payload.model_dump()
  document["artisan_id"] = user["id"]
  document["created_at"] = datetime.utcnow().isoformat()
  response = client.table("products").insert(document).execute()
  product = (response.data or [None])[0]
  if not product:
    raise HTTPException(status_code=500, detail={"message": "Failed to create product"})
  return serialize_product(product)


@app.get("/api/products")
async def get_products(artisan_id: Optional[str] = None):
  client = require_supabase()
  query = client.table("products").select("*")
  if artisan_id:
    query = query.eq("artisan_id", artisan_id)
  product_rows = query.execute().data or []
  artisan_ids = [row.get("artisan_id") for row in product_rows if row.get("artisan_id")]
  artisan_map = fetch_users_by_ids(artisan_ids)
  review_summary = fetch_review_summary([row.get("id") for row in product_rows if row.get("id")])
  return [serialize_product(row, artisan_map=artisan_map, review_summary=review_summary) for row in product_rows]


@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
  client = require_supabase()
  product_rows = client.table("products").select("*").eq("id", product_id).execute().data or []
  if not product_rows:
    raise HTTPException(status_code=404, detail={"message": "Not found"})
  product = product_rows[0]
  artisan_map = fetch_users_by_ids([product.get("artisan_id")])
  review_summary = fetch_review_summary([product.get("id")])
  return serialize_product(product, artisan_map=artisan_map, review_summary=review_summary)


@app.get("/api/products/{product_id}/reviews")
async def get_product_reviews(product_id: str):
  client = require_supabase()
  product_rows = client.table("products").select("*").eq("id", product_id).execute().data or []
  if not product_rows:
    raise HTTPException(status_code=404, detail={"message": "Not found"})

  review_rows = client.table("product_reviews").select("*").eq("product_id", product_id).execute().data or []
  review_rows.sort(key=lambda review: str(review.get("updated_at") or review.get("created_at") or ""), reverse=True)
  reviewer_ids = [row.get("user_id") for row in review_rows if row.get("user_id")]
  reviewer_map = fetch_users_by_ids(reviewer_ids)

  artisan_map = fetch_users_by_ids([product_rows[0].get("artisan_id")])
  review_summary = fetch_review_summary([product_id])
  return {
    "reviews": [serialize_review(review, user_map=reviewer_map) for review in review_rows],
    "summary": serialize_product(product_rows[0], artisan_map=artisan_map, review_summary=review_summary),
  }


@app.post("/api/products/{product_id}/reviews")
async def save_product_review(
  product_id: str,
  payload: ReviewPayload,
  authorization: Optional[str] = Header(default=None),
):
  user = require_user(authorization)
  client = require_supabase()
  product_rows = client.table("products").select("*").eq("id", product_id).execute().data or []
  if not product_rows:
    raise HTTPException(status_code=404, detail={"message": "Not found"})

  product = product_rows[0]
  if product.get("artisan_id") == user["id"]:
    raise HTTPException(status_code=400, detail={"message": "You cannot review your own product"})

  has_purchase = client.table("orders").select("id").eq("buyer_id", user["id"]).eq("product_id", product_id).execute().data
  if not has_purchase:
    raise HTTPException(status_code=400, detail={"message": "Only buyers who purchased this product can review it"})

  now = datetime.utcnow().isoformat()
  review_payload = {
    "product_id": product_id,
    "user_id": user["id"],
    "rating": payload.rating,
    "title": (payload.title or "").strip() or None,
    "comment": (payload.comment or "").strip() or None,
    "verified_purchase": True,
    "updated_at": now,
  }

  existing = client.table("product_reviews").select("id").eq("product_id", product_id).eq("user_id", user["id"]).execute().data
  if existing:
    response = client.table("product_reviews").update(review_payload).eq("id", existing[0]["id"]).execute()
    stored = (response.data or [None])[0]
  else:
    review_payload["created_at"] = now
    response = client.table("product_reviews").insert(review_payload).execute()
    stored = (response.data or [None])[0]

  reviewer_map = fetch_users_by_ids([user["id"]])
  artisan_map = fetch_users_by_ids([product.get("artisan_id")])
  review_summary = fetch_review_summary([product_id])
  
  # Update product table with aggregated values
  prod_summary = review_summary.get(product_id, {"count": 0, "sum": 0.0})
  count = prod_summary["count"]
  avg = prod_summary["sum"] / count if count > 0 else 0.0
  client.table("products").update({"review_count": count, "average_rating": round(avg, 2)}).eq("id", product_id).execute()
  
  # Fetch fresh product row to return
  fresh_product_rows = client.table("products").select("*").eq("id", product_id).execute().data or []
  fresh_product = fresh_product_rows[0] if fresh_product_rows else product
  
  return {
    "message": "Review saved successfully",
    "review": serialize_review(stored, user_map=reviewer_map),
    "summary": serialize_product(fresh_product, artisan_map=artisan_map, review_summary=review_summary),
  }


@app.put("/api/products/{product_id}")
async def update_product(
  product_id: str,
  payload: Dict[str, Any],
  authorization: Optional[str] = Header(default=None),
):
  user = require_user(authorization)
  client = require_supabase()
  product_rows = client.table("products").select("*").eq("id", product_id).execute().data or []
  if not product_rows:
    raise HTTPException(status_code=404, detail={"message": "Not found"})
  if product_rows[0].get("artisan_id") != user["id"]:
    raise HTTPException(status_code=403, detail={"message": "Forbidden"})

  payload.pop("artisan_id", None)
  response = client.table("products").update(payload).eq("id", product_id).execute()
  updated = (response.data or [None])[0]
  return serialize_product(updated)


@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str, authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  client = require_supabase()
  product_rows = client.table("products").select("*").eq("id", product_id).execute().data or []
  if not product_rows:
    raise HTTPException(status_code=404, detail={"message": "Not found"})
  if product_rows[0].get("artisan_id") != user["id"]:
    raise HTTPException(status_code=403, detail={"message": "Forbidden"})

  client.table("products").delete().eq("id", product_id).execute()
  return {"message": "Deleted"}


@app.post("/api/artisans")
async def save_artisan(payload: ArtisanPayload, authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  client = require_supabase()
  now = datetime.utcnow().isoformat()
  artisan_data = {
    "user_id": user["id"],
    "craft_type": payload.craftType,
    "years_of_experience": payload.yearsOfExperience or 0,
    "specialties": payload.specialties or [],
    "workshop_location": payload.workshopLocation,
    "story": payload.story,
    "latitude": payload.latitude,
    "longitude": payload.longitude,
    "updated_at": now,
  }

  existing = client.table("artisans").select("id").eq("user_id", user["id"]).execute().data
  if existing:
    response = client.table("artisans").update(artisan_data).eq("id", existing[0]["id"]).execute()
  else:
    artisan_data["created_at"] = now
    response = client.table("artisans").insert(artisan_data).execute()

  artisan = (response.data or [None])[0]
  return {
    "message": "Artisan profile saved successfully",
    "artisan": serialize_artisan(artisan),
  }


@app.get("/api/artisans/profile")
async def artisan_profile(authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  client = require_supabase()
  artisan_rows = client.table("artisans").select("*").eq("user_id", user["id"]).execute().data or []
  if not artisan_rows:
    raise HTTPException(status_code=404, detail={"message": "Artisan profile not found"})
  return serialize_artisan(artisan_rows[0])


@app.get("/api/artisans")
async def get_artisans(userId: Optional[str] = None):
  client = require_supabase()
  query = client.table("artisans").select("*")
  if userId:
    query = query.eq("user_id", userId)
  items = query.execute().data or []
  user_ids = [row.get("user_id") for row in items if row.get("user_id")]
  user_map = fetch_users_by_ids(user_ids)
  return [serialize_artisan(row, user_map=user_map) for row in items]


@app.post("/api/orders/create-razorpay-order")
async def create_razorpay_order(payload: OrderPayload, authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  client = require_supabase()
  
  if not razorpay_client:
      raise HTTPException(status_code=500, detail={"message": "Razorpay not configured"})
      
  # Calculate total amount
  total_amount = float(payload.total_amount)
  amount_in_paise = int(total_amount * 100)
  
  try:
      order_data = {
          "amount": amount_in_paise,
          "currency": "INR",
          "receipt": str(uuid.uuid4())
      }
      razorpay_order = razorpay_client.order.create(data=order_data)
      return {
          "order_id": razorpay_order["id"],
          "amount": razorpay_order["amount"],
          "currency": razorpay_order["currency"],
          "key_id": razorpay_key_id,
      }
  except Exception as e:
      raise HTTPException(status_code=500, detail={"message": f"Failed to create Razorpay order: {str(e)}"})


class RazorpayVerificationPayload(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    product_id: str
    quantity: int
    total_amount: float
    shipping_address: dict

@app.post("/api/orders/verify-payment")
async def verify_payment(payload: RazorpayVerificationPayload, authorization: Optional[str] = Header(default=None)):
    user = require_user(authorization)
    client = require_supabase()
    
    if not razorpay_client:
        raise HTTPException(status_code=500, detail={"message": "Razorpay not configured"})
        
    try:
        # Verify signature
        params_dict = {
            'razorpay_order_id': payload.razorpay_order_id,
            'razorpay_payment_id': payload.razorpay_payment_id,
            'razorpay_signature': payload.razorpay_signature
        }
        razorpay_client.utility.verify_payment_signature(params_dict)
    except Exception as e:
        raise HTTPException(status_code=400, detail={"message": "Invalid payment signature"})
        
    # Signature is valid, create the order in Supabase
    document = {
        "buyer_id": user["id"],
        "product_id": payload.product_id,
        "quantity": payload.quantity,
        "total_amount": payload.total_amount,
        "status": "paid",
        "shipping_address": payload.shipping_address,
        "razorpay_order_id": payload.razorpay_order_id,
        "razorpay_payment_id": payload.razorpay_payment_id,
        "created_at": datetime.utcnow().isoformat()
    }
    
    response = client.table("orders").insert(document).execute()
    order = (response.data or [None])[0]
    if not order:
        raise HTTPException(status_code=500, detail={"message": "Order insertion failed"})
    return serialize_order(order)


@app.post("/api/orders")
async def create_order(payload: OrderPayload, authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  client = require_supabase()
  document = payload.model_dump()
  document["buyer_id"] = user["id"]
  document["product_id"] = document.get("product_id")
  document["created_at"] = datetime.utcnow().isoformat()
  response = client.table("orders").insert(document).execute()
  order = (response.data or [None])[0]
  if not order:
    raise HTTPException(status_code=500, detail={"message": "Order creation failed"})
  return serialize_order(order)


@app.get("/api/orders")
async def get_orders(authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  client = require_supabase()
  order_rows = client.table("orders").select("*").eq("buyer_id", user["id"]).execute().data or []
  product_ids = [row.get("product_id") for row in order_rows if row.get("product_id")]
  product_rows = client.table("products").select("*").in_("id", product_ids).execute().data if product_ids else []
  product_map = {row.get("id"): row for row in (product_rows or [])}
  return [serialize_order(row, product_map=product_map) for row in order_rows]


@app.get("/api/artisans/orders")
async def get_artisan_orders(authorization: Optional[str] = Header(default=None)):
  user = require_user(authorization)
  if user.get("role") != "artisan":
    raise HTTPException(status_code=403, detail={"message": "Only artisans can view these orders"})

  client = require_supabase()
  # 1. Fetch all products belonging to this artisan
  product_rows = client.table("products").select("id, title, price, category").eq("artisan_id", user["id"]).execute().data or []
  if not product_rows:
      return []
  
  product_ids = [p["id"] for p in product_rows]
  product_map = {p["id"]: p for p in product_rows}
  
  # 2. Fetch all orders for those products
  order_rows = client.table("orders").select("*").in_("product_id", product_ids).order("created_at", desc=True).execute().data or []
  
  # 3. Fetch buyer names
  buyer_ids = [o["buyer_id"] for o in order_rows if o.get("buyer_id")]
  buyer_map = fetch_users_by_ids(buyer_ids)
  
  # 4. Serialize
  results = []
  for order in order_rows:
      serialized = serialize_order(order)
      # Embed product info
      serialized["product"] = product_map.get(order.get("product_id"))
      # Embed buyer info
      buyer = buyer_map.get(order.get("buyer_id"))
      serialized["buyer_name"] = buyer.get("full_name") or buyer.get("email") if buyer else "Unknown Buyer"
      results.append(serialized)
      
  return results


class OrderStatusUpdatePayload(BaseModel):
    status: str

@app.patch("/api/artisans/orders/{order_id}/status")
async def update_artisan_order_status(order_id: str, payload: OrderStatusUpdatePayload, authorization: Optional[str] = Header(default=None)):
    user = require_user(authorization)
    if user.get("role") != "artisan":
        raise HTTPException(status_code=403, detail={"message": "Only artisans can update order status"})
        
    client = require_supabase()
    
    # 1. Fetch the order
    order_rows = client.table("orders").select("*").eq("id", order_id).execute().data or []
    if not order_rows:
        raise HTTPException(status_code=404, detail={"message": "Order not found"})
    order = order_rows[0]
    
    # 2. Validate product ownership
    product_rows = client.table("products").select("artisan_id").eq("id", order["product_id"]).execute().data or []
    if not product_rows or product_rows[0].get("artisan_id") != user["id"]:
        raise HTTPException(status_code=403, detail={"message": "You cannot update an order for a product you don't own"})
        
    # 3. Update status
    valid_statuses = ["pending", "confirmed", "shipped", "delivered"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail={"message": f"Invalid status. Must be one of {valid_statuses}"})
        
    response = client.table("orders").update({"status": payload.status}).eq("id", order_id).execute()
    updated_order = (response.data or [None])[0]
    if not updated_order:
        raise HTTPException(status_code=500, detail={"message": "Failed to update order"})
        
    return serialize_order(updated_order)


# ═══════════════════════════════════════════════════════════════════
# AUCTION ORDER TRACKING & CONTACT EXCHANGE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

AUCTION_ORDER_STATUSES = ["won", "preparing", "ready_to_ship", "shipped", "delivered"]


@app.get("/api/auction-orders")
async def get_auction_orders(authorization: Optional[str] = Header(default=None)):
  """Get all auction orders for the current user."""
  user = require_user(authorization)
  client = require_supabase()
  user_id = user.get("id")

  artisan_orders = client.table("auction_orders").select("*").eq("artisan_id", user_id).order("created_at", desc=True).execute().data or []
  winner_orders = client.table("auction_orders").select("*").eq("winner_id", user_id).order("created_at", desc=True).execute().data or []

  all_orders = {o["auction_id"]: o for o in artisan_orders}
  for o in winner_orders:
    if o["auction_id"] not in all_orders:
      all_orders[o["auction_id"]] = o

  auction_ids = list(all_orders.keys())
  if not auction_ids:
    return []

  auctions = client.table("auction_items").select("id,title,current_bid,current_winner_id,current_winner_name,artisan_id,images,actual_end").in_("id", auction_ids).execute().data or []
  auction_map = {a["id"]: a for a in auctions}

  user_ids = set()
  for o in all_orders.values():
    user_ids.add(o.get("artisan_id", ""))
    user_ids.add(o.get("winner_id", ""))
  user_ids.discard("")
  user_map = fetch_users_by_ids(list(user_ids)) if user_ids else {}

  results = []
  for auction_id, order in all_orders.items():
    auction_info = auction_map.get(auction_id, {})
    artisan_user = user_map.get(order.get("artisan_id"), {})
    winner_user = user_map.get(order.get("winner_id"), {})
    results.append({
      **order,
      "auction_title": auction_info.get("title", ""),
      "winning_bid": auction_info.get("current_bid"),
      "winner_name": auction_info.get("current_winner_name", ""),
      "artisan_email": artisan_user.get("email", ""),
      "artisan_name": artisan_user.get("full_name") or artisan_user.get("email", ""),
      "winner_email": winner_user.get("email", ""),
      "images": auction_info.get("images", []),
      "actual_end": auction_info.get("actual_end"),
      "role": "artisan" if order.get("artisan_id") == user_id else "winner",
    })

  return results


@app.get("/api/auction-orders/{auction_id}")
async def get_auction_order_detail(auction_id: str, authorization: Optional[str] = Header(default=None)):
  """Get order status for a specific auction."""
  user = require_user(authorization)
  client = require_supabase()
  user_id = user.get("id")

  order_rows = client.table("auction_orders").select("*").eq("auction_id", auction_id).execute().data or []
  if not order_rows:
    raise HTTPException(status_code=404, detail={"message": "Auction order not found"})

  order = order_rows[0]
  if order.get("artisan_id") != user_id and order.get("winner_id") != user_id:
    raise HTTPException(status_code=403, detail={"message": "You are not a party to this auction order"})

  auction_rows = client.table("auction_items").select("*").eq("id", auction_id).execute().data or []
  auction_info = auction_rows[0] if auction_rows else {}

  user_ids_list = [order.get("artisan_id", ""), order.get("winner_id", "")]
  user_map = fetch_users_by_ids([uid for uid in user_ids_list if uid])

  artisan_user = user_map.get(order.get("artisan_id"), {})
  winner_user = user_map.get(order.get("winner_id"), {})

  return {
    **order,
    "auction_title": auction_info.get("title", ""),
    "winning_bid": auction_info.get("current_bid"),
    "winner_name": auction_info.get("current_winner_name", ""),
    "artisan_email": artisan_user.get("email", ""),
    "artisan_name": artisan_user.get("full_name") or artisan_user.get("email", ""),
    "winner_email": winner_user.get("email", ""),
    "images": auction_info.get("images", []),
    "actual_end": auction_info.get("actual_end"),
    "role": "artisan" if order.get("artisan_id") == user_id else "winner",
  }


@app.patch("/api/auction-orders/{auction_id}/status")
async def update_auction_order_status(
  auction_id: str,
  payload: AuctionStatusUpdatePayload,
  authorization: Optional[str] = Header(default=None),
):
  """Only the artisan can advance the delivery status."""
  user = require_user(authorization)
  client = require_supabase()

  order_rows = client.table("auction_orders").select("*").eq("auction_id", auction_id).execute().data or []
  if not order_rows:
    raise HTTPException(status_code=404, detail={"message": "Auction order not found"})

  order = order_rows[0]
  if order.get("artisan_id") != user.get("id"):
    raise HTTPException(status_code=403, detail={"message": "Only the artisan can update the order status"})

  if payload.status not in AUCTION_ORDER_STATUSES:
    raise HTTPException(status_code=400, detail={"message": f"Invalid status. Must be one of {AUCTION_ORDER_STATUSES}"})

  current_index = AUCTION_ORDER_STATUSES.index(order.get("status", "won"))
  new_index = AUCTION_ORDER_STATUSES.index(payload.status)
  if new_index <= current_index:
    raise HTTPException(status_code=400, detail={"message": "Status can only move forward"})

  now = datetime.now(timezone.utc).isoformat()
  update_data = {
    "status": payload.status,
    "updated_at": now,
  }
  if payload.note:
    update_data["artisan_note"] = payload.note

  response = client.table("auction_orders").update(update_data).eq("id", order["id"]).execute()
  updated = (response.data or [None])[0]
  if not updated:
    raise HTTPException(status_code=500, detail={"message": "Failed to update order status"})
  return updated


@app.post("/api/auction-orders/{auction_id}/contact-request")
async def create_contact_request(
  auction_id: str,
  payload: ContactRequestPayload,
  authorization: Optional[str] = Header(default=None),
):
  """Either party initiates a contact exchange request."""
  user = require_user(authorization)
  client = require_supabase()
  user_id = user.get("id")

  phone = payload.phone.strip()
  if not phone or not re.match(r"^\d{10,15}$", phone):
    raise HTTPException(status_code=400, detail={"message": "Phone must be 10-15 digits"})

  order_rows = client.table("auction_orders").select("*").eq("auction_id", auction_id).execute().data or []
  if not order_rows:
    raise HTTPException(status_code=404, detail={"message": "Auction order not found"})
  order = order_rows[0]

  if user_id != order.get("artisan_id") and user_id != order.get("winner_id"):
    raise HTTPException(status_code=403, detail={"message": "You are not a party to this auction"})

  existing = client.table("auction_contact_requests").select("*").eq("auction_id", auction_id).execute().data or []
  if existing:
    req = existing[0]
    if req.get("requester_id") == user_id:
      return req
    if req.get("responder_id") == user_id and req.get("status") == "pending":
      raise HTTPException(status_code=400, detail={"message": "A contact request already exists. Use the respond endpoint to accept or decline."})
    raise HTTPException(status_code=400, detail={"message": "A contact exchange already exists for this auction"})

  requester_role = "artisan" if user_id == order.get("artisan_id") else "winner"
  responder_id = order.get("winner_id") if requester_role == "artisan" else order.get("artisan_id")

  now = datetime.now(timezone.utc).isoformat()
  response = client.table("auction_contact_requests").insert({
    "auction_id": auction_id,
    "requester_id": user_id,
    "requester_role": requester_role,
    "requester_phone": phone,
    "responder_id": responder_id,
    "status": "pending",
    "created_at": now,
    "updated_at": now,
  }).execute()

  return (response.data or [{}])[0]


@app.post("/api/auction-orders/{auction_id}/contact-respond")
async def respond_to_contact_request(
  auction_id: str,
  payload: ContactRespondPayload,
  authorization: Optional[str] = Header(default=None),
):
  """The other party accepts or declines the contact exchange."""
  user = require_user(authorization)
  client = require_supabase()
  user_id = user.get("id")

  existing = client.table("auction_contact_requests").select("*").eq("auction_id", auction_id).execute().data or []
  if not existing:
    raise HTTPException(status_code=404, detail={"message": "No contact request found"})

  req = existing[0]
  if req.get("responder_id") != user_id:
    raise HTTPException(status_code=403, detail={"message": "You are not the responder for this request"})

  if req.get("status") != "pending":
    raise HTTPException(status_code=400, detail={"message": f"Request is already {req.get('status')}"})

  now = datetime.now(timezone.utc).isoformat()

  if payload.action == "accept":
    phone = payload.phone.strip()
    if not phone or not re.match(r"^\d{10,15}$", phone):
      raise HTTPException(status_code=400, detail={"message": "Phone must be 10-15 digits"})

    response = client.table("auction_contact_requests").update({
      "responder_phone": phone,
      "status": "accepted",
      "updated_at": now,
    }).eq("id", req["id"]).execute()
  elif payload.action == "decline":
    response = client.table("auction_contact_requests").update({
      "status": "declined",
      "updated_at": now,
    }).eq("id", req["id"]).execute()
  else:
    raise HTTPException(status_code=400, detail={"message": "Action must be 'accept' or 'decline'"})

  return (response.data or [{}])[0]


@app.get("/api/auction-orders/{auction_id}/contact")
async def get_contact_status(auction_id: str, authorization: Optional[str] = Header(default=None)):
  """Get contact exchange status and revealed phone numbers."""
  user = require_user(authorization)
  client = require_supabase()
  user_id = user.get("id")

  order_rows = client.table("auction_orders").select("*").eq("auction_id", auction_id).execute().data or []
  if not order_rows:
    raise HTTPException(status_code=404, detail={"message": "Auction order not found"})
  order = order_rows[0]

  if user_id != order.get("artisan_id") and user_id != order.get("winner_id"):
    raise HTTPException(status_code=403, detail={"message": "You are not a party to this auction"})

  existing = client.table("auction_contact_requests").select("*").eq("auction_id", auction_id).execute().data or []
  if not existing:
    return {"status": "none", "requester_id": None, "responder_id": None}

  req = existing[0]
  result = {
    "status": req.get("status"),
    "requester_id": req.get("requester_id"),
    "requester_role": req.get("requester_role"),
    "responder_id": req.get("responder_id"),
  }

  if req.get("status") == "accepted":
    result["requester_phone"] = req.get("requester_phone")
    result["responder_phone"] = req.get("responder_phone")

  return result
