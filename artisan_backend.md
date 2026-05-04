# Artisan Backend

## Purpose

This document explains the artisan-related backend behavior in Ophelia AI. It covers artisan registration support, artisan profile persistence, product CRUD, trend intelligence, recommendation generation, and how the seller dashboard gets its data from the FastAPI layer.

## Main Artisan Backend Features

- Artisan account registration through shared auth
- Artisan profile creation and update
- Artisan profile lookup
- Artisan product creation
- Artisan product deletion
- Artisan product retrieval by seller id
- AI-generated artisan recommendations
- AI-generated marketplace trend analysis
- Shared order system so artisans can also buy from other artisans

## Artisan-Facing Backend Routes

These routes in `backend/app.py` support the artisan experience:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/artisans`
- `GET /api/artisans/profile`
- `GET /api/artisans`
- `POST /api/products`
- `GET /api/products`
- `GET /api/products/{product_id}`
- `PUT /api/products/{product_id}`
- `DELETE /api/products/{product_id}`
- `GET /api/ai/market-trends`
- `GET /api/ai/recommendations`
- `POST /api/orders`

## Backend Tech Used

- FastAPI
- Python
- Pydantic
- PyMongo
- JWT
- bcrypt
- Groq SDK
- dotenv

## Artisan Data Models

### User

The shared user model stores:

- email
- password hash
- role
- full name
- created timestamp

For artisans, the role is set to `artisan`.

### Artisan Profile

The artisan profile stores:

- `userId`
- `craftType`
- `yearsOfExperience`
- `specialties`
- `workshopLocation`
- `story`
- optional latitude and longitude
- created and updated timestamps

This is the model that powers artisan identity in the marketplace and dashboard.

### Product

The product model stores:

- artisan id
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
- created timestamp

## How Artisan Setup Works In The Backend

The frontend sends artisan setup data to `POST /api/artisans`. The backend:

- authenticates the user via JWT
- converts the JWT user id to `ObjectId`
- checks whether an artisan profile already exists
- updates the existing profile or inserts a new one
- returns the saved artisan profile

This means artisan setup is idempotent from the API perspective. The same endpoint supports both first-time creation and later updates.

## How Artisan Product Upload Works In The Backend

When the artisan submits the upload form, the frontend calls `POST /api/products`. The backend:

- authenticates the artisan
- converts the JWT id into `artisan_id`
- stores the product payload
- timestamps the new product
- returns the created product record

The backend expects the product images as an array, which matches the multi-image upload experience on the frontend.

## How Artisan Product Management Works

### View Products

The dashboard calls `GET /api/products?artisan_id={user.id}`. That returns only the current artisan’s products.

### Delete Products

The dashboard can delete a product using `DELETE /api/products/{product_id}`. The backend:

- authenticates the user
- loads the target product
- verifies ownership by comparing the product’s `artisan_id` with the token’s user id
- deletes the product if ownership matches

### Update Support

The backend already has `PUT /api/products/{product_id}` support for updates, even though the frontend does not yet expose a full edit interface.

## How The Trending Feature Works In The Backend

The artisan dashboard’s Trending section depends on two main AI endpoints:

- `GET /api/ai/market-trends`
- `GET /api/ai/recommendations`

### Market Trends

The backend builds a market context using:

- current products
- current orders
- current artisan profiles
- category counts
- revenue totals

That context is passed to Groq with a structured prompt asking for:

- summary
- market signal
- trending categories
- buyer opportunities
- recommended actions
- monthly trend series
- category share data
- trending product scores

If Groq fails or returns malformed JSON, the backend generates fallback trend data so the dashboard still shows charts and useful structure.

### Artisan Recommendations

The backend also builds artisan-specific recommendations using:

- the artisan’s own profile
- marketplace context

It asks Groq for exactly five recommendation strings. If Groq fails, the backend generates fallback recommendations based on:

- artisan craft type
- leading marketplace categories
- product presentation best practices

This is how the `Recommend Me` button can keep working even when the AI provider is unavailable.

## How Artisan Dashboard Data Is Built

The artisan dashboard is not served as one combined backend endpoint. Instead, the frontend composes it from multiple REST calls:

- artisan profile
- artisan products
- market trends
- artisan recommendations

This split design keeps each backend endpoint focused and reusable.

## How We Built The Artisan Backend

We built the artisan backend around three major ideas:

### 1. Shared Identity, Specialized Profile

Authentication is shared with buyers, but artisans gain extra domain-specific data through the artisan profile model.

### 2. Seller CRUD Plus Seller Intelligence

The backend does not stop at profile and product CRUD. It also provides recommendation and trend-analysis endpoints so artisan workflows include business guidance, not just storage.

### 3. Resilient Local Development

The backend includes:

- Mongo fallback to in-memory collections
- Groq fallback output
- consistent JSON error handling
- defensive password hashing and verification

This makes artisan features much more stable across local setups.

## Security And Ownership Logic

- JWT is required for protected artisan operations
- Product delete and update routes enforce ownership checks
- Artisan profile save and read are tied to the authenticated user id
- Recommendation access uses the authenticated artisan identity

## Current Limitations Or Notes

- The backend does not yet enforce that only `artisan` role users create products at the route level with a dedicated role guard
- Product edit UI is not yet exposed in the frontend, even though backend update support exists
- Order lifecycle management is still simple
- There is no media storage service yet; images are currently handled in a simplified frontend-driven way

## Summary

The artisan backend powers seller onboarding, profile persistence, product CRUD, dashboard analytics, trend intelligence, and personalized recommendations. It was built to support both operational seller tasks and strategic product planning inside the same FastAPI service.
