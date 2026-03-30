import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";

const parseJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const ArtisanSetup = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    craftType: "",
    yearsOfExperience: "",
    specialties: "",
    workshopLocation: "",
    story: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, navigate, user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const authData = JSON.parse(localStorage.getItem("auth") || "{}");
      const token = authData.token;

      if (!token) {
        toast.error("You must be logged in to create an artisan profile");
        navigate("/auth");
        return;
      }

      const response = await fetch("/api/artisans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          craftType: formData.craftType,
          yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience, 10) : 0,
          specialties: formData.specialties.split(",").map((item) => item.trim()).filter(Boolean),
          workshopLocation: formData.workshopLocation,
          story: formData.story,
          latitude: null,
          longitude: null,
        }),
      });

      const data = await parseJsonSafely(response);

      if (!response.ok) {
        throw new Error(data.message || `Profile creation failed (${response.status})`);
      }

      toast.success("Artisan profile created successfully!");
      navigate("/artisan-dashboard?tab=trending");
    } catch (error) {
      console.error("Error creating artisan profile:", error);
      toast.error(error.message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="pt-32 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Welcome, Artisan!</h1>
              <p className="text-muted-foreground">Tell us about your craft so we can help you succeed</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="craftType">What type of craft do you create? *</Label>
                <Input
                  id="craftType"
                  required
                  value={formData.craftType}
                  onChange={(event) => setFormData({ ...formData, craftType: event.target.value })}
                  placeholder="e.g., Pottery, Textile Weaving, Wood Carving"
                />
              </div>

              <div>
                <Label htmlFor="experience">Years of Experience</Label>
                <Input
                  id="experience"
                  type="number"
                  value={formData.yearsOfExperience}
                  onChange={(event) => setFormData({ ...formData, yearsOfExperience: event.target.value })}
                  placeholder="10"
                />
              </div>

              <div>
                <Label htmlFor="specialties">Your Specialties (comma-separated)</Label>
                <Input
                  id="specialties"
                  value={formData.specialties}
                  onChange={(event) => setFormData({ ...formData, specialties: event.target.value })}
                  placeholder="Blue pottery, Traditional designs, Custom orders"
                />
              </div>

              <div>
                <Label htmlFor="location">Workshop Location</Label>
                <Input
                  id="location"
                  value={formData.workshopLocation}
                  onChange={(event) => setFormData({ ...formData, workshopLocation: event.target.value })}
                  placeholder="Jaipur, Rajasthan, India"
                />
              </div>

              <div>
                <Label htmlFor="story">Your Story (Optional)</Label>
                <Textarea
                  id="story"
                  rows={5}
                  value={formData.story}
                  onChange={(event) => setFormData({ ...formData, story: event.target.value })}
                  placeholder="Tell customers about your journey, craft tradition, and what makes your work special..."
                />
              </div>

              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => navigate("/")} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" variant="hero" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Profile...
                    </>
                  ) : (
                    "Create Profile"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ArtisanSetup;
