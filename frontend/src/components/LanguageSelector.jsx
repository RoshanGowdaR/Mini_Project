import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
const languages = [
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "hi", name: "हिंदी", flag: "🇮🇳" },
    { code: "kn", name: "ಕನ್ನಡ", flag: "🇮🇳" },
    { code: "ta", name: "தமிழ்", flag: "🇮🇳" },
];
const LanguageSelector = () => {
    const { i18n } = useTranslation();
    const handleLanguageChange = (langCode) => {
        i18n.changeLanguage(langCode);
    };
    const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];
    return (_jsxs(Select, { value: i18n.language, onValueChange: handleLanguageChange, children: [_jsxs(SelectTrigger, { className: "w-[140px] bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background transition-smooth", children: [_jsx(Globe, { className: "w-4 h-4 mr-2" }), _jsx(SelectValue, { children: _jsxs("span", { className: "flex items-center gap-2", children: [_jsx("span", { children: currentLanguage.flag }), _jsx("span", { className: "hidden sm:inline", children: currentLanguage.name })] }) })] }), _jsx(SelectContent, { className: "bg-card/95 backdrop-blur-xl border-border/50", children: languages.map((lang) => (_jsx(SelectItem, { value: lang.code, className: "cursor-pointer hover:bg-accent/50 transition-smooth", children: _jsxs("span", { className: "flex items-center gap-2", children: [_jsx("span", { children: lang.flag }), _jsx("span", { children: lang.name })] }) }, lang.code))) })] }));
};
export default LanguageSelector;
