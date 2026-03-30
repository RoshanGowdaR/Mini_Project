import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from "@/components/ui/card";
import { Brain, TrendingUp, Palette, Users, MessageSquare, Shield } from "lucide-react";
import aiAgentsImage from "@/assets/ai-agents-visual.jpg";
const agents = [
    {
        icon: Brain,
        title: "Analytics Agent",
        description: "Real-time market insights, trend detection, and data-driven recommendations for optimal pricing and positioning.",
    },
    {
        icon: TrendingUp,
        title: "Marketing Agent",
        description: "Automated campaign generation, social media management, and multi-channel distribution with AI-powered content.",
    },
    {
        icon: Palette,
        title: "Creative Agent",
        description: "Auto-generate product stories, promotional materials, images, and videos that showcase your craft's uniqueness.",
    },
    {
        icon: Users,
        title: "Mentoring Agent",
        description: "Personalized guidance for artisans, skill development suggestions, and business growth strategies.",
    },
    {
        icon: MessageSquare,
        title: "Customer Engagement",
        description: "Multilingual chatbot support, voice commerce, and emotion-aware interactions for seamless customer experience.",
    },
    {
        icon: Shield,
        title: "Provenance Agent",
        description: "Blockchain-powered authenticity tracking, transparency badges, and trust-building visual storytelling.",
    },
];
const AIAgents = () => {
    return (_jsxs("section", { id: "agents", className: "py-24 relative overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 z-0 opacity-10", children: _jsx("img", { src: aiAgentsImage, alt: "", className: "w-full h-full object-cover" }) }), _jsxs("div", { className: "container mx-auto px-4 relative z-10", children: [_jsxs("div", { className: "text-center max-w-3xl mx-auto mb-16", children: [_jsxs("div", { className: "inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect mb-6", children: [_jsx(Brain, { className: "w-4 h-4 text-primary" }), _jsx("span", { className: "text-sm font-medium", children: "Multi-Agent AI System" })] }), _jsxs("h2", { className: "text-4xl md:text-5xl font-bold mb-6", children: ["Six Intelligent Agents", _jsx("br", {}), _jsx("span", { className: "text-gradient", children: "Working for Your Success" })] }), _jsx("p", { className: "text-xl text-muted-foreground", children: "Our AI agents work 24/7 to market your products, analyze trends, engage customers, and grow your artisan business globally." })] }), _jsx("div", { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-6", children: agents.map((agent, index) => (_jsxs(Card, { className: "p-6 glass-effect border-2 hover:border-primary transition-smooth hover:shadow-warm group cursor-pointer", children: [_jsx("div", { className: "w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-bounce shadow-warm", children: _jsx(agent.icon, { className: "w-7 h-7 text-primary-foreground" }) }), _jsx("h3", { className: "text-xl font-bold mb-3 group-hover:text-primary transition-smooth", children: agent.title }), _jsx("p", { className: "text-muted-foreground leading-relaxed", children: agent.description })] }, index))) }), _jsx("div", { className: "mt-16 p-8 rounded-2xl glass-effect border-2 border-primary/20", children: _jsxs("div", { className: "grid md:grid-cols-2 gap-8 items-center", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-2xl font-bold mb-4", children: "Autonomous & Collaborative" }), _jsx("p", { className: "text-muted-foreground mb-4", children: "Our agents don't just work independently\u2014they collaborate with each other, sharing insights and coordinating actions to maximize your success." }), _jsxs("ul", { className: "space-y-2 text-muted-foreground", children: [_jsxs("li", { className: "flex items-start gap-2", children: [_jsx("span", { className: "text-primary mt-1", children: "\u2713" }), _jsx("span", { children: "Real-time data synchronization across all agents" })] }), _jsxs("li", { className: "flex items-start gap-2", children: [_jsx("span", { className: "text-primary mt-1", children: "\u2713" }), _jsx("span", { children: "Continuous learning from market feedback" })] }), _jsxs("li", { className: "flex items-start gap-2", children: [_jsx("span", { className: "text-primary mt-1", children: "\u2713" }), _jsx("span", { children: "Automated optimization without manual intervention" })] })] })] }), _jsxs("div", { className: "relative h-64 rounded-xl overflow-hidden shadow-warm", children: [_jsx("img", { src: aiAgentsImage, alt: "AI technology visualization", className: "w-full h-full object-cover" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" })] })] }) })] })] }));
};
export default AIAgents;
