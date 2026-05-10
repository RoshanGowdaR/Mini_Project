# Ophelia AI — AI-Powered Artisan Marketplace

> Empowering traditional artisans to reach global markets with cutting-edge AI technology.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Architecture & Workflow](#architecture--workflow)
- [User Roles](#user-roles)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)

---

## Overview

**Ophelia AI** is a full-stack AI-powered artisan marketplace platform that connects traditional craftspeople (artisans) with buyers worldwide. It features a real-time auction system, AI-driven market analytics, an intelligent chatbot assistant, and a comprehensive order management workflow — all designed to make handcrafted goods accessible to a global audience.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI framework (SPA) |
| **Vite** | Build tool & dev server |
| **React Router v6** | Client-side routing |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Pre-built accessible UI components |
| **Recharts** | Data visualization (market trends) |
| **Sonner** | Toast notifications |
| **Lucide React** | Icon library |
| **Supabase JS SDK** | Google OAuth (Sign-in with Google) |
| **react-dropzone** | Drag-and-drop image uploads |

### Backend
| Technology | Purpose |
|---|---|
| **Python 3.11+** | Server language |
| **FastAPI** | REST API framework |
| **Uvicorn** | ASGI server |
| **Supabase (Python SDK)** | Database, Storage, Auth |
| **Groq API** | AI completions (LLaMA 3.3 70B) |
| **PyJWT** | Token-based authentication |
| **bcrypt** | Password hashing |
| **Resend** | Transactional email delivery |
| **python-multipart** | File upload handling |

### Infrastructure
| Service | Purpose |
|---|---|
| **Render** | Frontend and backend hosting (separate services) |
| **Supabase** | PostgreSQL database, file storage, Google OAuth provider |
| **GitHub** | Version control, CI/CD triggers |

---

## Features

### 🛒 Marketplace
- Browse, search, and filter handcrafted products by category
- Detailed product pages with image galleries, artisan stories, and reviews
- Product ratings and verified purchase reviews
- Multi-language support (English + Kannada)

### 🎨 Artisan Dashboard
- Complete artisan onboarding and profile setup
- Upload products with drag-and-drop multi-image support
- View and manage incoming orders with status updates (Pending → Confirmed → Shipped → Delivered)
- AI-powered product recommendations based on market trends
- Auction request submissions

### 🔨 Auction System
- Artisans submit auction requests for admin approval
- Admin schedules, approves, or rejects auctions
- Real-time bidding during live auctions
- User registration for upcoming auctions
- Email notifications for auction events (scheduled, live, ended, winner)
- Auction winner tracking

### 🤖 AI Features
- **Ophelia Chatbot**: AI assistant for marketplace navigation, product discovery, and artisan onboarding help
- **Market Trend Analytics**: Real-time market analysis using Groq's compound model for global artisan market insights
- **Artisan Recommendations**: Personalized product creation suggestions based on market demand
- **Groq Fallback**: Automatic backup API key switching for uninterrupted AI service

### 👤 User Profiles
- Account overview with order history
- Artisan details (craft type, experience, specialties, workshop location)
- Activity metrics (uploaded products, orders placed)
- Auction wins and auction order tracking

### 🔐 Authentication
- Email/password registration with password strength validation
- Sign in with Google (Supabase OAuth)
- Role-based access control (Buyer, Artisan, Admin)
- JWT token-based session management
- Rate-limited login attempts

### 🛡️ Admin Panel
- Auction management (approve, reject, go-live, end)
- User directory with email, role, and registration date
- Platform metrics (total users, artisans, buyers)
- Admin logout functionality

### 💳 Payments
- Razorpay integration (for production use with KYC)
- **Demo / Cash on Delivery** mode for testing and demonstration without payment gateway

---

## Architecture & Workflow

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│                  │       │                  │       │                  │
│   React Frontend │──────▶│  FastAPI Backend  │──────▶│    Supabase      │
│   (Render)       │  API  │  (Render)        │  SDK  │  (PostgreSQL +   │
│                  │       │                  │       │   Storage)       │
└──────────────────┘       └──────────────────┘       └──────────────────┘
                                   │
                                   │ API calls
                                   ▼
                           ┌──────────────────┐
                           │   Groq AI API    │
                           │  (LLaMA 3.3 70B) │
                           └──────────────────┘
```

### User Workflow

1. **Registration**: Users sign up as Buyer or Artisan (email/password or Google OAuth)
2. **Artisan Onboarding**: Artisans complete their profile (craft type, location, story)
3. **Product Upload**: Artisans upload products with images, descriptions, pricing
4. **Marketplace**: Buyers browse, search, and discover products
5. **Purchase**: Buyers purchase via Razorpay or Demo/COD mode
6. **Order Management**: Artisans manage order fulfillment (confirm → ship → deliver)
7. **Auctions**: Artisans request auctions → Admin approves → Users register → Live bidding → Winner declared
8. **AI Assistance**: Chatbot helps users navigate; market trends guide artisan decisions

---

## User Roles

### Buyer
- Browse and purchase products
- Leave verified purchase reviews
- Register for and bid on auctions
- View order history and auction wins

### Artisan
- Create and manage product listings
- Upload product images to Supabase storage
- Manage incoming orders and update statuses
- Submit auction requests
- Access AI-powered market recommendations
- View trend analytics dashboard

### Admin
- Approve or reject auction requests
- Schedule and manage live auctions
- View platform-wide user metrics
- Monitor all registered users and their roles

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/google` | Exchange Supabase OAuth token |
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/me` | Get admin info |

### Products
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | List all products |
| GET | `/api/products/{id}` | Get product detail |
| POST | `/api/products` | Create product (artisan) |
| PUT | `/api/products/{id}` | Update product (artisan) |
| DELETE | `/api/products/{id}` | Delete product (artisan) |
| POST | `/api/products/upload-images` | Upload product images |
| GET | `/api/products/{id}/reviews` | Get product reviews |
| POST | `/api/products/{id}/reviews` | Submit/update review |

### Orders
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/orders` | Create order (buyer) |
| GET | `/api/orders` | Get buyer's orders |
| GET | `/api/artisans/orders` | Get artisan's incoming orders |
| PATCH | `/api/artisans/orders/{id}/status` | Update order status |

### Artisans
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/artisans` | Create/update artisan profile |
| GET | `/api/artisans/profile` | Get own artisan profile |
| GET | `/api/artisans` | List all artisans |

### Auctions
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/auctions` | List public auctions |
| GET | `/api/auctions/{id}` | Auction detail with bids |
| POST | `/api/auctions/{id}/register` | Register for auction |
| GET | `/api/auctions/{id}/registrations/me` | Check registration status |
| POST | `/api/auctions/{id}/bid` | Place a bid |
| GET | `/api/auctions/{id}/bids` | Get bid history |
| GET | `/api/auctions/won` | Get auctions won by user |
| GET | `/api/auction-orders` | Get auction order records |
| POST | `/api/artisans/bid-requests` | Submit auction request |
| GET | `/api/artisans/bid-requests` | Get artisan's auction requests |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/metrics` | Platform user metrics |
| GET | `/api/admin/auction-requests` | Pending auction requests |
| GET | `/api/admin/auctions` | All auctions |
| POST | `/api/admin/auctions/{id}/approve` | Approve auction |
| POST | `/api/admin/auctions/{id}/reject` | Reject auction |
| PUT | `/api/admin/auctions/{id}` | Edit auction |
| POST | `/api/admin/auctions/{id}/go-live` | Start auction |
| POST | `/api/admin/auctions/{id}/end` | End auction |

### AI
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/chat` | Chat with Ophelia AI |
| GET | `/api/ai/market-trends` | Get market trend analytics |
| GET | `/api/ai/recommendations` | Get artisan recommendations |

---

## Deployment

### Frontend (Render - Static Site)
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Branch**: `feature/frontend`

### Backend (Render - Web Service)
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
- **Branch**: `feature/backend`

---

## Environment Variables

### Backend (.env / Render Environment)
| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `GROQ_API_KEY` | Primary Groq API key |
| `GROQ_BACKUP_API_KEY` | Backup Groq API key (auto-fallback) |
| `GROQ_MODEL` | Groq model name (default: `llama-3.3-70b-versatile`) |
| `GROQ_MARKET_MODEL` | Groq model for market analysis (default: `groq/compound`) |
| `RESEND_API_KEY` | Resend email API key |
| `ADMIN_SECRET_KEY` | Secret for admin JWT tokens |
| `FRONTEND_URL` | Frontend origin for CORS |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket name (default: `product-images`) |

### Frontend (.env)
| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |

---

## Database Schema

### Core Tables (Supabase PostgreSQL)

| Table | Description |
|---|---|
| `users` | All registered users (id, email, password_hash, role, full_name) |
| `artisans` | Artisan profiles (craft_type, specialties, workshop_location, story) |
| `products` | Product listings (title, description, price, category, images, stock) |
| `orders` | Purchase orders (buyer_id, product_id, quantity, total_amount, status) |
| `product_reviews` | Product ratings and reviews |
| `auction_items` | Auction listings (title, status, bids, scheduled times) |
| `auction_bids` | Individual bid records |
| `auction_registrations` | User registrations for auctions |
| `auction_orders` | Orders created from auction wins |
| `admin_users` | Admin accounts |

### Supabase Storage Buckets

| Bucket | Purpose |
|---|---|
| `product-images` | Product image uploads by artisans |

---

## License

This project is developed as an academic/demonstration project for the Ophelia Unbound AI platform.
