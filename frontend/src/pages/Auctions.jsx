import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Gavel, Users, Trophy } from "lucide-react";
import { toast } from "sonner";

import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

const Auctions = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const response = await fetch("/api/auctions");
        const data = await response.json().catch(() => []);
        setAuctions(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error("Failed to load auctions");
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();
  }, []);

  const grouped = useMemo(() => {
    const live = auctions.filter((item) => item.status === "live");
    const scheduled = auctions.filter((item) => item.status === "scheduled");
    const ended = auctions.filter((item) => item.status === "ended");
    return { live, scheduled, ended };
  }, [auctions]);

  const formatCountdown = (target) => {
    if (!target) return "TBD";
    const diff = new Date(target).getTime() - now;
    if (diff <= 0) return "Starting now";
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 pt-28 space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-4 pt-28 pb-16 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-warm">
            <Gavel className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Live & Upcoming Auctions</h1>
            <p className="text-muted-foreground">Bid on one-of-a-kind artisan pieces in real time.</p>
          </div>
        </div>

        {/* Live Now */}
        {grouped.live.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <h2 className="text-xl font-semibold">Live Now</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {grouped.live.map((auction) => (
                <Card key={auction.id} className="p-5 border-2 border-red-400/40 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{auction.title}</h3>
                      {auction.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{auction.description}</p>
                      )}
                    </div>
                    <span className="flex items-center gap-2 text-red-500 font-semibold text-sm bg-red-50 px-2 py-1 rounded-full shrink-0 ml-3">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                      LIVE
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Gavel className="w-4 h-4" />
                      Current: ₹{Number(auction.current_bid || auction.starting_bid).toLocaleString()}
                    </span>
                    {auction.current_winner_name && (
                      <span className="text-xs">Leader: {auction.current_winner_name}</span>
                    )}
                  </div>
                  <Button className="w-full" onClick={() => navigate(`/auctions/${auction.id}`)}>
                    Join Auction
                  </Button>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming — Registration Open */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="text-xl font-semibold">Upcoming — Registration Open</h2>
          </div>
          {grouped.scheduled.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">No upcoming auctions right now. Check back soon!</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {grouped.scheduled.map((auction) => (
                <Card key={auction.id} className="p-5 border-2 border-amber-400/30 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{auction.title}</h3>
                      {auction.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{auction.description}</p>
                      )}
                    </div>
                    <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-1 rounded-full shrink-0 ml-3">
                      Registration Open
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Gavel className="w-4 h-4" />
                      Starts at ₹{Number(auction.starting_bid).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatCountdown(auction.scheduled_start)}
                    </span>
                  </div>
                  <Button variant="hero" className="w-full" onClick={() => navigate(`/auctions/${auction.id}`)}>
                    <Users className="w-4 h-4 mr-2" />
                    Register Now
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Past Auctions */}
        {grouped.ended.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-slate-500" />
              <h2 className="text-xl font-semibold">Past Auctions</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {grouped.ended.map((auction) => (
                <Card key={auction.id} className="p-5 opacity-80">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{auction.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {auction.current_winner_name
                          ? `Won by ${auction.current_winner_name} — ₹${Number(auction.current_bid || 0).toLocaleString()}`
                          : "No bids"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ended: {auction.actual_end ? new Date(auction.actual_end).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-1 rounded-full">Ended</span>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Auctions;
