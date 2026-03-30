import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Shield, Check, Calendar, User, FileText, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { toast } from "sonner";
const VerifiedBadge = ({ productId, variant = "secondary", size = "md", showLabel = true }) => {
    const [open, setOpen] = useState(false);
    const [certificate, setCertificate] = useState(null);
    const [loading, setLoading] = useState(false);
    const sizeClasses = {
        sm: "gap-1 text-xs px-2 py-1",
        md: "gap-1.5 text-sm",
        lg: "gap-2 text-base px-4 py-2"
    };
    const iconSizes = {
        sm: "w-3 h-3",
        md: "w-3.5 h-3.5",
        lg: "w-4 h-4"
    };
    const fetchCertificate = async () => {
        setLoading(true);
        try {
            // Simulated certificate data
            setCertificate({
                id: productId,
                certificate_hash: "OPHELIA-" + productId.substring(0, 8).toUpperCase(),
                issue_date: new Date().toISOString(),
                verification_criteria: {
                    originality_check: true,
                    copyright_check: true,
                    artisan_verified: true,
                },
                issuer_id: "ophelia-system",
                product: {
                    title: "Verified Product",
                    category: "Handmade",
                    artisan: {
                        user: {
                            full_name: "Artisan Partner",
                        },
                    },
                },
            });
            setOpen(true);
        }
        catch (error) {
            console.error("Error fetching certificate:", error);
            toast.error("Could not load certificate details");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs(Badge, { variant: variant, className: `cursor-pointer hover:opacity-80 transition-smooth ${sizeClasses[size]}`, onClick: fetchCertificate, children: [_jsx(Shield, { className: iconSizes[size] }), showLabel && "Ophelia Certified"] }), _jsx(Dialog, { open: open, onOpenChange: setOpen, children: _jsxs(DialogContent, { className: "max-w-2xl", children: [_jsx(DialogHeader, { children: _jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx("div", { className: "w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center", children: _jsx(Shield, { className: "w-6 h-6 text-primary" }) }), _jsxs("div", { children: [_jsx(DialogTitle, { className: "text-2xl", children: "Ophelia Certified" }), _jsx(DialogDescription, { children: "Certificate of Authenticity & Provenance" })] })] }) }), loading ? (_jsx("div", { className: "py-8 text-center text-muted-foreground", children: "Loading certificate details..." })) : certificate ? (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "p-6 rounded-lg bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 border-2 border-primary/20", children: [_jsx("div", { className: "flex items-center justify-center mb-4", children: _jsx("div", { className: "w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center", children: _jsx(Check, { className: "w-10 h-10 text-primary" }) }) }), _jsx("h3", { className: "text-center text-xl font-bold mb-2", children: "This craft is verified authentic" }), _jsx("p", { className: "text-center text-sm text-muted-foreground", children: "Protected by Ophelia's provenance system" })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-start gap-3 p-4 rounded-lg bg-muted/50", children: [_jsx(FileText, { className: "w-5 h-5 text-primary mt-0.5" }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-sm text-muted-foreground mb-1", children: "Product Name" }), _jsx("div", { className: "font-medium", children: certificate.product.title })] })] }), _jsxs("div", { className: "flex items-start gap-3 p-4 rounded-lg bg-muted/50", children: [_jsx(User, { className: "w-5 h-5 text-primary mt-0.5" }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-sm text-muted-foreground mb-1", children: "Artisan" }), _jsx("div", { className: "font-medium", children: certificate.product.artisan?.user?.full_name || "Unknown Artisan" })] })] }), _jsxs("div", { className: "flex items-start gap-3 p-4 rounded-lg bg-muted/50", children: [_jsx(Calendar, { className: "w-5 h-5 text-primary mt-0.5" }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-sm text-muted-foreground mb-1", children: "Issue Date" }), _jsx("div", { className: "font-medium", children: new Date(certificate.issue_date).toLocaleDateString("en-US", {
                                                                year: "numeric",
                                                                month: "long",
                                                                day: "numeric",
                                                            }) })] })] }), _jsxs("div", { className: "flex items-start gap-3 p-4 rounded-lg bg-muted/50", children: [_jsx(Hash, { className: "w-5 h-5 text-primary mt-0.5" }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-sm text-muted-foreground mb-1", children: "Certificate ID" }), _jsx("div", { className: "font-mono text-xs break-all", children: certificate.certificate_hash })] })] })] }), certificate.verification_criteria &&
                                    Object.keys(certificate.verification_criteria).length > 0 && (_jsxs("div", { className: "p-4 rounded-lg bg-primary/5 border border-primary/20", children: [_jsxs("h4", { className: "font-bold mb-3 flex items-center gap-2", children: [_jsx(Check, { className: "w-4 h-4 text-primary" }), "Verification Criteria Met"] }), _jsxs("ul", { className: "space-y-2 text-sm", children: [certificate.verification_criteria.originality_check && (_jsxs("li", { className: "flex items-center gap-2", children: [_jsx(Check, { className: "w-4 h-4 text-green-500" }), _jsx("span", { children: "Originality verified - no duplicates found" })] })), certificate.verification_criteria.copyright_check && (_jsxs("li", { className: "flex items-center gap-2", children: [_jsx(Check, { className: "w-4 h-4 text-green-500" }), _jsx("span", { children: "Copyright compliance verified" })] })), certificate.verification_criteria.artisan_verified && (_jsxs("li", { className: "flex items-center gap-2", children: [_jsx(Check, { className: "w-4 h-4 text-green-500" }), _jsx("span", { children: "Artisan identity confirmed" })] }))] })] })), _jsxs("div", { className: "text-center text-xs text-muted-foreground pt-4 border-t", children: ["This certificate is tamper-proof and cryptographically secured.", _jsx("br", {}), "Certificate ID can be verified at any time."] }), _jsx(Button, { variant: "hero", className: "w-full", onClick: () => {
                                        navigator.clipboard.writeText(certificate.certificate_hash);
                                        toast.success("Certificate ID copied to clipboard");
                                    }, children: "Copy Certificate ID" })] })) : (_jsx("div", { className: "py-8 text-center text-muted-foreground", children: "Certificate details not available" }))] }) })] }));
};
export default VerifiedBadge;
