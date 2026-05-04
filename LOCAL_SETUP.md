# Ophelia Local Setup

## Prerequisites

1. Node.js 18+
2. npm
3. Python 3.10+
4. MongoDB

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The React frontend runs on `http://localhost:8080`.

## Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 4000
```

To run backend unit tests:

```bash
cd backend
pytest
```

The Python API runs on `http://localhost:4000`.

## Environment

Frontend:

- `VITE_GOOGLE_MAPS_API_KEY`

Backend:

- `MONGO_URI`
- `JWT_SECRET`

## Stack

- Frontend: React, JavaScript, HTML, CSS, Vite, Tailwind CSS
- Backend: Python, FastAPI, MongoDB

## Notes

- The frontend still calls the same `/api/*` routes as before.
- Vite proxies `/api` requests to `http://localhost:4000`.
- Features and route behavior were preserved while changing the implementation languages.
