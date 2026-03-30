import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  DollarSign,
  Eye,
  Heart,
  Loader2,
  Package,
  Plus,
  Sparkles,
  TrendingUp,
  Trash2,
  Upload,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";

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
  const [trendData, setTrendData] = useState(defaultTrendData);
  const [recommendations, setRecommendations] = useState([]);

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

      const [productsRes, trendsRes, recommendationsRes] = await Promise.allSettled([
        fetch(`/api/products?artisan_id=${user.id}`),
        fetch("/api/ai/market-trends"),
        fetch("/api/ai/recommendations", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

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

      if (trendsRes.status === "fulfilled") {
        const trends = await parseJsonSafely(trendsRes.value, defaultTrendData);
        if (trendsRes.value.ok) {
          setTrendData({ ...defaultTrendData, ...trends });
        }
      }

      if (recommendationsRes.status === "fulfilled") {
        const recommendationData = await parseJsonSafely(recommendationsRes.value, { recommendations: [] });
        if (recommendationsRes.value.ok) {
          setRecommendations(recommendationData.recommendations || []);
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
            <TabsList className="grid w-full grid-cols-3 max-w-lg">
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="trending">Trending</TabsTrigger>
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
              <Card className="p-8 border-2 border-primary/20">
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
                    <Button variant="hero" onClick={refreshRecommendations}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Recommend Me
                    </Button>
                  </div>
                </div>

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
