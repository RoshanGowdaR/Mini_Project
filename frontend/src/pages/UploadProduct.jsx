import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Mic, StopCircle, Upload, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";

export default function UploadProduct() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [artisanProfile, setArtisanProfile] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    story: "",
    price: "",
    category: "",
    materials: "",
    dimensions: "",
    weight: "",
    stockQuantity: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      fetchArtisanProfile();
    }
  }, [user, authLoading, navigate]);

  const fetchArtisanProfile = async () => {
    try {
      const token = JSON.parse(localStorage.getItem("auth") || "{}").token;
      const response = await fetch("/api/artisans/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      const data = await response.json();
      setArtisanProfile(data);
    } catch (error) {
      console.error("Error fetching artisan profile:", error);
      toast.error("Please complete your artisan profile first");
      navigate("/artisan-setup");
    }
  };

  const MAX_FILES = 8;
  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const onDrop = useCallback((acceptedFiles, fileRejections) => {
    if (fileRejections.length > 0) {
      fileRejections.forEach((rej) => {
        rej.errors.forEach((err) => {
          if (err.code === "file-too-large") toast.error(`${rej.file.name} exceeds 5MB limit`);
          else if (err.code === "file-invalid-type") toast.error(`${rej.file.name} is not a valid image type`);
          else toast.error(err.message);
        });
      });
      return;
    }

    setUploadedImages((prev) => {
      const combined = [...prev, ...acceptedFiles];
      if (combined.length > MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} images allowed`);
        return prev;
      }
      return combined;
    });
    if (acceptedFiles.length > 0) {
      toast.success(`${acceptedFiles.length} image(s) added`);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    maxFiles: MAX_FILES,
    maxSize: MAX_SIZE_BYTES,
  });

  const removeImage = (index) => {
    setUploadedImages((prev) => prev.filter((_, imageIndex) => imageIndex !== index));
  };

  const startVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window)) {
      toast.error("Speech recognition is not supported in your browser");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsRecording(true);
      toast.success("Recording started");
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setFormData((prev) => ({
        ...prev,
        description: `${prev.description}${prev.description ? " " : ""}${transcript}`,
      }));
      toast.success("Voice description added");
    };
    recognition.onerror = () => {
      toast.error("Failed to capture voice input");
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!artisanProfile) {
      toast.error("Artisan profile not found");
      return;
    }

    if (!formData.title.trim() || !formData.description.trim() || !formData.category.trim()) {
      toast.error("Title, description, and category are required");
      return;
    }

    setLoading(true);

    try {
      const token = JSON.parse(localStorage.getItem("auth") || "{}").token;
      let imageUrls = ["/placeholder.svg"];

      // Step 1: Upload images to Supabase Storage via backend
      if (uploadedImages.length > 0) {
        const imageFormData = new FormData();
        uploadedImages.forEach((file) => {
          imageFormData.append("files", file);
        });

        const uploadResponse = await fetch("/api/products/upload-images", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: imageFormData,
        });

        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(uploadData.message || "Failed to upload images");
        }
        imageUrls = uploadData.image_urls;
      }

      // Step 2: Create product with the returned image URLs
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          story: formData.story,
          price: Number(formData.price),
          category: formData.category,
          materials: formData.materials
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          dimensions: formData.dimensions,
          weight: formData.weight,
          images: imageUrls,
          stock_quantity: Number(formData.stockQuantity) || 0,
          is_available: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to upload product");
      }

      toast.success("Product uploaded successfully");
      navigate("/artisan-dashboard");
    } catch (error) {
      console.error("Error uploading product:", error);
      toast.error(error.message || "Failed to upload product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/10">
      <Navigation />

      <div className="pt-32 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Upload Your Craft
            </h1>
            <p className="text-muted-foreground">Upload artisan-only products with multiple images and full product details.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <Card className="p-8 border-2 border-primary/20">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Product Images
              </h2>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
                  isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2 font-medium">Drag and drop images here, or click to select</p>
                <p className="text-sm text-muted-foreground">Up to 8 images (JPEG, PNG, WEBP) · Max 5MB each</p>
              </div>

              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  {uploadedImages.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="relative group">
                      <img src={URL.createObjectURL(file)} alt={`Upload ${index + 1}`} className="w-full h-32 object-cover rounded-lg border-2 border-border" />
                      <p className="text-xs text-muted-foreground mt-1 truncate">{file.name}</p>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-8 border-2 border-primary/20">
              <h2 className="text-xl font-bold mb-6">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Product Title *</Label>
                  <Input
                    id="title"
                    required
                    value={formData.title}
                    onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                    placeholder="Handcrafted Blue Pottery Vase"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    required
                    value={formData.category}
                    onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                    placeholder="Pottery, Textile, Woodwork, Metalwork"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="description">Product Description *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={startVoiceInput} disabled={isRecording}>
                      {isRecording ? <StopCircle className="w-4 h-4 mr-2 text-red-500" /> : <Mic className="w-4 h-4 mr-2" />}
                      {isRecording ? "Recording..." : "Voice Input"}
                    </Button>
                  </div>
                  <Textarea
                    id="description"
                    required
                    value={formData.description}
                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    placeholder="Describe the product, materials, craftsmanship, and uniqueness..."
                    rows={5}
                  />
                </div>

                <div>
                  <Label htmlFor="story">Product Story</Label>
                  <Textarea
                    id="story"
                    value={formData.story}
                    onChange={(event) => setFormData({ ...formData, story: event.target.value })}
                    placeholder="Share the story behind the product"
                    rows={5}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-8 border-2 border-primary/20">
              <h2 className="text-xl font-bold mb-6">Pricing and Details</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    required
                    step="0.01"
                    value={formData.price}
                    onChange={(event) => setFormData({ ...formData, price: event.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="stockQuantity">Stock Quantity *</Label>
                  <Input
                    id="stockQuantity"
                    type="number"
                    required
                    value={formData.stockQuantity}
                    onChange={(event) => setFormData({ ...formData, stockQuantity: event.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="materials">Materials</Label>
                  <Input
                    id="materials"
                    value={formData.materials}
                    onChange={(event) => setFormData({ ...formData, materials: event.target.value })}
                    placeholder="Clay, Natural Dye, Cotton"
                  />
                </div>
                <div>
                  <Label htmlFor="dimensions">Dimensions</Label>
                  <Input
                    id="dimensions"
                    value={formData.dimensions}
                    onChange={(event) => setFormData({ ...formData, dimensions: event.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Weight</Label>
                  <Input
                    id="weight"
                    value={formData.weight}
                    onChange={(event) => setFormData({ ...formData, weight: event.target.value })}
                  />
                </div>
              </div>
            </Card>

            <Button type="submit" disabled={loading} className="w-full h-14 text-lg" variant="hero">
              {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Upload className="w-5 h-5 mr-2" />}
              {loading ? "Uploading Product..." : "Upload Product"}
            </Button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}
