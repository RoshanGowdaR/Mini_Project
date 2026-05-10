import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Chatbot } from "./components/Chatbot";
import { AuthProvider } from "@/hooks/useAuth";
import Analytics from "./pages/Analytics";
import ArtisanDashboard from "./pages/ArtisanDashboard";
import ArtisanSetup from "./pages/ArtisanSetup";
import ArtisanOrders from "./pages/ArtisanOrders";
import Auth from "./pages/Auth";
import AuctionRoom from "./pages/AuctionRoom";
import Auctions from "./pages/Auctions";
import Index from "./pages/Index";
import Marketplace from "./pages/Marketplace";
import NotFound from "./pages/NotFound";
import ProductDetail from "./pages/ProductDetail";
import Profile from "./pages/Profile";
import UploadProduct from "./pages/UploadProduct.jsx";
import AdminRoute from "./components/AdminRoute";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <Chatbot />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/artisan-dashboard" element={<ArtisanDashboard />} />
            <Route path="/artisan-setup" element={<ArtisanSetup />} />
            <Route path="/artisan/orders" element={<ArtisanOrders />} />
            <Route path="/upload-product" element={<UploadProduct />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/auctions" element={<Auctions />} />
            <Route path="/auctions/:auction_id" element={<AuctionRoom />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
