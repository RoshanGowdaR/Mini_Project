import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Heart, Loader2, MapPin, ShoppingCart, Star, User } from "lucide-react";
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

const parseJsonSafely = async (response, fallback) => {
  try {
    return await response.json();
  } catch {
    return fallback;
  }
};

const StarRatingInput = ({ value, onChange, disabled = false }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((ratingValue) => (
      <button
        key={ratingValue}
        type="button"
        disabled={disabled}
        onClick={() => onChange(ratingValue)}
        className="text-yellow-500 disabled:cursor-not-allowed"
      >
        <Star className={`h-5 w-5 ${ratingValue <= value ? "fill-current" : ""}`} />
      </button>
    ))}
  </div>
);

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    comment: "",
  });
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
      fetchReviews();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch product");
      }

      const data = await parseJsonSafely(response, null);
      const artisanId = typeof data.artisan_id === "object" ? data.artisan_id?._id : data.artisan_id;
      let artisanProfile = null;

      if (artisanId) {
        const artisanResponse = await fetch(`/api/artisans?userId=${artisanId}`);
        const artisanData = await parseJsonSafely(artisanResponse, []);
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

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await fetch(`/api/products/${id}/reviews`);
      const data = await parseJsonSafely(response, { reviews: [], summary: null });

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch reviews");
      }

      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      if (data.summary) {
        setProduct((current) => (current ? { ...current, ...data.summary, artisan: current.artisan } : current));
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
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
      
      // 1. Create Razorpay order
      const orderResponse = await fetch("/api/orders/create-razorpay-order", {
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

      const orderData = await parseJsonSafely(orderResponse, {});
      if (!orderResponse.ok) {
        throw new Error(orderData.message || "Failed to initialize payment");
      }

      // 2. Open Razorpay Checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Ophelia Unbound AI",
        description: `Purchase: ${product.title}`,
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            // 3. Verify Payment
            const verifyResponse = await fetch("/api/orders/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                product_id: product._id,
                quantity,
                total_amount: Number(product.price) * quantity,
                shipping_address: shippingAddress,
              }),
            });

            const verifyData = await parseJsonSafely(verifyResponse, {});
            if (!verifyResponse.ok) {
              throw new Error(verifyData.message || "Payment verification failed");
            }

            toast.success("Payment successful! Order placed.");
            setShowBuyDialog(false);
          } catch (err) {
            console.error("Verification error:", err);
            toast.error(err.message || "Payment verification failed");
          }
        },
        prefill: {
          name: user.full_name || shippingAddress.name,
          email: user.email,
        },
        notes: {
          address: shippingAddress.address,
        },
        theme: {
          color: "#8B4513", // Primary brand color
        },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on("payment.failed", function (response) {
        toast.error(response.error.description || "Payment failed");
      });
      // Test Card Details: Card 4111 1111 1111 1111, any future expiry, CVV 123
      rzp1.open();
      
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error(error.message || "Failed to place order");
    } finally {
      setBuyLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!user) {
      toast.error("Please sign in to write a review");
      navigate("/auth");
      return;
    }

    if (isOwnProduct) {
      toast.info("You cannot review your own product.");
      return;
    }

    setReviewSubmitting(true);

    try {
      const token = JSON.parse(localStorage.getItem("auth") || "{}").token;
      const response = await fetch(`/api/products/${product._id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reviewForm),
      });
      const data = await parseJsonSafely(response, {});

      if (!response.ok) {
        throw new Error(data.message || "Failed to save review");
      }

      toast.success("Review saved successfully");
      setReviewForm({ rating: 5, title: "", comment: "" });
      await fetchProduct();
      await fetchReviews();
    } catch (error) {
      console.error("Error saving review:", error);
      toast.error(error.message || "Failed to save review");
    } finally {
      setReviewSubmitting(false);
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
                  <div className="mt-3 flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-medium text-foreground">
                        {Number(product.average_rating || 0).toFixed(product.review_count ? 1 : 0)}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {product.review_count || 0} {product.review_count === 1 ? "review" : "reviews"}
                    </span>
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

              <Card className="p-6">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <h3 className="font-bold text-xl">Ratings & Reviews</h3>
                    <p className="text-sm text-muted-foreground">
                      Reviews from verified buyers, similar to marketplace shopping apps.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">
                      {Number(product.average_rating || 0).toFixed(product.review_count ? 1 : 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Based on {product.review_count || 0} {product.review_count === 1 ? "review" : "reviews"}
                    </p>
                  </div>
                </div>

                <div className="border rounded-xl p-4 mb-5 space-y-4">
                  <div>
                    <Label className="mb-2 block">Your Rating</Label>
                    <StarRatingInput
                      value={reviewForm.rating}
                      onChange={(rating) => setReviewForm((current) => ({ ...current, rating }))}
                      disabled={reviewSubmitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="review-title">Review Title</Label>
                    <Input
                      id="review-title"
                      placeholder="Summarize your experience"
                      value={reviewForm.title}
                      onChange={(event) => setReviewForm((current) => ({ ...current, title: event.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="review-comment">Review</Label>
                    <Textarea
                      id="review-comment"
                      placeholder="Share what you liked about the product, quality, finish, and packaging"
                      value={reviewForm.comment}
                      onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))}
                    />
                  </div>
                  <Button
                    variant="hero"
                    onClick={handleReviewSubmit}
                    disabled={reviewSubmitting || !user || isOwnProduct}
                  >
                    {reviewSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    {isOwnProduct ? "You cannot review your own product" : "Write a Review"}
                  </Button>
                  {!user && <p className="text-sm text-muted-foreground">Sign in and purchase the product to add a review.</p>}
                </div>

                {reviewsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : reviews.length === 0 ? (
                  <p className="text-muted-foreground">No reviews yet. Be the first buyer to review this product.</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review._id} className="rounded-xl border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                          <div>
                            <p className="font-semibold">
                              {review.user_id?.fullName || review.user_id?.email || "Marketplace buyer"}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1 text-yellow-500">
                                {[1, 2, 3, 4, 5].map((value) => (
                                  <Star key={value} className={`h-4 w-4 ${value <= review.rating ? "fill-current" : ""}`} />
                                ))}
                              </div>
                              {review.verified_purchase ? <Badge variant="outline">Verified Purchase</Badge> : null}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {review.updated_at ? new Date(review.updated_at).toLocaleDateString() : ""}
                          </p>
                        </div>
                        {review.title ? <p className="font-medium mb-1">{review.title}</p> : null}
                        {review.comment ? <p className="text-muted-foreground whitespace-pre-wrap">{review.comment}</p> : null}
                      </div>
                    ))}
                  </div>
                )}
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
