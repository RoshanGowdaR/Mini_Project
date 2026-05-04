# Ophelia AI

Ophelia AI is a handcrafted artisan marketplace with separate buyer and artisan flows, Groq-powered chat and market intelligence, multi-image product uploads, and a FastAPI backend.

## Stack

- Frontend: React, JavaScript, Vite, Tailwind CSS
- Backend: FastAPI, MongoDB
- AI: Groq
- Testing: pytest

## Features

- Separate buyer and artisan authentication flows
- Artisan profile setup and artisan-only product uploads
- Marketplace search and filtering
- Product quick-view popup with images, artisan details, pricing, and description
- Full product detail page and ordering flow
- Buyers can purchase artisan products
- Artisans can also purchase other artisans' products
- Groq-powered chatbot
- Groq-powered market trends, charts, and artisan recommendations
- Multiple product image uploads

## How To Run

### 1. Install frontend dependencies

```bash
cd frontend
npm install
```

### 2. Create a backend virtual environment

```bash
cd backend
python -m venv .venv
```

On Windows PowerShell:

```bash
.venv\Scripts\Activate.ps1
```

On macOS/Linux:

```bash
source .venv/bin/activate
```

### 3. Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Configure environment variables

Backend `.env`:

```env
MONGO_URI=mongodb://localhost:27017/Ophelia_AI
JWT_SECRET=your_jwt_secret
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.3-70b-versatile
```

### 5. Start the backend

```bash
cd backend
.venv_run\Scripts\python.exe -m uvicorn app:app --reload --host 0.0.0.0 --port 4000
```

### 6. Start the frontend

```bash
cd frontend
npm run dev
```

The frontend runs on `http://localhost:8080` and proxies API calls to `http://localhost:4000`.

## Run Tests

Backend tests:

```bash
cd backend
.venv_run\Scripts\Activate.ps1
pytest
```

Frontend checks:

```bash
cd frontend
npm run lint
npm run build
```

## Project Notes

- Marketplace products are limited to artisan-created products.
- Groq is used for chatbot replies, current market trends, charts, and artisan recommendations.
- Product cards open a popup quick view, and the full product page is still available for checkout.
- Google Maps integration is currently disabled, so no frontend maps API key is required.
