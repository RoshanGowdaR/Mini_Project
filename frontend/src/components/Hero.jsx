import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import heroImage from "@/assets/hero-artisans.jpg";
import { useTranslation } from "react-i18next";
const Hero = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();
    const handleGetStarted = () => {
        if (user) {
            navigate("/upload-product");
        }
        else {
            navigate("/auth");
        }
    };
    return (_jsxs("section", { className: "relative min-h-screen flex items-center justify-center overflow-hidden", children: [_jsxs("div", { className: "absolute inset-0 z-0", children: [_jsx("img", { src: heroImage, alt: "Artisans crafting beautiful products", className: "w-full h-full object-cover" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-background/95 via-background/90 to-background/70" })] }), _jsxs("div", { className: "absolute inset-0 z-0", children: [_jsx("div", { className: "absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" }), _jsx("div", { className: "absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" })] }), _jsx("div", { className: "container mx-auto px-4 z-10 relative", children: _jsxs("div", { className: "max-w-4xl", children: [_jsxs("div", { className: "inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect mb-8 animate-fade-in", children: [_jsx(Sparkles, { className: "w-4 h-4 text-primary" }), _jsx("span", { className: "text-sm font-medium", children: t('hero.badge') })] }), _jsxs("h1", { className: "text-5xl md:text-7xl font-bold mb-6 leading-tight animate-fade-in-up", children: [t('hero.title'), _jsx("br", {}), _jsx("span", { className: "text-gradient", children: t('hero.titleHighlight') })] }), _jsx("p", { className: "text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl animate-fade-in-up delay-200", children: t('hero.subtitle') }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-4 animate-fade-in-up delay-300", children: [_jsxs(Button, { variant: "hero", size: "xl", className: "group", onClick: handleGetStarted, children: [t('hero.startSelling'), _jsx(ArrowRight, { className: "w-5 h-5 group-hover:translate-x-1 transition-smooth" })] }), _jsx(Button, { variant: "glass", size: "xl", onClick: () => navigate("/marketplace"), children: t('hero.exploreCrafts') })] }), _jsxs("div", { className: "grid grid-cols-3 gap-8 mt-16 animate-fade-in-up delay-500", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-4xl font-bold text-gradient mb-2", children: "50K+" }), _jsx("div", { className: "text-sm text-muted-foreground", children: t('hero.statsArtisans') })] }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-4xl font-bold text-gradient mb-2", children: "100+" }), _jsx("div", { className: "text-sm text-muted-foreground", children: t('hero.statsCountries') })] }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-4xl font-bold text-gradient mb-2", children: "1M+" }), _jsx("div", { className: "text-sm text-muted-foreground", children: t('hero.statsProducts') })] })] })] }) }), _jsx("div", { className: "absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce", children: _jsx("div", { className: "w-6 h-10 border-2 border-primary rounded-full flex items-start justify-center p-2", children: _jsx("div", { className: "w-1 h-3 bg-primary rounded-full animate-pulse" }) }) })] }));
};
export default Hero;
