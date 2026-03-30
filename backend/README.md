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
