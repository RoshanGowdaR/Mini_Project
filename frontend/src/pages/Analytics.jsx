import { useEffect, useState } from "react";
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
import { Sparkles, TrendingUp } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const parseJsonSafely = async (response, fallback) => {
  try {
    return await response.json();
  } catch {
    return fallback;
  }
};

export default function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [marketTrends, setMarketTrends] = useState(defaultTrendData);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchAnalytics();
  }, [user, navigate]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/ai/market-trends");
      const data = await parseJsonSafely(response, defaultTrendData);

      if (response.ok) {
        setMarketTrends({ ...defaultTrendData, ...data });
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-accent/10">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-8 mt-20">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Trend Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            View Groq-powered artisan market trends, category movement, and top product opportunities.
          </p>
        </div>

        <Card className="border-2 border-primary/20 mb-8 bg-gradient-to-r from-primary/5 to-accent/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Current Artisan Market Trends
            </CardTitle>
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
              <CardTitle>Artisan Market Momentum</CardTitle>
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
                Groq Trending Artisan Products
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
