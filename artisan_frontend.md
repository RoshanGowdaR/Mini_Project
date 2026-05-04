# Artisan Frontend

## Purpose

This document explains the artisan-facing frontend side of Ophelia AI. It covers how artisans sign up, complete their profile, access the dashboard, view trending insights, upload products, manage listings, and receive recommendation-driven guidance.

## Main Artisan Frontend Features

- Artisan account registration and sign-in
- Artisan profile setup
- Artisan dashboard
- Dedicated Trending tab for artisans
- AI-powered recommendations for what to create next
- Market trend charts for artisan decision-making
- Product upload form
- Multiple image upload
- Product story entry
- Voice-to-text description capture in product upload
- Product list management and delete action
- Product quick-view inside dashboard
- Access to marketplace so artisans can also explore and buy from other artisans

## Artisan Pages Involved

- `frontend/src/pages/Auth.jsx`
- `frontend/src/pages/ArtisanSetup.jsx`
- `frontend/src/pages/ArtisanDashboard.jsx`
- `frontend/src/pages/UploadProduct.jsx`
- `frontend/src/pages/Marketplace.jsx`
- `frontend/src/pages/ProductDetail.jsx`
- `frontend/src/components/Navigation.jsx`

## Frontend Tech Used

- React
- JavaScript
- Vite
- Tailwind CSS
- shadcn/ui
- Lucide React icons
- Recharts
- Sonner
- React Router
- React Dropzone
- Browser speech recognition for voice input

## Artisan Frontend Features In Detail

### 1. Artisan Registration

The artisan uses the shared auth screen but selects the `artisan` role. After a successful artisan registration, the app routes the user into the artisan flow instead of the buyer marketplace flow.

### 2. Artisan Setup

The artisan setup page collects:

- craft type
- years of experience
- specialties
- workshop location
- story

This profile becomes the artisan identity layer that enriches products and dashboard content.

### 3. Artisan Dashboard

The artisan dashboard is the main operational area for sellers. It contains three tab sections:

- Products
- Analytics
- Trending

The page now defaults to the `Trending` tab so artisans immediately see market intelligence.

### 4. Trending Feature

This is one of the most important artisan-facing features in the current project.

The Trending tab shows:

- trending categories
- recommended actions
- top 5 product suggestions
- market line chart
- trending product score bar chart
- category share pie chart
- `Recommend Me` button for refreshed recommendation output

This feature is designed to help artisans make smarter product decisions before uploading or updating listings.

### 5. Dashboard Access Even Before Setup Completion

If an artisan has not yet completed the artisan profile, the dashboard still opens and the Trending section is still visible. Instead of blocking the artisan completely, the dashboard shows a setup prompt and keeps the market-intelligence area accessible.

This was done so the Trending feature is visible and useful earlier in the artisan journey.

### 6. Product Upload

The upload page lets artisans create new marketplace products with:

- title
- category
- description
- story
- price
- stock quantity
- materials
- dimensions
- weight
- up to 8 images

The page uses drag-and-drop image upload and converts images to base64 strings for the current flow.

### 7. Voice Input For Product Description

The upload page also supports browser speech recognition so artisans can speak a description instead of typing it manually. This is useful for faster onboarding and more natural storytelling.

### 8. Product Management

Inside the dashboard, artisans can:

- view their products
- open quick view
- inspect image counts and stock quantity
- delete products

### 9. Artisan As Buyer

The artisan frontend still includes marketplace browsing and the product detail buy flow. This means artisans are not restricted to only selling; they can also act as buyers for other artisans’ products.

## How The Artisan Frontend Works

### Step 1: Sign Up Or Sign In

The artisan logs in through the shared auth UI. The auth context stores the JWT and user info locally.

### Step 2: Enter The Dashboard Or Setup

If setup is incomplete, the artisan can complete profile information from the setup page. The dashboard can still load the trending area, but upload and full seller management are guided toward setup completion.

### Step 3: See Market Intelligence

The dashboard calls AI and analytics endpoints and renders charts plus recommendation lists. This gives artisans an actionable trend view instead of only raw product management.

### Step 4: Upload Products

After setup, artisans can upload products with full listing metadata and multiple images.

### Step 5: Manage And Inspect Products

The dashboard shows existing products and provides quick view and delete actions.

## How We Built The Artisan Frontend

The artisan frontend was built as a seller-oriented extension of the same React app used by buyers. Instead of building a separate frontend application, we used:

- role-aware navigation
- shared auth context
- shared marketplace/product components
- artisan-only pages for setup, dashboard, and upload
- reusable chart and card components for analytics and trends

The key implementation idea was to combine seller operations with seller intelligence, not just seller CRUD screens.

## Why The Trending Feature Matters

The Trending feature was added to make the artisan area more than a plain admin dashboard. It gives artisans:

- visibility into marketplace demand
- category direction
- concrete recommendation lists
- visual trend charts
- product strategy prompts from Groq-backed logic

That transforms the dashboard from a maintenance screen into a business support tool.

## Current Limitations Or Notes

- Product editing is not yet implemented as a dedicated edit form
- Delete is available, but update is not surfaced as a full UI workflow yet
- Voice input depends on browser support for speech recognition
- The dashboard charts depend on current marketplace/order data and may look sparse in low-data environments

## Summary

The artisan frontend supports onboarding, product listing, seller dashboard operations, and trend-guided product planning. Its most important current differentiator is the Trending area, which combines recommendations, charts, and marketplace signals to help artisans decide what to create and sell next.
