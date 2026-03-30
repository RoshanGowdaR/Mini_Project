import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from "@/components/ui/card";
import { Globe, Mic, Eye, Sparkles, TrendingUp, Shield } from "lucide-react";
import arImage from "@/assets/ar-showcase.jpg";
import { useTranslation } from "react-i18next";
const features = [
    {
        icon: Eye,
        title: "AR/VR Marketplace",
        description: "Immersive 3D product previews, virtual craft villages, and try-before-you-buy experiences.",
    },
    {
        icon: Mic,
        title: "Voice-First Commerce",
        description: "Multilingual voice search, conversational shopping, and hands-free browsing in 100+ languages.",
    },
    {
        icon: Globe,
        title: "Global Distribution",
        description: "One-click publishing to social platforms, WhatsApp, and international marketplaces.",
    },
    {
        icon: Sparkles,
        title: "Automated Storytelling",
        description: "AI-generated product narratives, promotional content, and brand stories that sell.",
    },
    {
        icon: TrendingUp,
        title: "Trend Intelligence",
        description: "Real-time market analysis, demand forecasting, and pricing optimization.",
    },
    {
        icon: Shield,
        title: "Blockchain Provenance",
        description: "Authenticity certificates, transparent sourcing, and verified artisan credentials.",
    },
];
const Features = () => {
    const { t } = useTranslation();
    return (_jsx("section", { id: "features", className: "py-24 bg-gradient-warm relative overflow-hidden", children: _jsxs("div", { className: "container mx-auto px-4", children: [_jsxs("div", { className: "text-center max-w-3xl mx-auto mb-16", children: [_jsxs("div", { className: "inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect mb-6", children: [_jsx(Sparkles, { className: "w-4 h-4 text-primary" }), _jsx("span", { className: "text-sm font-medium", children: t('nav.features') })] }), _jsx("h2", { className: "text-4xl md:text-5xl font-bold mb-6", children: t('features.title') }), _jsx("p", { className: "text-xl text-muted-foreground", children: t('features.subtitle') })] }), _jsx("div", { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16", children: features.map((feature, index) => (_jsxs(Card, { className: "p-6 bg-card/50 backdrop-blur-sm border-2 hover:border-primary transition-smooth hover:shadow-warm group cursor-pointer", children: [_jsx("div", { className: "w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-bounce shadow-soft", children: _jsx(feature.icon, { className: "w-6 h-6 text-primary-foreground" }) }), _jsx("h3", { className: "text-lg font-bold mb-2 group-hover:text-primary transition-smooth", children: feature.title }), _jsx("p", { className: "text-muted-foreground text-sm leading-relaxed", children: feature.description })] }, index))) }), _jsx("div", { className: "max-w-5xl mx-auto", children: _jsx(Card, { className: "overflow-hidden glass-effect border-2 border-primary/20", children: _jsxs("div", { className: "grid md:grid-cols-2 gap-0", children: [_jsxs("div", { className: "p-8 md:p-12 flex flex-col justify-center", children: [_jsx("h3", { className: "text-3xl font-bold mb-4", children: t('features.arTitle') }), _jsx("p", { className: "text-muted-foreground mb-6", children: t('features.arDescription') }), _jsxs("ul", { className: "space-y-3 text-muted-foreground", children: [_jsxs("li", { className: "flex items-start gap-2", children: [_jsx("span", { className: "text-primary mt-1", children: "\u2713" }), _jsx("span", { children: "360\u00B0 product rotation and zoom" })] }), _jsxs("li", { className: "flex items-start gap-2", children: [_jsx("span", { className: "text-primary mt-1", children: "\u2713" }), _jsx("span", { children: "Virtual try-on for jewelry and accessories" })] }), _jsxs("li", { className: "flex items-start gap-2", children: [_jsx("span", { className: "text-primary mt-1", children: "\u2713" }), _jsx("span", { children: "Scale visualization in real environments" })] }), _jsxs("li", { className: "flex items-start gap-2", children: [_jsx("span", { className: "text-primary mt-1", children: "\u2713" }), _jsx("span", { children: "Virtual craft village tours" })] })] })] }), _jsxs("div", { className: "relative h-96 md:h-auto", children: [_jsx("img", { src: arImage, alt: "AR product visualization", className: "w-full h-full object-cover" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-card/80 md:from-card/0 to-transparent" })] })] }) }) })] }) }));
};
export default Features;
