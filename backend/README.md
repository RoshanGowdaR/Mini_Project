# Backend (FastAPI + MongoDB)

This folder contains the Python FastAPI server for Ophelia AI. It uses MongoDB and preserves the same `/api/*` REST routes the frontend already calls.

## Setup

1. Install the Python dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. Create a `.env` file (a sample is included) and set `MONGO_URI` and `JWT_SECRET`.
   Add `GROQ_API_KEY` to enable the chatbot and AI market-trend endpoints.

3. Start the development server:
   ```bash
   .venv_run\Scripts\python.exe -m uvicorn app:app --reload --host 0.0.0.0 --port 4000
   ```

   The API runs on `http://localhost:4000` by default.

4. Run unit tests:
   ```bash
   pytest
   ```

## Available endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/products`
- `POST /api/products`
- `GET /api/products/:id`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `POST /api/artisans`
- `GET /api/artisans/profile`
- `GET /api/artisans`
- `POST /api/orders`
- `GET /api/orders`
- `POST /api/ai/chat`
- `GET /api/ai/market-trends`

The frontend still proxies `/api` traffic to port `4000`, so no UI feature changes are required.

## Database schema

The backend uses MongoDB collections that map closely to table-style entities:

- `users`
  - `_id`
  - `email`
  - `password`
  - `role`
  - `fullName`
  - `created_at`

- `artisans`
  - `_id`
  - `userId` -> references `users._id`
  - `craftType`
  - `yearsOfExperience`
  - `specialties`
  - `workshopLocation`
  - `story`
  - `latitude`
  - `longitude`
  - `createdAt`
  - `updatedAt`

- `products`
  - `_id`
  - `artisan_id` -> references `users._id`
  - `title`
  - `description`
  - `story`
  - `price`
  - `category`
  - `materials`
  - `dimensions`
  - `weight`
  - `images`
  - `stock_quantity`
  - `is_available`
  - `created_at`

- `orders`
  - `_id`
  - `buyer_id` -> references `users._id`
  - `product_id` -> references `products._id`
  - `quantity`
  - `total_amount`
  - `status`
  - `shipping_address`
  - `created_at`

- `product_reviews`
  - `_id`
  - `product_id` -> references `products._id`
  - `user_id` -> references `users._id`
  - `rating`
  - `title`
  - `comment`
  - `verified_purchase`
  - `created_at`
  - `updated_at`

The `product_reviews` collection is created automatically when the backend connects to MongoDB, and indexes are added for:

- `product_id`
- `user_id`
- unique pair of `product_id + user_id`

That keeps the project behavior unchanged while storing reviews in their own dedicated collection.
