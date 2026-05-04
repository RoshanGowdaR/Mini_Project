# Buyer Frontend

## Purpose

This document explains the buyer-facing frontend side of Ophelia AI. It focuses on what a buyer can do in the React application, which technologies power that experience, how the screens are connected, and how the buyer journey works from sign-up to product purchase.

## Main Buyer Features

- Buyer account registration and sign-in
- Marketplace product browsing
- Search-based product discovery
- Emotion and category-style filtering in the marketplace
- Product quick-view popup from marketplace cards
- Full product detail page
- Multi-image product viewing on the detail page
- View artisan details for each product
- Order placement with shipping details
- Floating AI chatbot for marketplace and onboarding questions
- Multi-language interface support through the frontend i18n layer

## Buyer Pages Involved

- `frontend/src/pages/Auth.jsx`
- `frontend/src/pages/Marketplace.jsx`
- `frontend/src/pages/ProductDetail.jsx`
- `frontend/src/components/ProductQuickView.jsx`
- `frontend/src/components/Chatbot.jsx`
- `frontend/src/components/Navigation.jsx`

## Frontend Tech Used

- React
- JavaScript
- Vite
- Tailwind CSS
- shadcn/ui components
- Lucide React icons
- Sonner toast notifications
- Recharts for analytics-style charts where needed
- `react-router-dom` for routing
- `react-i18next` for language switching

## Tools and Libraries Used For Buyer Frontend

- `fetch` for calling backend REST APIs
- `useState` and `useEffect` for client-side UI state
- `Dialog`, `Card`, `Button`, `Input`, `Textarea`, and `Badge` UI components
- Browser speech recognition support in the chatbot for voice input where available

## How The Buyer Frontend Works

### 1. Authentication Flow

The buyer starts in the authentication screen. The sign-up form sends email, password, full name, and user type to the backend. If registration succeeds, the frontend stores the returned user and JWT token in `localStorage` through the auth context in `frontend/src/hooks/useAuth.jsx`.

After successful buyer sign-up or buyer login, the app routes the user to the marketplace instead of the artisan dashboard.

### 2. Marketplace Discovery Flow

The marketplace page calls `GET /api/products` and then enriches each product by fetching the corresponding artisan profile using the artisan user id. This allows each product card to show not just title and price, but also artisan craft or workshop context.

The buyer can:

- search by title
- search by description
- search by category
- search by craft type
- filter by emotion-style tags such as Joyful, Peaceful, Elegant, Festive, Cozy, and Artistic

The filter logic is entirely frontend-driven after the product data is loaded.

### 3. Quick View Flow

When a buyer clicks a product card or presses the quick-view button, the app opens a popup modal. This lets the buyer inspect the product without leaving the marketplace page.

The quick view is designed to reduce friction. Buyers can scan products quickly and then decide whether to open the full product detail page.

### 4. Product Detail Flow

The buyer can also open the full product page. That page:

- loads the selected product
- loads the artisan profile linked to that product
- shows title, category, price, stock state, description, story, materials, dimensions, weight, and workshop location
- shows multiple product images with thumbnail switching

This page gives the full context needed before buying.

### 5. Purchase Flow

When the buyer clicks `Buy Now`, the app opens an order dialog. The buyer enters:

- full name
- address
- city
- postal code
- country
- phone
- quantity

The frontend sends this information to the backend order endpoint and shows success or failure feedback with toast messages.

### 6. Buyer AI Chatbot Flow

The floating chatbot is available from the frontend and sends message history to `/api/ai/chat`. The goal of this feature is to help buyers:

- ask about products
- ask about artisans
- ask how the marketplace works
- ask for general marketplace guidance

Voice input is supported if the browser provides speech recognition.

## How We Built The Buyer Frontend

The buyer frontend was built as a React SPA structure where routing, authentication state, API calls, and UI composition are separated clearly.

We used:

- an auth context to persist the logged-in buyer session
- reusable UI components for consistent look and behavior
- a marketplace page that combines product data with artisan data
- a product detail page that expands the buyer decision-making experience
- a modal-driven quick-view flow to keep browsing fast

The implementation is intentionally API-first. The frontend does not hardcode product catalogs; it depends on backend product and artisan endpoints and renders what the backend returns.

## Buyer Frontend Design Decisions

- Keep discovery simple with search and visual filters
- Use quick view to reduce unnecessary page hops
- Keep full detail page richer for serious purchase intent
- Keep feedback immediate using toast messages
- Store auth locally so the buyer does not need to sign in again after refresh
- Use modular components so buyer UI can evolve without changing all screens

## Current Limitations Or Notes

- Wishlist behavior is visual only right now; it is not backed by a dedicated buyer wishlist API
- Ratings shown on marketplace cards are static presentation values right now
- Marketplace filtering is client-side after data load, not server-side filtering
- Buyer analytics are not a separate dedicated buyer dashboard yet

## Summary

The buyer frontend is the discovery and purchase side of the platform. It gives buyers authentication, marketplace exploration, product detail inspection, ordering, and AI-assisted interaction, all inside a React-based UI built on reusable components and REST API integration.
