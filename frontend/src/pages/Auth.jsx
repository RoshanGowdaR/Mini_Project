import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
    // Sign In state
    const [signInEmail, setSignInEmail] = useState("");
    const [signInPassword, setSignInPassword] = useState("");
    // Sign Up state
    const [signUpEmail, setSignUpEmail] = useState("");
    const [signUpPassword, setSignUpPassword] = useState("");
    const [signUpFullName, setSignUpFullName] = useState("");
    const [userType, setUserType] = useState('buyer');
    // Redirect if already authenticated
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
        }
        else {
            toast.success("Welcome back!");
            // Navigate based on user role
            if (result.user?.role === 'artisan') {
                navigate("/artisan-dashboard");
            }
            else {
                navigate("/marketplace");
            }
        }
        setLoading(false);
    };
    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true);
        if (signUpPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            setLoading(false);
            return;
        }
        const result = await signUp(signUpEmail, signUpPassword, signUpFullName, userType);
        if (result.error) {
            if (result.error.includes("already registered")) {
                toast.error("This email is already registered. Please sign in instead.");
            }
            else {
                toast.error(result.error || "Failed to sign up");
            }
        }
        else {
            toast.success("Account created and logged in successfully!");
            if (result.user?.role === 'artisan') {
                navigate("/artisan-setup");
            }
            else {
                navigate("/marketplace");
            }
        }
        setLoading(false);
    };
    return (_jsxs("div", { className: "min-h-screen flex items-center justify-center p-4 relative overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-hero opacity-10" }), _jsx("div", { className: "absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" }), _jsx("div", { className: "absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" }), _jsx(Card, { className: "w-full max-w-md relative z-10 glass-effect border-2 border-primary/20", children: _jsxs("div", { className: "p-8", children: [_jsxs("div", { className: "flex items-center justify-center gap-2 mb-8", children: [_jsx("div", { className: "w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-warm", children: _jsx(Sparkles, { className: "w-7 h-7 text-primary-foreground" }) }), _jsx("span", { className: "text-3xl font-bold text-gradient", children: "Ophelia AI" })] }), _jsxs(Tabs, { defaultValue: "signin", className: "w-full", children: [_jsxs(TabsList, { className: "grid w-full grid-cols-2 mb-8", children: [_jsx(TabsTrigger, { value: "signin", children: "Sign In" }), _jsx(TabsTrigger, { value: "signup", children: "Sign Up" })] }), _jsx(TabsContent, { value: "signin", children: _jsxs("form", { onSubmit: handleSignIn, className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "signin-email", children: "Email" }), _jsx(Input, { id: "signin-email", type: "email", placeholder: "your@email.com", value: signInEmail, onChange: (e) => setSignInEmail(e.target.value), required: true })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "signin-password", children: "Password" }), _jsx(Input, { id: "signin-password", type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: signInPassword, onChange: (e) => setSignInPassword(e.target.value), required: true })] }), _jsx(Button, { type: "submit", className: "w-full", variant: "hero", disabled: loading, children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }), "Signing in..."] })) : ("Sign In") })] }) }), _jsx(TabsContent, { value: "signup", children: _jsxs("form", { onSubmit: handleSignUp, className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "signup-name", children: "Full Name" }), _jsx(Input, { id: "signup-name", type: "text", placeholder: "John Doe", value: signUpFullName, onChange: (e) => setSignUpFullName(e.target.value), required: true })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "signup-email", children: "Email" }), _jsx(Input, { id: "signup-email", type: "email", placeholder: "your@email.com", value: signUpEmail, onChange: (e) => setSignUpEmail(e.target.value), required: true })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "signup-password", children: "Password" }), _jsx(Input, { id: "signup-password", type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: signUpPassword, onChange: (e) => setSignUpPassword(e.target.value), required: true, minLength: 6 }), _jsx("p", { className: "text-xs text-muted-foreground", children: "At least 6 characters" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "I am a:" }), _jsxs(RadioGroup, { value: userType, onValueChange: (value) => setUserType(value), children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(RadioGroupItem, { value: "buyer", id: "buyer" }), _jsx(Label, { htmlFor: "buyer", className: "font-normal cursor-pointer", children: "Buyer - I want to discover and purchase crafts" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(RadioGroupItem, { value: "artisan", id: "artisan" }), _jsx(Label, { htmlFor: "artisan", className: "font-normal cursor-pointer", children: "Artisan - I want to sell my handcrafted products" })] })] })] }), _jsx(Button, { type: "submit", className: "w-full", variant: "hero", disabled: loading, children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }), "Creating account..."] })) : ("Create Account") })] }) })] }), _jsx("div", { className: "mt-6 text-center", children: _jsx(Button, { variant: "ghost", onClick: () => navigate("/"), children: "Back to Home" }) })] }) })] }));
};
export default Auth;
