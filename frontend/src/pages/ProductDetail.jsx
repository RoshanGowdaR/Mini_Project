import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Heart, Loader2, MapPin, ShoppingCart, User } from "lucide-react";
import { toast } from "sonner";

import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
    postalCode: "",
    phone: "",
  });

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch product");
      }

      const data = await response.json();
      const artisanId = typeof data.artisan_id === "object" ? data.artisan_id?._id : data.artisan_id;
      let artisanProfile = null;

      if (artisanId) {
        const artisanResponse = await fetch(`/api/artisans?userId=${artisanId}`);
        const artisanData = await artisanResponse.json();
        artisanProfile = artisanData[0] || null;
      }

      setProduct({
        ...data,
        artisan: artisanProfile,
      });
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Failed to load product");
      navigate("/marketplace");
    } finally {
      setLoading(false);
    }
  };

  const artisanId = product ? (typeof product.artisan_id === "object" ? product.artisan_id?._id : product.artisan_id) : null;
  const isOwnProduct = user && artisanId === user.id;

  const handleBuyNow = () => {
    if (!user) {
      toast.error("Please sign in to purchase");
      navigate("/auth");
      return;
    }

    if (isOwnProduct) {
      toast.info("You cannot purchase your own product.");
      return;
    }

    setShowBuyDialog(true);
  };

  const handlePurchase = async () => {
    if (!product || !user) {
      return;
    }

    if (!shippingAddress.name || !shippingAddress.address || !shippingAddress.city || !shippingAddress.country || !shippingAddress.postalCode) {
      toast.error("Please fill in all shipping details");
      return;
    }

    setBuyLoading(true);

    try {
      const token = JSON.parse(localStorage.getItem("auth") || "{}").token;
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: product._id,
          quantity,
          total_amount: Number(product.price) * quantity,
          shipping_address: shippingAddress,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to place order");
      }

      toast.success("Order placed successfully");
      setShowBuyDialog(false);
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error(error.message || "Failed to place order");
    } finally {
      setBuyLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="pt-32 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 text-sm text-muted-foreground">
            <button onClick={() => navigate("/marketplace")} className="hover:text-primary">
              Marketplace
            </button>{" "}
            / <span className="text-foreground">{product.title}</span>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <Card className="overflow-hidden aspect-square">
                <img
                  src={product.images?.[selectedImage] || "/placeholder.svg"}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </Card>

              <div className="flex gap-4 overflow-x-auto">
                {(product.images || ["/placeholder.svg"]).map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      selectedImage === index ? "border-primary" : "border-border"
                    }`}
                  >
                    <img src={image} alt={`${product.title} ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-4xl font-bold">{product.title}</h1>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge>{product.category}</Badge>
                    <Badge variant="outline">
                      {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : "Made to order"}
                    </Badge>
                  </div>
                </div>

                <Button variant="ghost" size="icon">
                  <Heart className="w-6 h-6" />
                </Button>
              </div>

              <Card className="p-6">
                <div className="text-4xl font-bold text-primary mb-3">${Number(product.price || 0).toFixed(2)}</div>
                <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
              </Card>

              {product.story && (
                <Card className="p-6">
                  <h3 className="font-bold mb-2">Product Story</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{product.story}</p>
                </Card>
              )}

              <Card className="p-6">
                <h3 className="font-bold mb-4">Artisan Details</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {product.artisan?.userId?.email || product.artisan_id?.email || "Artisan"}
                    </p>
                    <p className="text-sm text-muted-foreground">{product.artisan?.craftType || "Handcrafted seller"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{product.artisan?.workshopLocation || "Workshop location not listed"}</span>
                </div>
              </Card>

              <Card className="p-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Materials</p>
                    <p>{product.materials?.length ? product.materials.join(", ") : "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dimensions</p>
                    <p>{product.dimensions || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Weight</p>
                    <p>{product.weight || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Product Type</p>
                    <p>{product.category}</p>
                  </div>
                </div>
              </Card>

              <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/marketplace")}>
                  Back to Marketplace
                </Button>
                <Button variant="hero" className="flex-1" onClick={handleBuyNow} disabled={isOwnProduct}>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {isOwnProduct ? "Your Product" : "Buy Now"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showBuyDialog} onOpenChange={setShowBuyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Purchase</DialogTitle>
            <DialogDescription>Enter your shipping details to place the order.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={shippingAddress.name}
                onChange={(event) => setShippingAddress({ ...shippingAddress, name: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={shippingAddress.address}
                onChange={(event) => setShippingAddress({ ...shippingAddress, address: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={shippingAddress.city}
                  onChange={(event) => setShippingAddress({ ...shippingAddress, city: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={shippingAddress.postalCode}
                  onChange={(event) => setShippingAddress({ ...shippingAddress, postalCode: event.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={shippingAddress.country}
                onChange={(event) => setShippingAddress({ ...shippingAddress, country: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={shippingAddress.phone}
                onChange={(event) => setShippingAddress({ ...shippingAddress, phone: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" min="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value) || 1)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuyDialog(false)}>
              Cancel
            </Button>
            <Button variant="hero" onClick={handlePurchase} disabled={buyLoading}>
              {buyLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
