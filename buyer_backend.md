# Buyer Backend

## Purpose

This document explains the buyer-related backend behavior in the FastAPI server. It covers the endpoints that support buyer registration, login, marketplace browsing, ordering, AI chat, and market-trend consumption.

## Buyer-Facing Backend Features

- Buyer account registration
- Buyer account login
- JWT-based session handling
- Product listing for marketplace browsing
- Product detail retrieval
- Order creation for purchases
- Order retrieval for the logged-in buyer
- AI chatbot responses through Groq or fallback logic
- Market-trend data retrieval for analytics and trend-aware UI

## Main Buyer Backend Routes

The buyer frontend directly or indirectly depends on these routes in `backend/app.py`:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/products`
- `GET /api/products/{product_id}`
- `POST /api/orders`
- `GET /api/orders`
- `POST /api/ai/chat`
- `GET /api/ai/market-trends`
- `GET /api/artisans`

## Backend Tech Used

- FastAPI
- Python
- MongoDB through `pymongo`
- JWT through `PyJWT`
- Password hashing through `bcrypt`
- Groq Python SDK
- `python-dotenv` for environment variables
- Pydantic models for payload validation

## How Buyer Authentication Works

### Registration

When a buyer signs up, the frontend calls `POST /api/auth/register`. The backend:

- normalizes the email
- checks if that email already exists
- validates password length
- hashes the password
- stores a user record with role `buyer`
- creates a JWT token
- returns the serialized user object and token

The backend currently supports a defensive hashing strategy:

- preferred path: bcrypt
- fallback path: SHA-256 if bcrypt fails in the runtime environment

This was added to keep auth reliable across inconsistent local Python environments.

### Login

When a buyer logs in, the backend:

- normalizes the email
- loads the user record
- validates the password using the stored hash format
- returns the user object and JWT token

The token contains:

- user id
- role
- expiration timestamp

## How Buyer Product Access Works

Buyers do not need a special buyer-only product endpoint. The same product collection powers both marketplace discovery and seller management.

For buyer use cases:

- `GET /api/products` returns the marketplace catalog
- `GET /api/products/{product_id}` returns one product for the detail page

Each product contains:

- title
- description
- story
- price
- category
- materials
- dimensions
- weight
- images
- stock quantity
- availability state
- artisan reference

## How Buyer Ordering Works

When a buyer places an order, the frontend sends:

- product id
- quantity
- total amount
- shipping address object

The backend verifies the JWT, converts ids to `ObjectId`, stores the order, and timestamps it. Later, `GET /api/orders` loads the buyer’s own orders and hydrates product references so the frontend can show meaningful order information.

## How Buyer AI Features Work

### Chatbot

The buyer chatbot uses `POST /api/ai/chat`. The backend builds a conversation with a system prompt that tells the model to behave as Ophelia AI for the handcrafted artisan marketplace.

If Groq is configured and available, the server returns a model-generated reply. If Groq is unavailable, the backend returns a fallback assistant response instead of crashing.

### Market Trends

Buyers also indirectly benefit from `GET /api/ai/market-trends`, because that endpoint powers trend-aware UI and marketplace intelligence. The backend:

- builds marketplace context from products, orders, and artisans
- asks Groq for structured JSON
- validates and parses the response
- falls back to generated trend data if Groq output is missing or malformed

## Data And Storage Model For Buyer Operations

Buyer-related backend logic uses these collections:

- `users`
- `products`
- `orders`
- `artisans`

If MongoDB is unavailable, the backend can fall back to in-memory collections so the application still runs in a degraded but usable local mode.

## How We Built The Buyer Backend

The buyer backend was designed around REST principles and shared marketplace entities instead of separate buyer-only duplicate models.

We implemented:

- Pydantic payload models for input structure
- JWT auth helpers for protected routes
- serializers to convert MongoDB documents into frontend-safe JSON
- fallback behavior for MongoDB and Groq so local development is less fragile
- order hydration so buyer order history can include readable product data

This keeps the frontend simple because buyer pages can call a small set of stable `/api/*` endpoints.

## Reliability And Safety Decisions

- Return JSON errors consistently through FastAPI exception handlers
- Normalize emails to avoid duplicate-account issues caused by case differences
- Support multiple hash verification paths for local runtime resilience
- Fallback to in-memory collections if MongoDB is not reachable
- Fallback to generated trend and AI responses if Groq fails

## Current Limitations Or Notes

- There is no dedicated buyer profile model yet beyond user auth data
- Order status management is basic and currently defaults to `pending`
- Inventory checks are minimal and do not yet enforce advanced stock rules
- There is no payment gateway integration yet; ordering is an internal order-capture flow

## Summary

The buyer backend is responsible for secure authentication, product retrieval, order creation, buyer order lookup, and AI-assisted marketplace responses. It is implemented in FastAPI with MongoDB-backed models and resilience fallbacks so the buyer experience stays functional even in imperfect local environments.
