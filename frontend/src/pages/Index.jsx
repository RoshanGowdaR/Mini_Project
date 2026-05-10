import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import AIAgents from "@/components/AIAgents";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const requestedSection = searchParams.get("section");
    const hasSectionIntent = Boolean(location.hash || requestedSection);

    if (!loading && user && !hasSectionIntent) {
      if (user.role === "artisan") {
        navigate("/artisan-dashboard?tab=trending");
      } else {
        navigate("/marketplace");
      }
    }
  }, [user, loading, navigate, location.hash, location.search]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const requestedSection = searchParams.get("section");
    const targetId = location.hash?.replace("#", "") || requestedSection;

    if (!targetId) {
      return;
    }

    const scrollToSection = () => {
      const section = document.getElementById(targetId);
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    const timeoutId = window.setTimeout(scrollToSection, 150);
    return () => window.clearTimeout(timeoutId);
  }, [location.hash, location.search]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navigation />
      <Hero />
      <Features />
      <AIAgents />
      <CallToAction />
      <Footer />
    </div>
  );
};

export default Index;
