import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RefreshCw, Sparkles, TrendingUp } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useMarketTrends } from "@/hooks/useMarketTrends";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const COLORS = ["#8B4513", "#D2691E", "#CD853F", "#DEB887", "#F4A460"];

const defaultTrendData = {
  summary: "",
  market_signal: "",
  trending_categories: [],
  buyer_opportunities: [],
  recommended_actions: [],
  monthly_trend: [],
  category_share: [],
  trending_products: [],
};

export default function Analytics() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: marketTrends, isRefreshing, lastUpdated, refresh } = useMarketTrends(defaultTrendData);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    setFadeIn(false);
    const timeoutId = setTimeout(() => setFadeIn(true), 10);
    return () => clearTimeout(timeoutId);
  }, [marketTrends]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return "Last updated: never";
    const minutesAgo = Math.floor((Date.now() - lastUpdated) / 60000);
    if (minutesAgo <= 1) return "Last updated: just now";
    return `Last updated: ${minutesAgo} minutes ago`;
  }, [lastUpdated]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-accent/10">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-8 mt-20">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Trend Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            View Groq-powered real-world art market trends, category movement, and top product opportunities.
          </p>
        </div>

        <Card className={`border-2 border-primary/20 mb-8 bg-gradient-to-r from-primary/5 to-accent/10 transition-opacity duration-300 ${fadeIn ? "opacity-100" : "opacity-0"}`}>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Current Art Market Trends
              </CardTitle>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>{lastUpdatedLabel}</span>
                <Button type="button" variant="hero" className="h-9 px-4" onClick={refresh} disabled={isRefreshing}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Analytics
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Market Summary</p>
              <p className="text-base">{marketTrends.summary || "Waiting for Groq market insights..."}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Market Signal</p>
              <p className="text-base">{marketTrends.market_signal || "No signal available yet."}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Trending Categories</h3>
                <ul className="space-y-2 text-sm">
                  {(marketTrends.trending_categories || []).map((item) => (
                    <li key={item} className="rounded-md bg-card px-3 py-2 border">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Buyer Opportunities</h3>
                <ul className="space-y-2 text-sm">
                  {(marketTrends.buyer_opportunities || []).map((item) => (
                    <li key={item} className="rounded-md bg-card px-3 py-2 border">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Recommended Actions</h3>
                <ul className="space-y-2 text-sm">
                  {(marketTrends.recommended_actions || []).map((item) => (
                    <li key={item} className="rounded-md bg-card px-3 py-2 border">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle>Global Art Market Momentum</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={marketTrends.monthly_trend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#8B4513" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle>Market Category Share</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={marketTrends.category_share || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {(marketTrends.category_share || []).map((entry, index) => (
                      <Cell key={entry.name || index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Groq Trending Art Market Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={marketTrends.trending_products || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="score" fill="#D2691E" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
