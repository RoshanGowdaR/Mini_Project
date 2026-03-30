import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Shield, CheckCircle, Calendar, User, Hash, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
const VerificationBadge = ({ certificateHash, issueDate, artisanName, productTitle, isActive = true, size = "md", showDetails = true, }) => {
    const [isOpen, setIsOpen] = useState(false);
    if (!certificateHash) {
        return null;
    }
    const sizeClasses = {
        sm: "text-xs py-1 px-2",
        md: "text-sm py-1.5 px-3",
        lg: "text-base py-2 px-4",
    };
    const iconSizes = {
        sm: "w-3 h-3",
        md: "w-4 h-4",
        lg: "w-5 h-5",
    };
    const formatDate = (date) => {
        if (!date)
            return "N/A";
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };
    const truncateHash = (hash) => {
        return `${hash.substring(0, 15)}...${hash.substring(hash.length - 8)}`;
    };
    const BadgeContent = () => (_jsxs(Badge, { variant: "secondary", className: `gap-1.5 glass-effect cursor-pointer hover:scale-105 transition-smooth ${isActive
            ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/40"
            : "bg-muted"} ${sizeClasses[size]}`, children: [_jsx(Shield, { className: `${iconSizes[size]} ${isActive ? "text-green-500" : "text-muted-foreground"}` }), _jsx("span", { className: "font-semibold", children: "Ophelia Certified" })] }));
    if (!showDetails) {
        return _jsx(BadgeContent, {});
    }
    return (_jsxs(Dialog, { open: isOpen, onOpenChange: setIsOpen, children: [_jsx(DialogTrigger, { asChild: true, children: _jsx("div", { className: "inline-block", children: _jsx(BadgeContent, {}) }) }), _jsxs(DialogContent, { className: "max-w-2xl", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-3 text-2xl", children: [_jsx(Award, { className: "w-8 h-8 text-primary" }), "Certificate of Authenticity"] }), _jsx(DialogDescription, { children: "This product has been verified and certified by Ophelia" })] }), _jsxs("div", { className: "space-y-6 mt-4", children: [_jsxs(Card, { className: "p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30", children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx(CheckCircle, { className: "w-6 h-6 text-green-500" }), _jsxs("div", { children: [_jsx("h3", { className: "font-bold text-lg", children: "Verified Authentic" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "This craft has passed all authenticity and originality checks" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4 mt-4 text-sm", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CheckCircle, { className: "w-4 h-4 text-green-500" }), _jsx("span", { children: "Original Design" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CheckCircle, { className: "w-4 h-4 text-green-500" }), _jsx("span", { children: "Copyright Verified" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CheckCircle, { className: "w-4 h-4 text-green-500" }), _jsx("span", { children: "Artisan Verified" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CheckCircle, { className: "w-4 h-4 text-green-500" }), _jsx("span", { children: "Quality Assured" })] })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-start gap-3 p-4 rounded-lg bg-muted", children: [_jsx(Hash, { className: "w-5 h-5 text-primary mt-0.5 flex-shrink-0" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-sm font-medium text-muted-foreground mb-1", children: "Certificate ID" }), _jsx("div", { className: "font-mono text-sm break-all", children: certificateHash })] })] }), productTitle && (_jsxs("div", { className: "flex items-start gap-3 p-4 rounded-lg bg-muted", children: [_jsx(Award, { className: "w-5 h-5 text-primary mt-0.5 flex-shrink-0" }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-sm font-medium text-muted-foreground mb-1", children: "Product" }), _jsx("div", { className: "font-medium", children: productTitle })] })] })), artisanName && (_jsxs("div", { className: "flex items-start gap-3 p-4 rounded-lg bg-muted", children: [_jsx(User, { className: "w-5 h-5 text-primary mt-0.5 flex-shrink-0" }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-sm font-medium text-muted-foreground mb-1", children: "Certified Artisan" }), _jsx("div", { className: "font-medium", children: artisanName })] })] })), issueDate && (_jsxs("div", { className: "flex items-start gap-3 p-4 rounded-lg bg-muted", children: [_jsx(Calendar, { className: "w-5 h-5 text-primary mt-0.5 flex-shrink-0" }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-sm font-medium text-muted-foreground mb-1", children: "Issue Date" }), _jsx("div", { className: "font-medium", children: formatDate(issueDate) })] })] }))] }), _jsx(Card, { className: "p-4 bg-primary/5 border-primary/20", children: _jsxs("div", { className: "flex gap-3", children: [_jsx(Shield, { className: "w-5 h-5 text-primary flex-shrink-0" }), _jsxs("div", { className: "text-sm", children: [_jsx("p", { className: "font-medium mb-1", children: "Tamper-Proof Certificate" }), _jsx("p", { className: "text-muted-foreground", children: "This certificate uses cryptographic hashing to ensure authenticity. Each certificate is unique and cannot be forged or duplicated." })] })] }) }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { variant: "outline", className: "flex-1", onClick: () => setIsOpen(false), children: "Close" }), _jsxs(Button, { variant: "hero", className: "flex-1", children: [_jsx(Shield, { className: "w-4 h-4 mr-2" }), "Verify Certificate"] })] })] })] })] }));
};
export default VerificationBadge;
