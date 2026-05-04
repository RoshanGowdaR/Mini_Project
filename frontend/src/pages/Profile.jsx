import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Loader2, Mail, Package, ShoppingBag, Sparkles, User, Trophy } from "lucide-react";

import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const parseJsonSafely = async (response, fallback) => {
  try {
    return await response.json();
  } catch {
    return fallback;
  }
};

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [artisanProfile, setArtisanProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [auctionRequests, setAuctionRequests] = useState([]);
  const [wonAuctions, setWonAuctions] = useState([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const token = JSON.parse(localStorage.getItem("auth") || "{}").token;

      const [artisanRes, productsRes, ordersRes, auctionsRes, wonRes] = await Promise.allSettled([
        fetch("/api/artisans/profile", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/products?artisan_id=${user.id}`),
        fetch("/api/orders", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        user?.role === "artisan"
          ? fetch("/api/artisans/bid-requests", {
              headers: { Authorization: `Bearer ${token}` },
            })
          : Promise.resolve(null),
        fetch("/api/auctions/won", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (artisanRes.status === "fulfilled") {
        const artisanData = await parseJsonSafely(artisanRes.value, null);
        if (artisanRes.value.ok) {
          setArtisanProfile(artisanData);
        }
      }

      if (productsRes.status === "fulfilled") {
        const productData = await parseJsonSafely(productsRes.value, []);
        if (productsRes.value.ok) {
          setProducts(Array.isArray(productData) ? productData : []);
        }
      }

      if (ordersRes.status === "fulfilled") {
        const orderData = await parseJsonSafely(ordersRes.value, []);
        if (ordersRes.value.ok) {
          setOrders(Array.isArray(orderData) ? orderData : []);
        }
      }

      if (auctionsRes.status === "fulfilled" && auctionsRes.value) {
        const auctionData = await parseJsonSafely(auctionsRes.value, []);
        if (auctionsRes.value.ok) {
          setAuctionRequests(Array.isArray(auctionData) ? auctionData : []);
        }
      }

      if (wonRes.status === "fulfilled" && wonRes.value) {
        const wonData = await parseJsonSafely(wonRes.value, []);
        if (wonRes.value.ok) {
          setWonAuctions(Array.isArray(wonData) ? wonData : []);
        }
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-accent/10">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-8 mt-20">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Profile
          </h1>
          <p className="text-muted-foreground mt-2">View your personal account details, artisan information, products, and activity.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <Badge className="mt-1 capitalize">{user?.role || "buyer"}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-medium break-all">{user?.id}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Your Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Uploaded Products</p>
                <p className="text-3xl font-bold">{products.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Orders You Placed</p>
                <p className="text-3xl font-bold">{orders.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Profile Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Artisan Profile</p>
                <Badge className="mt-1">{artisanProfile ? "Completed" : "Not completed"}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Marketplace Access</p>
                <p className="font-medium">Enabled</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {artisanProfile && (
          <Card className="border-2 border-primary/20 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Artisan Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Craft Type</p>
                <p className="font-medium">{artisanProfile.craftType}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Years of Experience</p>
                <p className="font-medium">{artisanProfile.yearsOfExperience || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Workshop Location</p>
                <p className="font-medium">{artisanProfile.workshopLocation || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Specialties</p>
                <p className="font-medium">
                  {artisanProfile.specialties?.length ? artisanProfile.specialties.join(", ") : "Not provided"}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Story</p>
                <p className="font-medium whitespace-pre-wrap">{artisanProfile.story || "No story added yet."}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {(user?.role === "artisan" || !artisanProfile) && (
          <Card className="border-2 border-primary/20 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Artisan Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-muted-foreground">
                  {user?.role === "artisan"
                    ? "Upload new products or request an auction slot."
                    : "Complete artisan setup to upload products and request auctions."}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {user?.role === "artisan" ? (
                  <>
                    <Button variant="hero" onClick={() => navigate(artisanProfile ? "/upload-product" : "/artisan-setup")}>
                      Upload Product
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/artisan-dashboard?tab=auctions")}>
                      Auction Hub
                    </Button>
                  </>
                ) : (
                  <Button variant="hero" onClick={() => navigate("/artisan-setup")}>
                    Become an Artisan
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Your Products
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {products.length === 0 ? (
                <p className="text-muted-foreground">No products uploaded yet.</p>
              ) : (
                products.map((product) => (
                  <div key={product._id} className="rounded-lg border p-4">
                    <p className="font-semibold">{product.title}</p>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                    <p className="text-sm text-primary font-medium">${Number(product.price || 0).toFixed(2)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Your Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {orders.length === 0 ? (
                <p className="text-muted-foreground">No orders placed yet.</p>
              ) : (
                orders.map((order) => (
                  <div key={order._id} className="rounded-lg border p-4">
                    <p className="font-semibold">{order.product_id?.title || "Marketplace order"}</p>
                    <p className="text-sm text-muted-foreground">Status: {order.status}</p>
                    <p className="text-sm text-primary font-medium">${Number(order.total_amount || 0).toFixed(2)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {wonAuctions.length > 0 && (
          <Card className="border-2 border-amber-400/30 bg-amber-50/10 mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-600" />
                Auctions Won
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {wonAuctions.map((auction) => (
                <div key={auction.id} className="rounded-lg border p-4 bg-background">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-lg">{auction.title}</p>
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Winner 🎉</Badge>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Winning Bid</p>
                      <p className="font-semibold text-primary text-lg">₹{Number(auction.current_bid).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium text-emerald-600">Pending Delivery</p>
                    </div>
                    {auction.artisan_email && (
                      <div className="md:col-span-2 mt-2 pt-2 border-t">
                        <p className="text-muted-foreground mb-1">Artisan Contact for Delivery/Payment:</p>
                        <p className="font-medium flex items-center gap-2">
                          <Mail className="w-4 h-4 text-primary" />
                          <a href={`mailto:${auction.artisan_email}`} className="text-primary hover:underline">
                            {auction.artisan_email}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                  <Button className="mt-4 w-full md:w-auto" variant="outline" onClick={() => navigate(`/auctions/${auction.id}`)}>
                    View Auction Details
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {user?.role === "artisan" && (
          <Card className="border-2 border-primary/20 mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Auction Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {auctionRequests.length === 0 ? (
                <p className="text-muted-foreground">No auction requests yet.</p>
              ) : (
                auctionRequests.map((request) => (
                  <div key={request.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{request.title}</p>
                      <Badge>{request.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Submitted: {new Date(request.created_at).toLocaleString()}
                    </p>
                    {request.status === "rejected" && request.admin_notes && (
                      <p className="text-xs text-red-500 mt-2">Reason: {request.admin_notes}</p>
                    )}
                    {request.status === "live" && (
                      <Button className="mt-3" onClick={() => navigate(`/auctions/${request.id}`)}>
                        View Live Auction
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
