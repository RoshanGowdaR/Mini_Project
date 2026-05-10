import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  DollarSign,
  Eye,
  Heart,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Trash2,
  Upload,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import ProductQuickView from "@/components/ProductQuickView";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useMarketTrends } from "@/hooks/useMarketTrends";

const COLORS = ["#8B4513", "#D2691E", "#CD853F", "#DEB887", "#F4A460"];

const defaultTrendData = {
  monthly_trend: [],
  category_share: [],
  trending_products: [],
  trending_categories: [],
  recommended_actions: [],
  snapshot: {
    total_orders: 0,
  },
  summary: "",
};

const parseJsonSafely = async (response, fallback) => {
  try {
    return await response.json();
  } catch {
    return fallback;
  }
};

export default function ArtisanDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [artisanProfile, setArtisanProfile] = useState(null);
  const [hasArtisanProfile, setHasArtisanProfile] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { data: trendData, isRefreshing, lastUpdated, refresh } = useMarketTrends(defaultTrendData);
  const [recommendations, setRecommendations] = useState([]);
  const [auctionRequests, setAuctionRequests] = useState([]);
  const [auctionForm, setAuctionForm] = useState({
    title: "",
    description: "",
    story: "",
    starting_bid: "",
    images: [],
    product_id: "",
  });
  const [fadeIn, setFadeIn] = useState(true);

  const activeTab = searchParams.get("tab") || "trending";

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  useEffect(() => {
    setFadeIn(false);
    const timeoutId = setTimeout(() => setFadeIn(true), 10);
    return () => clearTimeout(timeoutId);
  }, [trendData]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return "Last updated: never";
    const minutesAgo = Math.floor((Date.now() - lastUpdated) / 60000);
    if (minutesAgo <= 1) return "Last updated: just now";
    return `Last updated: ${minutesAgo} minutes ago`;
  }, [lastUpdated]);

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = JSON.parse(localStorage.getItem("auth") || "{}").token;

      const profileRes = await fetch("/api/artisans/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profileData = await parseJsonSafely(profileRes, {});

      if (profileRes.ok) {
        setArtisanProfile(profileData);
        setHasArtisanProfile(true);
      } else if (profileRes.status === 404) {
        setArtisanProfile(null);
        setHasArtisanProfile(false);
      } else {
        throw new Error(profileData.message || "Failed to fetch artisan profile");
      }

      const fetchPromises = [
        profileRes.ok
          ? fetch(`/api/products?artisan_id=${user.id}`)
          : Promise.resolve(new Response(JSON.stringify([]), { status: 200 })),
        fetch("/api/ai/recommendations", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/artisans/bid-requests", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ];
      const [productsRes, recommendationsRes, auctionRes] = await Promise.allSettled(fetchPromises);

      if (productsRes.status === "fulfilled") {
        const productData = await parseJsonSafely(productsRes.value, []);
        if (productsRes.value.ok) {
          setProducts(Array.isArray(productData) ? productData : []);
        } else {
          setProducts([]);
          toast.error(productData.message || "Failed to load products");
        }
      } else {
        setProducts([]);
        toast.error("Failed to load products");
      }

      if (recommendationsRes.status === "fulfilled") {
        const recommendationData = await parseJsonSafely(recommendationsRes.value, { recommendations: [] });
        if (recommendationsRes.value.ok) {
          setRecommendations(recommendationData.recommendations || []);
        }
      }

      if (auctionRes.status === "fulfilled") {
        const auctionData = await parseJsonSafely(auctionRes.value, []);
        if (auctionRes.value.ok) {
          setAuctionRequests(Array.isArray(auctionData) ? auctionData : []);
        }
      }
    } catch (error) {
      console.error("Error fetching artisan dashboard:", error);
      toast.error(error.message || "Failed to load artisan dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      const token = JSON.parse(localStorage.getItem("auth") || "{}").token;
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseJsonSafely(response, {});
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete product");
      }
      setProducts((prev) => prev.filter((product) => product._id !== productId));
      toast.success("Product deleted successfully");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error(error.message || "Failed to delete product");
    }
  };

  const refreshRecommendations = async () => {
    try {
      const token = JSON.parse(localStorage.getItem("auth") || "{}").token;
      const response = await fetch("/api/ai/recommendations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseJsonSafely(response, { recommendations: [] });
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch recommendations");
      }
      setRecommendations(data.recommendations || []);
      toast.success("Recommendations refreshed");
    } catch (error) {
      console.error("Error refreshing recommendations:", error);
      toast.error(error.message || "Failed to refresh recommendations");
    }
  };

  const handleAuctionImageUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const readers = files.slice(0, 5).map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });
    Promise.all(readers).then((images) => {
      setAuctionForm((prev) => ({ ...prev, images }));
    });
  };

  const submitAuctionRequest = async () => {
    try {
      const token = JSON.parse(localStorage.getItem("auth") || "{}").token;
      const response = await fetch("/api/artisans/bid-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: auctionForm.title,
          description: auctionForm.description,
          story: auctionForm.story,
          images: auctionForm.images,
          starting_bid: Number(auctionForm.starting_bid),
          product_id: auctionForm.product_id || null,
        }),
      });
      const data = await parseJsonSafely(response, {});
      if (!response.ok) {
        throw new Error(data.message || "Failed to submit request");
      }
      toast.success("Auction request submitted");
      setAuctionForm({ title: "", description: "", story: "", starting_bid: "", images: [], product_id: "" });
      fetchDashboardData();
    } catch (error) {
      toast.error(error.message || "Failed to submit auction request");
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
    <div className="min-h-screen">
      <Navigation />

      <div className="pt-32 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              {hasArtisanProfile ? `Welcome back, ${artisanProfile.craftType} Artisan` : "Artisan Dashboard"}
            </h1>
            <p className="text-muted-foreground">
              Watch live market trends, explore recommendations, and manage your artisan products from one place.
            </p>
          </div>

          {!hasArtisanProfile && (
            <Card className="p-6 mb-8 border-2 border-primary/20 bg-primary/5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-2">Finish Your Artisan Profile</h2>
                  <p className="text-muted-foreground">
                    Your Trending section is already available below. Complete your artisan profile to upload products and unlock the full seller dashboard.
                  </p>
                </div>
                <Button variant="hero" onClick={() => navigate("/artisan-setup")}>
                  Complete Setup
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          )}

          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Products</span>
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div className="text-3xl font-bold">{products.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Active artisan listings</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Market Orders</span>
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div className="text-3xl font-bold">{trendData.snapshot?.total_orders || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Current platform demand</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Trending Products</span>
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="text-3xl font-bold">{trendData.trending_products?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Groq-generated market signals</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Recommendations</span>
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="text-3xl font-bold">{recommendations.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Personalized artisan suggestions</p>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 max-w-xl">
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="trending">Trending</TabsTrigger>
              <TabsTrigger value="auctions">Auction Hub</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Your Products</h2>
                <Button variant="hero" onClick={() => navigate(hasArtisanProfile ? "/upload-product" : "/artisan-setup")}>
                  <Upload className="w-4 h-4 mr-2" />
                  {hasArtisanProfile ? "Upload New Product" : "Complete Setup First"}
                </Button>
              </div>

              {!hasArtisanProfile ? (
                <Card className="p-12 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-bold mb-2">Complete your artisan setup</h3>
                  <p className="text-muted-foreground mb-6">
                    Once your profile is ready, you can upload products and manage them here.
                  </p>
                  <Button variant="hero" onClick={() => navigate("/artisan-setup")}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Go To Artisan Setup
                  </Button>
                </Card>
              ) : products.length === 0 ? (
                <Card className="p-12 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-bold mb-2">No products yet</h3>
                  <p className="text-muted-foreground mb-6">Upload your first artisan product with multiple images.</p>
                  <Button variant="hero" onClick={() => navigate("/upload-product")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Upload First Product
                  </Button>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <Card key={product._id} className="overflow-hidden hover:shadow-warm transition-smooth cursor-pointer" onClick={() => setSelectedProduct(product)}>
                      <div className="aspect-square relative overflow-hidden">
                        <img src={product.images?.[0] || "/placeholder.svg"} alt={product.title} className="w-full h-full object-cover" />
                        <Badge className="absolute top-4 right-4">{product.is_available ? "Active" : "Inactive"}</Badge>
                      </div>

                      <div className="p-4">
                        <h3 className="font-bold text-lg mb-2 line-clamp-1">{product.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{product.description}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold text-primary">${Number(product.price || 0).toFixed(2)}</span>
                          <div className="flex gap-3 text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {product.images?.length || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-4 h-4" />
                              {product.stock_quantity || 0}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedProduct(product);
                            }}
                          >
                            Quick View
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon" onClick={(event) => event.stopPropagation()}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{product.title}&quot;?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteProduct(product._id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="analytics">
              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-6">Live Market Analytics</h2>
                <p className="text-muted-foreground mb-8">{trendData.summary || "Market analytics are loading with fallback insights."}</p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Market Line Trend</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={trendData.monthly_trend || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#8B4513" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Trending Product Scores</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={trendData.trending_products || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="score" fill="#D2691E" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card className="p-4 lg:col-span-2">
                    <h3 className="font-semibold mb-4">Category Share</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={trendData.category_share || []} dataKey="value" nameKey="name" outerRadius={90} label>
                          {(trendData.category_share || []).map((entry, index) => (
                            <Cell key={entry.name || index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="trending" className="space-y-6">
              <Card className={`p-8 border-2 border-primary/20 transition-opacity duration-300 ${fadeIn ? "opacity-100" : "opacity-0"}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Trending</h2>
                    <p className="text-muted-foreground">See what the market is demanding and get product suggestions.</p>
                  </div>
                  <div className="flex gap-3">
                    {!hasArtisanProfile && (
                      <Button variant="outline" onClick={() => navigate("/artisan-setup")}>
                        Complete Setup
                      </Button>
                    )}
                    <Button variant="outline" onClick={refresh} disabled={isRefreshing}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Analytics
                    </Button>
                    <Button variant="hero" onClick={refreshRecommendations}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Recommend Me
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground mb-6">{lastUpdatedLabel}</div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <h3 className="font-semibold mb-3">Trending Categories</h3>
                    <ul className="space-y-2">
                      {(trendData.trending_categories || []).map((item) => (
                        <li key={item} className="rounded-md border bg-card px-3 py-2 text-sm">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Recommended Actions</h3>
                    <ul className="space-y-2">
                      {(trendData.recommended_actions || []).map((item) => (
                        <li key={item} className="rounded-md border bg-card px-3 py-2 text-sm">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Market Line Trend</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={trendData.monthly_trend || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#8B4513" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Trending Product Scores</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={trendData.trending_products || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="score" fill="#D2691E" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card className="p-4 lg:col-span-2">
                    <h3 className="font-semibold mb-4">Category Share</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={trendData.category_share || []} dataKey="value" nameKey="name" outerRadius={90} label>
                          {(trendData.category_share || []).map((entry, index) => (
                            <Cell key={entry.name || index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Top 5 Suggestions For You</h3>
                  <ul className="space-y-3">
                    {recommendations.map((item, index) => (
                      <li key={`${item}-${index}`} className="rounded-lg border p-4 bg-card">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="auctions" className="space-y-6">
              <Card className="p-8 border-2 border-primary/20 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Submit for Auction</h2>
                  <p className="text-muted-foreground">Request approval to list a product in live auctions.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Title</Label>
                    <Input value={auctionForm.title} onChange={(event) => setAuctionForm({ ...auctionForm, title: event.target.value })} />
                  </div>
                  <div>
                    <Label>Starting Bid</Label>
                    <Input type="number" value={auctionForm.starting_bid} onChange={(event) => setAuctionForm({ ...auctionForm, starting_bid: event.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Textarea value={auctionForm.description} onChange={(event) => setAuctionForm({ ...auctionForm, description: event.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Story</Label>
                    <Textarea value={auctionForm.story} onChange={(event) => setAuctionForm({ ...auctionForm, story: event.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Images (max 5)</Label>
                    <Input type="file" multiple accept="image/*" onChange={handleAuctionImageUpload} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Link to Existing Product (optional)</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={auctionForm.product_id}
                      onChange={(event) => setAuctionForm({ ...auctionForm, product_id: event.target.value })}
                    >
                      <option value="">Select a product</option>
                      {products.map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button variant="hero" onClick={submitAuctionRequest}>
                  Submit for Auction
                </Button>
              </Card>

              <Card className="p-8 border-2 border-primary/20 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">My Auction Requests</h2>
                  <p className="text-muted-foreground">Track approval and schedule status for your requests.</p>
                </div>
                {auctionRequests.length === 0 ? (
                  <p className="text-muted-foreground">No auction requests yet.</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {auctionRequests.map((request) => (
                      <Card key={request.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{request.title}</h3>
                          <Badge>{request.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Submitted: {new Date(request.created_at).toLocaleString()}</p>
                        {request.status === "rejected" && request.admin_notes && (
                          <p className="text-xs text-red-500 mt-2">Reason: {request.admin_notes}</p>
                        )}
                        {request.status === "live" && (
                          <Button className="mt-3" onClick={() => navigate(`/auctions/${request.id}`)}>
                            View Live Auction
                          </Button>
                        )}
                        {request.status === "ended" && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                            <p className="font-semibold text-amber-800 flex items-center gap-1 mb-1">
                              Winner: {request.current_winner_name || "None"}
                            </p>
                            {request.current_bid && (
                              <p className="text-sm text-amber-900 font-medium mb-1">
                                Winning Bid: ₹{Number(request.current_bid).toLocaleString()}
                              </p>
                            )}
                            {request.winner_email ? (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="w-3 h-3" /> Contact: {request.winner_email}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground">No contact info available.</p>
                            )}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ProductQuickView
        product={selectedProduct}
        open={Boolean(selectedProduct)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProduct(null);
          }
        }}
        currentUser={user}
      />

      <Footer />
    </div>
  );
}
