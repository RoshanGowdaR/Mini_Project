import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Filter, Heart, Loader2, MapPin, Search, ShoppingCart, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";

import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import ProductQuickView from "@/components/ProductQuickView";
import VerificationBadge from "@/components/VerificationBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

const emotionTags = [
  { name: "Joyful", emoji: "✨" },
  { name: "Peaceful", emoji: "🌿" },
  { name: "Elegant", emoji: "💎" },
  { name: "Festive", emoji: "🎉" },
  { name: "Cozy", emoji: "🏡" },
  { name: "Artistic", emoji: "🎨" },
];

const parseJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch {
    return [];
  }
};

export default function Marketplace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/products");
      const data = await parseJsonSafely(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch products");
      }

      const enrichedProducts = await Promise.all(
        (Array.isArray(data) ? data : []).map(async (product) => {
          const artisanId = typeof product.artisan_id === "object" ? product.artisan_id?._id : product.artisan_id;
          let artisanProfile = null;

          if (artisanId) {
            try {
              const artisanResponse = await fetch(`/api/artisans?userId=${artisanId}`);
              const artisanData = await parseJsonSafely(artisanResponse);
              if (artisanResponse.ok && Array.isArray(artisanData)) {
                artisanProfile = artisanData[0] || null;
              }
            } catch {
              artisanProfile = null;
            }
          }

          return {
            ...product,
            artisan: artisanProfile,
          };
        })
      );

      setProducts(enrichedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error(error.message || "Failed to load products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const search = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !search ||
      product.title?.toLowerCase().includes(search) ||
      product.description?.toLowerCase().includes(search) ||
      product.category?.toLowerCase().includes(search) ||
      product.artisan?.craftType?.toLowerCase().includes(search);

    const matchesEmotion =
      !selectedEmotion ||
      product.category?.toLowerCase().includes(selectedEmotion.toLowerCase()) ||
      product.description?.toLowerCase().includes(selectedEmotion.toLowerCase()) ||
      product.story?.toLowerCase().includes(selectedEmotion.toLowerCase());

    return matchesSearch && matchesEmotion;
  });

  return (
    <div className="min-h-screen">
      <Navigation />

      <section className="pt-32 pb-16 bg-gradient-warm">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-5xl font-bold mb-4">
              Discover Authentic
              <br />
              <span className="text-gradient">Handcrafted Treasures</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Explore artisan-made products and open any item for a full quick-view popup.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search by category, craft, story, or feeling..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-12 h-14"
                />
              </div>
              <Button variant="hero" size="lg" className="h-14">
                <Filter className="w-5 h-5 mr-2" />
                Filters
              </Button>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">
              <Button
                variant={selectedEmotion === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedEmotion(null)}
                className="flex-shrink-0"
              >
                All Products
              </Button>
              {emotionTags.map((emotion) => (
                <Button
                  key={emotion.name}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEmotion(emotion.name)}
                  className={`flex-shrink-0 gap-2 ${selectedEmotion === emotion.name ? "bg-primary/10 border-primary" : ""}`}
                >
                  <span>{emotion.emoji}</span>
                  {emotion.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl text-muted-foreground">
                {searchQuery || selectedEmotion ? "No products match the current filters." : "No products available yet."}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">Marketplace Products</h2>
                <p className="text-muted-foreground">
                  {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <Card
                    key={product._id}
                    className="overflow-hidden hover:shadow-warm transition-smooth group cursor-pointer"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={product.images?.[0] || "/placeholder.svg"}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-smooth"
                      />
                      <Button
                        variant="glass"
                        size="icon"
                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-smooth"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Heart className="w-4 h-4" />
                      </Button>
                      <div className="absolute top-4 left-4 flex items-center gap-2">
                        <VerificationBadge size="sm" showDetails={false} />
                        <Badge className="glass-effect">{product.category}</Badge>
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2 line-clamp-1">{product.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{product.description}</p>

                      {product.artisan && (
                        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>{product.artisan.workshopLocation || product.artisan.craftType}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-4">
                        <div className="text-xl font-bold text-primary">${Number(product.price || 0).toFixed(2)}</div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">4.8</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedProduct(product);
                          }}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Quick View
                        </Button>
                        <Button
                          variant="hero"
                          className="flex-1"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/product/${product._id}`);
                          }}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Buy
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

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
