# Ophelia Unbound AI - Frontend Application

Welcome to the frontend repository for **Ophelia Unbound AI**, a next-generation platform designed to bridge the gap between traditional artisans and modern consumers. By combining an e-commerce marketplace, real-time interactive auctions, and AI-driven analytics, Ophelia empowers artisans to reach a broader audience while providing buyers with unique, handcrafted items.

This project is built using **React** and **Vite**, heavily utilizing modern web development practices, real-time data synchronization, and AI integrations.

---

## 🌟 Core Features & Workflows

### 1. Unified Authentication System
- **Role-Based Access**: The platform supports three primary user roles: **Buyers**, **Artisans**, and **Admins**.
- **Workflow**: Users sign up and log in via a secure JWT-based authentication system backed by Supabase. Navigation and feature access automatically adapt based on the user's role (e.g., Artisans see analytics, Admins see management tools).

### 2. Artisan Marketplace
- **Product Management**: Artisans can easily list their handcrafted products, set prices, add descriptions, and upload images.
- **Discovery**: Buyers can browse the global marketplace, view detailed product pages, and purchase items directly.
- **Workflow**: Products added by artisans immediately become available in the public catalog, searchable and filterable by category.

### 3. Real-Time Live Auctions
The flagship feature of Ophelia Unbound, allowing exclusive handmade items to be auctioned in real-time.
- **Auction Request Phase**: Artisans submit a product to be auctioned via their dashboard, setting a starting bid and providing a compelling "story" behind the item.
- **Admin Review Phase**: Admins review the submitted auction requests. Upon approval, the auction enters the **Scheduled** state.
- **Registration Phase**: Buyers browse scheduled auctions and must explicitly register for them. Only registered participants are allowed to place bids once the auction goes live.
- **Live Phase (Real-Time Bidding)**: Admins trigger the auction to go "Live". 
  - Registered users enter the `AuctionRoom` and place bids in real-time using Supabase WebSockets.
  - Non-registered users can enter as **Spectators** to watch the bidding war unfold but are restricted from participating.
  - A real-time leaderboard tracks the current highest bidder.
- **Ended Phase & Fulfillment**: When the Admin ends the auction, a winner is declared.
  - **Winner View**: The winner is notified in their Profile's "Auctions Won" section and provided with the Artisan's contact email to arrange delivery.
  - **Artisan View**: The artisan's dashboard updates to show the auction winner's name and contact email for dispatch.
  - **Admin View**: Admins retain full historical records with contact info for both parties to ensure smooth transactions.

### 4. AI-Driven Market Intelligence (Groq API)
Ophelia uses cutting-edge AI to provide artisans with actionable business intelligence.
- **Live Market Analysis**: The AI analyzes current database trends (bids, product views, recent sales) and generates real-time market reports.
- **Trending Dashboards**: Artisans view interactive Recharts graphs showing category share, trending product scores, and monthly market momentum.
- **Personalized Recommendations**: Based on the market data and the specific artisan's past performance, the AI suggests what types of crafts they should create next to maximize profit.

### 5. Dedicated Dashboards
- **Buyer Profile**: Tracks standard marketplace orders, displays won auctions, and manages account details.
- **Artisan Dashboard**: Centralized hub for managing product listings, submitting/tracking auction requests, and viewing AI market analytics.
- **Admin Dashboard**: Comprehensive control center for reviewing artisan verifications, approving auction requests, controlling live auction states (Go Live / End), and platform oversight.

---

## 🛠️ Technology Stack

- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS, Shadcn UI components
- **Icons**: Lucide React
- **Charting**: Recharts
- **Routing**: React Router DOM
- **Notifications**: Sonner (Toast notifications)
- **Real-time Sync & DB**: Supabase (PostgreSQL, WebSockets)
- **AI Engine**: Groq API (Backend integration)
- **Deployment**: Render

---

## 📂 Project Structure

```text
frontend/
├── src/
│   ├── components/      # Reusable UI components (Buttons, Cards, Navigation, etc.)
│   ├── hooks/           # Custom React hooks (e.g., useAuth)
│   ├── lib/             # Utility functions and Supabase client configuration
│   ├── pages/           # Main route components
│   │   ├── admin/       # Admin specific views (AdminDashboard)
│   │   ├── AuctionRoom  # Real-time bidding interface
│   │   ├── ArtisanDash  # Artisan management and AI insights
│   │   ├── Profile      # Buyer account and history
│   │   └── ...
│   ├── App.jsx          # Main application routing and layout wrapper
│   └── index.css        # Global Tailwind styles
├── .env                 # Environment variables
├── server.js            # Express server for proxying API requests and serving static files in production
└── vite.config.js       # Vite configuration
```

---

## 🚀 Local Development Workflow

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   Ensure you have a `.env` file containing the necessary frontend variables, primarily the backend API URL (e.g., `VITE_API_URL=http://localhost:8000`).

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Git Branching Strategy**:
   The project strictly adheres to branch-based development:
   - Changes to the frontend MUST be pushed to `feature/frontend`.
   - Changes to the backend MUST be pushed to `feature/backend`.
   - The `developer` and `main` branches are protected and updated via Pull Requests only.

---

*Ophelia Unbound AI — Empowering Creators, Connecting Collectors.*
