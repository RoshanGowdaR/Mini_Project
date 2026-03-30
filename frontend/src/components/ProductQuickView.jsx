import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ShoppingCart, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProductQuickView({ product, open, onOpenChange, currentUser }) {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);

  if (!product) {
    return null;
  }

  const artisanId =
    typeof product.artisan_id === "object" ? product.artisan_id?._id : product.artisan_id;
  const artisanName =
    product.artisan?.user?.full_name ||
    product.artisan?.userId?.email ||
    product.artisan_id?.email ||
    "Artisan";
  const canBuy = !currentUser || artisanId !== currentUser.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{product.title}</DialogTitle>
          <DialogDescription>
            Complete product details, artisan information, pricing, and image gallery.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border bg-muted">
              <img
                src={product.images?.[selectedImage] || "/placeholder.svg"}
                alt={product.title}
                className="w-full h-80 object-cover"
              />
            </div>

            <div className="flex gap-3 overflow-x-auto">
              {(product.images || ["/placeholder.svg"]).map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  className={`h-20 w-20 rounded-lg overflow-hidden border-2 ${
                    selectedImage === index ? "border-primary" : "border-border"
                  }`}
                >
                  <img src={image} alt={`${product.title} ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge>{product.category}</Badge>
              <Badge variant="outline">{product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : "Made to order"}</Badge>
            </div>

            <div>
              <p className="text-3xl font-bold text-primary">${Number(product.price || 0).toFixed(2)}</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
            </div>

            {product.story && (
              <div className="space-y-2">
                <h3 className="font-semibold">Story</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{product.story}</p>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-semibold">Artisan</h3>
              <div className="rounded-lg border p-4 bg-card">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{artisanName}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.artisan?.craftType || "Handcrafted artisan product"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">Materials</p>
                <p>{product.materials?.length ? product.materials.join(", ") : "Not specified"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">Dimensions</p>
                <p>{product.dimensions || "Not specified"}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/product/${product._id}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Full Details
              </Button>

              <Button
                variant="hero"
                className="flex-1"
                disabled={!canBuy}
                onClick={() => navigate(`/product/${product._id}`)}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {canBuy ? "Buy Product" : "Your Product"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
