import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpFullName, setSignUpFullName] = useState("");
  const [userType, setUserType] = useState("buyer");

  const passwordRules = {
    length: "At least 8 characters",
    uppercase: "1 uppercase letter",
    number: "1 number",
    special: "1 special character",
  };

  const passwordChecks = {
    length: signUpPassword.length >= 8,
    uppercase: /[A-Z]/.test(signUpPassword),
    number: /\d/.test(signUpPassword),
    special: /[!@#$%^&*()_+\-=\[\]{}|;':\",./<>?]/.test(signUpPassword),
  };

  const strengthScore = Object.values(passwordChecks).filter(Boolean).length;
  const strengthLabel = ["Weak", "Fair", "Strong", "Very Strong"][Math.max(strengthScore - 1, 0)];
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];

  if (user) {
    navigate("/");
    return null;
  }

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await signIn(signInEmail, signInPassword);

    if (result.error) {
      toast.error(result.error || "Failed to sign in");
    } else if (result.isAdmin) {
      toast.success("Welcome, admin!");
      navigate("/admin");
    } else {
      toast.success("Welcome back!");
      if (result.user?.role === "artisan") {
        navigate("/artisan-dashboard");
      } else {
        navigate("/marketplace");
      }
    }

    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (strengthScore < 4) {
      toast.error("Password does not meet all requirements");
      setLoading(false);
      return;
    }

    const result = await signUp(signUpEmail, signUpPassword, signUpFullName, userType);

    if (result.error) {
      if (result.error.includes("already registered")) {
        toast.error("This email is already registered. Please sign in instead.");
      } else {
        toast.error(result.error || "Failed to sign up");
      }
    } else {
      toast.success("Account created and logged in successfully!");
      if (result.user?.role === "artisan") {
        navigate("/artisan-setup");
      } else {
        navigate("/marketplace");
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero opacity-10" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />

      <Card className="w-full max-w-md relative z-10 glass-effect border-2 border-primary/20">
        <div className="p-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-warm">
              <Sparkles className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-3xl font-bold text-gradient">Ophelia AI</span>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" variant="hero" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signUpFullName}
                    onChange={(e) => setSignUpFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    required
                    minLength={8}
                  />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 grid grid-cols-4 gap-1">
                        {[0, 1, 2, 3].map((index) => (
                          <span
                            key={`strength-${index}`}
                            className={`h-2 rounded-full ${index < strengthScore ? strengthColors[strengthScore - 1] : "bg-muted"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{strengthLabel}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(passwordRules).map(([key, label]) => (
                        <span
                          key={key}
                          className={passwordChecks[key] ? "text-green-600" : "text-red-500"}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>I am a:</Label>
                  <RadioGroup value={userType} onValueChange={(value) => setUserType(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="buyer" id="buyer" />
                      <Label htmlFor="buyer" className="font-normal cursor-pointer">
                        Buyer - I want to discover and purchase crafts
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="artisan" id="artisan" />
                      <Label htmlFor="artisan" className="font-normal cursor-pointer">
                        Artisan - I want to sell my handcrafted products
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button type="submit" className="w-full" variant="hero" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={() => navigate("/")}>Back to Home</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
