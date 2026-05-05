import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Clock, Gavel, ShieldCheck, Users, Trophy, Lock } from "lucide-react";

import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const playBidSound = () => {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
};

const AuctionRoom = () => {
  const { auction_id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [registered, setRegistered] = useState(false);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [acceptsRegistration, setAcceptsRegistration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [now, setNow] = useState(Date.now());
  const [newBidIds, setNewBidIds] = useState(() => new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  const prevStatusRef = useRef(null);

  const confettiPieces = useMemo(
    () => Array.from({ length: 24 }, (_, index) => ({
      id: index,
      left: `${(index * 4 + 6) % 100}%`,
      delay: `${(index % 6) * 0.15}s`,
      duration: `${2.2 + (index % 5) * 0.2}s`,
    })),
    []
  );

  // Removed auth redirect from here so unauthenticated users can view the room

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAuction = async () => {
    try {
      const response = await fetch(`/api/auctions/${auction_id}`);
      const data = await response.json();
      setAuction(data.auction);
      setBids(data.bids || []);
      setRegistrationCount(data.registration_count || 0);
      setAcceptsRegistration(Boolean(data.accepts_registration));
      setNewBidIds(new Set());
      const token = JSON.parse(localStorage.getItem("auth") || "{}").token;
      if (token) {
        const regResponse = await fetch(`/api/auctions/${auction_id}/registrations/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const regData = await regResponse.json();
        setRegistered(Boolean(regData.registered));
      }
    } catch (error) {
      toast.error("Failed to load auction");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuction();
  }, [auction_id]);

  // Polling fallback: re-fetch auction every 5s when live (in case realtime fails)
  useEffect(() => {
    if (!auction || auction.status !== "live") return undefined;
    const interval = setInterval(() => {
      fetchAuction();
    }, 5000);
    return () => clearInterval(interval);
  }, [auction?.status, auction_id]);

  useEffect(() => {
    const previousStatus = prevStatusRef.current;
    prevStatusRef.current = auction?.status || null;

    if (auction?.status === "ended" && previousStatus !== "ended") {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [auction?.status]);

  // When auction goes from scheduled to live via realtime, close registration
  useEffect(() => {
    if (auction?.status === "live") {
      setAcceptsRegistration(false);
    }
  }, [auction?.status]);

  useEffect(() => {
    if (!auction_id) return undefined;

    const channel = supabase
      .channel(`auction-${auction_id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "auction_items", filter: `id=eq.${auction_id}` },
        (payload) => {
          setAuction((prev) => ({ ...prev, ...payload.new }));
          if (payload.new.status === "ended") {
            toast.info("Auction ended");
          }
          if (payload.new.status === "live") {
            toast.info("Auction is now live!");
            setAcceptsRegistration(false);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "auction_bids", filter: `auction_id=eq.${auction_id}` },
        (payload) => {
          setBids((prev) => [payload.new, ...prev]);
          playBidSound();
          if (payload.new?.id) {
            setNewBidIds((prev) => {
              const next = new Set(prev);
              next.add(payload.new.id);
              return next;
            });
            setTimeout(() => {
              setNewBidIds((prev) => {
                const next = new Set(prev);
                next.delete(payload.new.id);
                return next;
              });
            }, 1600);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auction_id]);

  const handleRegister = async () => {
    if (!user) {
      toast.error("Please sign in to register for auctions.");
      navigate("/auth");
      return;
    }
    try {
      setRegistering(true);
      const token = JSON.parse(localStorage.getItem("auth") || "{}").token;
      const response = await fetch(`/api/auctions/${auction_id}/register`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || data.error || "Registration failed");
      }
      setRegistered(true);
      setRegistrationCount((prev) => prev + 1);
      toast.success("You're registered for this auction!");
    } catch (error) {
      toast.error(error.message || "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  const handleBid = async () => {
    try {
      const token = JSON.parse(localStorage.getItem("auth") || "{}").token;
      const response = await fetch(`/api/auctions/${auction_id}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: Number(bidAmount) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || data.error || "Bid failed");
      }
      setBidAmount("");
      // Optimistic update: immediately reflect the new bid in UI
      const newAmount = Number(bidAmount);
      setAuction((prev) => ({
        ...prev,
        current_bid: newAmount,
        current_winner_name: data.bidder_name || user?.email || "You",
        current_winner_id: user?.id,
      }));
      toast.success("Bid placed!");
      // Also re-fetch to get accurate server state
      fetchAuction();
    } catch (error) {
      toast.error(error.message || "Bid failed");
    }
  };

  const countdownLabel = useMemo(() => {
    if (!auction) return "";
    const target = auction.status === "scheduled" ? auction.scheduled_start : auction.scheduled_end;
    if (!target) return "";
    const diff = new Date(target).getTime() - now;
    if (diff <= 0) return auction.status === "scheduled" ? "Starting soon..." : "Ending...";
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  }, [auction, now]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 pt-28 space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 pt-28 text-center">
          <Card className="p-8 max-w-lg mx-auto">
            <h2 className="text-2xl font-semibold mb-2">Auction not found</h2>
            <p className="text-muted-foreground mb-4">This auction may have been removed or doesn't exist.</p>
            <Button onClick={() => navigate("/auctions")}>Back to Auctions</Button>
          </Card>
        </div>
      </div>
    );
  }

  const isLive = auction.status === "live";
  const isScheduled = auction.status === "scheduled";
  const isEnded = auction.status === "ended";
  const currentBid = auction.current_bid || auction.starting_bid || 0;

  return (
    <div className="min-h-screen">
      {showConfetti && (
        <div className="confetti-overlay">
          {confettiPieces.map((piece) => (
            <span
              key={piece.id}
              className="confetti-piece"
              style={{ left: piece.left, animationDelay: piece.delay, animationDuration: piece.duration }}
            />
          ))}
        </div>
      )}
      <Navigation />
      <div className="container mx-auto px-4 pt-28 pb-16">

        {/* ─── SCHEDULED: Not Registered ─── */}
        {isScheduled && !registered && (
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="p-8 text-center border-2 border-amber-400/30 bg-amber-50/5">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-amber-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">{auction.title}</h2>
              {auction.description && (
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">{auction.description}</p>
              )}
              {auction.images?.[0] && (
                <img src={auction.images[0]} alt={auction.title} className="rounded-xl w-full max-w-sm mx-auto mb-4 shadow-lg" />
              )}
              <div className="flex items-center justify-center gap-6 mb-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Gavel className="w-4 h-4" />
                  Starting bid: ₹{Number(auction.starting_bid).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {registrationCount} registered
                </span>
              </div>
              {countdownLabel && (
                <p className="text-sm text-amber-600 font-medium mb-4">
                  Auction starts in {countdownLabel}
                </p>
              )}
              <p className="text-muted-foreground text-sm mb-6">
                Register now to participate in the live bidding once the auction goes live. Registration will close when the auction starts.
              </p>
              <Button
                size="lg"
                variant="hero"
                onClick={handleRegister}
                disabled={registering}
                className="min-w-[200px]"
              >
                {registering ? "Registering..." : "Register for Auction"}
              </Button>
            </Card>
          </div>
        )}

        {/* ─── SCHEDULED: Registered ─── */}
        {isScheduled && registered && (
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="p-8 text-center border-2 border-emerald-400/30 bg-emerald-50/5">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">You're Registered!</h2>
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">{auction.title}</h3>
              {auction.images?.[0] && (
                <img src={auction.images[0]} alt={auction.title} className="rounded-xl w-full max-w-sm mx-auto mb-4 shadow-lg" />
              )}
              <div className="flex items-center justify-center gap-6 mb-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Gavel className="w-4 h-4" />
                  Starting bid: ₹{Number(auction.starting_bid).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {registrationCount} registered
                </span>
              </div>
              {countdownLabel && (
                <p className="text-sm text-emerald-600 font-medium mb-2">
                  Auction starts in {countdownLabel}
                </p>
              )}
              <p className="text-muted-foreground text-sm">
                You'll be able to place bids once the admin starts the live auction. Stay on this page — it will update in real time.
              </p>
            </Card>
          </div>
        )}

        {/* ─── LIVE: Not Registered (View Only) ─── */}
        {isLive && !registered && (
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="p-8 text-center border-2 border-red-400/30 bg-red-50/5">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <span className="text-red-500 font-semibold text-lg">LIVE</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">{auction.title}</h2>
              <p className="text-muted-foreground mb-4">
                Registration is closed. Only users who registered before the auction went live can participate in bidding.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <div className="text-sm text-muted-foreground">Current Bid</div>
                <div className="text-3xl font-bold text-primary">₹{Number(currentBid).toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Leader: {auction.current_winner_name || "No bids yet"}</div>
              </div>
              <p className="text-xs text-muted-foreground">
                {registrationCount} participants registered • {bids.length} bids placed
              </p>
            </Card>
          </div>
        )}

        {/* ─── LIVE: Registered (Full Bidding UI) ─── */}
        {isLive && registered && (
          <div className="space-y-6">
            {/* Live header bar */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <h1 className="text-2xl font-bold">{auction.title}</h1>
                <span className="text-red-500 font-semibold text-sm bg-red-100 px-2 py-0.5 rounded-full">LIVE</span>
              </div>
              {countdownLabel && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Time remaining: {countdownLabel}
                </span>
              )}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left: Product info */}
              <div className="space-y-4">
                {auction.images?.[0] && (
                  <img src={auction.images[0]} alt={auction.title} className="rounded-xl w-full shadow-lg" />
                )}
                {auction.description && (
                  <p className="text-muted-foreground">{auction.description}</p>
                )}
                {auction.story && (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-1">Artisan Story</h4>
                    <p className="text-sm text-muted-foreground">{auction.story}</p>
                  </div>
                )}
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {registrationCount} participants
                  </span>
                  <span className="flex items-center gap-1">
                    <Gavel className="w-4 h-4" />
                    {bids.length} bids
                  </span>
                </div>
              </div>

              {/* Right: Bidding panel */}
              <div className="space-y-4">
                <Card className="p-6 border-2 border-primary/20">
                  <div className="text-sm text-muted-foreground mb-1">Current Bid</div>
                  <div className="text-4xl font-bold text-primary mb-1">₹{Number(currentBid).toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">
                    Leader: {auction.current_winner_name || "No bids yet"}
                  </div>
                </Card>

                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder={`Min: ₹${(Number(currentBid) + 1).toLocaleString()}`}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    min={Number(currentBid) + 1}
                    className="text-lg"
                  />
                  <Button
                    size="lg"
                    variant="hero"
                    onClick={handleBid}
                    disabled={!bidAmount || Number(bidAmount) <= Number(currentBid)}
                  >
                    <Gavel className="w-4 h-4 mr-2" />
                    Place Bid
                  </Button>
                </div>

                <Card className="p-4 max-h-80 overflow-auto">
                  <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Gavel className="w-4 h-4" />
                    Bid History
                  </div>
                  {bids.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No bids yet. Be the first!</p>
                  ) : (
                    <div className="space-y-2">
                      {bids.map((bid) => (
                        <div
                          key={bid.id}
                          className={`bid-entry ${newBidIds.has(bid.id) ? "bid-entry--new" : ""} text-sm flex items-center justify-between p-2 rounded-lg ${bid.bidder_id === user?.id ? "bg-amber-50 border border-amber-200" : "bg-muted/30"}`}
                        >
                          <span className={bid.bidder_id === user?.id ? "text-amber-700 font-medium" : "text-muted-foreground"}>
                            {bid.bidder_name}
                          </span>
                          <span className="font-semibold">₹{Number(bid.amount).toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(bid.placed_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ─── ENDED ─── */}
        {isEnded && (
          <div className="max-w-3xl mx-auto">
            <Card className="p-8 text-center border-2 border-slate-300/30">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-amber-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Auction Ended</h2>
              <h3 className="text-lg font-semibold text-muted-foreground mb-4">{auction.title}</h3>
              {auction.current_winner_name ? (
                <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-lg p-6 mb-4">
                  <div className="text-sm text-muted-foreground mb-1">Winner</div>
                  <div className="text-xl font-bold text-amber-700">{auction.current_winner_name}</div>
                  <div className="text-2xl font-bold text-primary mt-1">₹{Number(currentBid).toLocaleString()}</div>
                  {auction.winner_email && (
                     <div className="mt-4 pt-4 border-t border-amber-200">
                       <p className="text-sm text-amber-800 font-medium mb-1">Winner Contact:</p>
                       <p className="text-sm">{auction.winner_email}</p>
                     </div>
                  )}
                  {auction.artisan_email && (
                     <div className="mt-4 pt-4 border-t border-amber-200">
                       <p className="text-sm text-amber-800 font-medium mb-1">Artisan Contact:</p>
                       <p className="text-sm">{auction.artisan_email}</p>
                     </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground mb-4">No bids were placed on this auction.</p>
              )}
              <div className="flex flex-wrap gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate("/auctions")}>Back to Auctions</Button>
                {user && (user.id === auction.current_winner_id || user.id === auction.artisan_id) && auction.current_winner_name && (
                  <Button onClick={() => navigate("/profile")}>
                    {user.id === auction.artisan_id ? "📦 Manage Order" : "📋 View Order Status"}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuctionRoom;
