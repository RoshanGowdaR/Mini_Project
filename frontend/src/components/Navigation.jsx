import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gavel, LogOut, Menu, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import LanguageSelector from "./LanguageSelector";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const closeMenu = () => setIsMenuOpen(false);

  const handleSectionNavigation = (sectionId) => {
    navigate(`/?section=${sectionId}#${sectionId}`);
    closeMenu();
  };

  const [liveAuction, setLiveAuction] = useState(false);

  useEffect(() => {
    const checkLive = async () => {
      try {
        const response = await fetch("/api/auctions");
        const data = await response.json().catch(() => []);
        if (response.ok && Array.isArray(data)) {
          setLiveAuction(data.some((item) => item.status === "live"));
        }
      } catch {
        setLiveAuction(false);
      }
    };

    checkLive();
  }, []);

  const navItems = [
    {
      label: t("nav.features"),
      onClick: () => handleSectionNavigation("features"),
    },
    {
      label: t("nav.aiAgents"),
      onClick: () => handleSectionNavigation("agents"),
    },
    {
      label: t("nav.marketplace"),
      onClick: () => {
        navigate("/marketplace");
        closeMenu();
      },
    },
    {
      label: "Auctions",
      onClick: () => {
        navigate("/auctions");
        closeMenu();
      },
      icon: <Gavel className="w-4 h-4" />,
    },
  ];

  if (user) {
    navItems.push(
      {
        label: "Trend Analytics",
        onClick: () => {
          navigate("/analytics");
          closeMenu();
        },
      },
      {
        label: "Profile",
        onClick: () => {
          navigate("/profile");
          closeMenu();
        },
      }
    );
    if (user.role === "artisan") {
      navItems.push({
        label: "My Orders",
        onClick: () => {
          navigate("/artisan/orders");
          closeMenu();
        },
      });
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-warm">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-gradient">Ophelia AI</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="text-foreground hover:text-primary transition-smooth font-medium flex items-center gap-2"
              >
                {item.icon}
                {item.label}
                {item.label === "Auctions" && liveAuction && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <LanguageSelector />
            {user ? (
              <>
                <span className="text-sm text-muted-foreground">{user.email}</span>
                <Button variant="ghost" onClick={() => navigate("/profile")}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Button>
                <Button variant="ghost" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("nav.signOut")}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")}>
                  {t("nav.signIn")}
                </Button>
                <Button variant="hero" onClick={() => navigate("/auth")}>
                  {t("nav.joinNow")}
                </Button>
              </>
            )}
          </div>

          <button className="md:hidden p-2 rounded-lg hover:bg-accent transition-smooth" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50">
            <div className="flex flex-col gap-4">
              <LanguageSelector />
              {navItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className="text-left text-foreground hover:text-primary transition-smooth font-medium py-2 flex items-center gap-2"
                >
                  {item.icon}
                  {item.label}
                  {item.label === "Auctions" && liveAuction && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                  )}
                </button>
              ))}

              <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
                {user ? (
                  <>
                    <div className="text-sm text-muted-foreground py-2">{user.email}</div>
                    <Button variant="ghost" className="w-full" onClick={() => { navigate("/profile"); closeMenu(); }}>
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Button>
                    <Button variant="ghost" className="w-full" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      {t("nav.signOut")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" className="w-full" onClick={() => navigate("/auth")}>
                      {t("nav.signIn")}
                    </Button>
                    <Button variant="hero" className="w-full" onClick={() => navigate("/auth")}>
                      {t("nav.joinNow")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
