import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, StopCircle, Pencil, CheckCircle2, XCircle, Users, Mail, LogOut, Ban, Trash2, LayoutDashboard, Store, LineChart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [auctionRequests, setAuctionRequests] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [regCounts, setRegCounts] = useState({});
  const [metrics, setMetrics] = useState({ total_users: 0, total_artisans: 0, total_buyers: 0, users: [] });
  const [loading, setLoading] = useState(true);
  const [editAuction, setEditAuction] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const adminToken = localStorage.getItem("ophelia_admin_token");

  const headers = useMemo(() => ({
    Authorization: `Bearer ${adminToken}`,
    "Content-Type": "application/json",
  }), [adminToken]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [requestsRes, auctionsRes, metricsRes] = await Promise.all([
        fetch("/api/admin/auction-requests", { headers }),
        fetch("/api/admin/auctions", { headers }),
        fetch("/api/admin/metrics", { headers })
      ]);
      const requestsData = await requestsRes.json().catch(() => []);
      const auctionsData = await auctionsRes.json().catch(() => []);
      const metricsData = await metricsRes.json().catch(() => ({}));
      
      setAuctionRequests(Array.isArray(requestsData) ? requestsData : []);
      const auctionsList = Array.isArray(auctionsData) ? auctionsData : [];
      setAuctions(auctionsList);
      setMetrics(metricsData);

      // Fetch registration counts for each auction
      const counts = {};
      await Promise.all(
        auctionsList.filter(a => ["scheduled", "live"].includes(a.status)).map(async (a) => {
          try {
            const regRes = await fetch(`/api/admin/auctions/${a.id}/registrations`, { headers });
            const regData = await regRes.json().catch(() => []);
            counts[a.id] = Array.isArray(regData) ? regData.length : 0;
          } catch { counts[a.id] = 0; }
        })
      );
      setRegCounts(counts);
    } catch (error) {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const statusCounts = useMemo(() => {
    const counts = { total: auctions.length, live: 0, pending: 0, scheduled: 0, ended: 0 };
    auctions.forEach((auction) => {
      if (auction.status === "live") counts.live += 1;
      if (auction.status === "pending_review") counts.pending += 1;
      if (auction.status === "scheduled") counts.scheduled += 1;
      if (auction.status === "ended") counts.ended += 1;
    });
    return counts;
  }, [auctions]);

  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("ophelia_admin_token");
    toast.success("Logged out successfully");
    navigate("/admin/login");
  };

  const handleApprove = async (auctionId, payload) => {
    try {
      const response = await fetch(`/api/admin/auctions/${auctionId}/approve`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Approve failed");
      }
      toast.success("Auction scheduled");
      fetchData();
    } catch {
      toast.error("Failed to approve auction");
    }
  };

  const handleReject = async (auctionId, reason) => {
    try {
      const response = await fetch(`/api/admin/auctions/${auctionId}/reject`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        throw new Error("Reject failed");
      }
      toast.success("Auction rejected");
      fetchData();
    } catch {
      toast.error("Failed to reject auction");
    }
  };

  const handleGoLive = async (auctionId) => {
    try {
      const response = await fetch(`/api/admin/auctions/${auctionId}/go-live`, {
        method: "POST",
        headers,
      });
      if (!response.ok) {
        throw new Error("Go live failed");
      }
      toast.success("Auction is live");
      fetchData();
    } catch {
      toast.error("Failed to go live");
    }
  };

  const handleEnd = async (auctionId) => {
    try {
      const response = await fetch(`/api/admin/auctions/${auctionId}/end`, {
        method: "POST",
        headers,
      });
      if (!response.ok) {
        throw new Error("End failed");
      }
      toast.success("Auction ended");
      fetchData();
    } catch {
      toast.error("Failed to end auction");
    }
  };

  const handleUpdate = async (auctionId, payload) => {
    try {
      const response = await fetch(`/api/admin/auctions/${auctionId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Update failed");
      }
      toast.success("Auction updated");
      setEditOpen(false);
      setEditAuction(null);
      fetchData();
    } catch {
      toast.error("Failed to update auction");
    }
  };

  const handleBanUser = async (userId, currentStatus) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ is_banned: !currentStatus }),
      });
      if (!response.ok) throw new Error("Ban update failed");
      toast.success(`User ${!currentStatus ? 'banned' : 'unbanned'} successfully`);
      fetchData();
    } catch {
      toast.error("Failed to update user ban status");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to permanently delete this user? This cannot be undone.")) return;
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers,
      });
      if (!response.ok) throw new Error("Delete failed");
      toast.success("User deleted successfully");
      fetchData();
    } catch {
      toast.error("Failed to delete user");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground">Loading admin dashboard...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/5 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-background/80 backdrop-blur-md border-r p-6 flex flex-col h-screen sticky top-0 shadow-lg">
        <div className="text-2xl font-bold mb-8 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Ophelia Admin</div>
        
        <nav className="space-y-2 flex-1">
          <Button variant={activeTab === "overview" ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => setActiveTab("overview")}>
            <LayoutDashboard className="w-4 h-4 mr-3" /> Overview
          </Button>
          <Button variant={activeTab === "requests" ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => setActiveTab("requests")}>
            <CheckCircle2 className="w-4 h-4 mr-3" /> Auction Requests
          </Button>
          <Button variant={activeTab === "auctions" ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => setActiveTab("auctions")}>
            <Play className="w-4 h-4 mr-3" /> All Auctions
          </Button>
          <Button variant={activeTab === "users" ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => setActiveTab("users")}>
            <Users className="w-4 h-4 mr-3" /> Users & Metrics
          </Button>
        </nav>

        <div className="border-t pt-4 space-y-2 mt-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Public Links</p>
          <Button variant="ghost" className="w-full justify-start" onClick={() => navigate("/marketplace")}>
            <Store className="w-4 h-4 mr-3" /> Marketplace
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => navigate("/trend-analytics")}>
            <LineChart className="w-4 h-4 mr-3" /> Trend Analysis
          </Button>
          
          <Button variant="destructive" className="w-full justify-start mt-6" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-3" /> Log Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
          
          <div className="grid md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Auctions</div>
            <div className="text-2xl font-bold">{statusCounts.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Live Now</div>
            <div className="text-2xl font-bold text-emerald-600">{statusCounts.live}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Pending Review</div>
            <div className="text-2xl font-bold text-amber-600">{statusCounts.pending}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Ended</div>
            <div className="text-2xl font-bold text-slate-600">{statusCounts.ended}</div>
          </Card>
          </div>

          {activeTab === "overview" && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              <p className="text-muted-foreground">Stay tuned for more detailed activity insights.</p>
            </Card>
          )}

          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4 bg-primary/5">
                  <div className="text-sm text-muted-foreground">Total Users</div>
                  <div className="text-2xl font-bold">{metrics.total_users || 0}</div>
                </Card>
                <Card className="p-4 bg-primary/5">
                  <div className="text-sm text-muted-foreground">Artisans</div>
                  <div className="text-2xl font-bold text-amber-600">{metrics.total_artisans || 0}</div>
                </Card>
                <Card className="p-4 bg-primary/5">
                  <div className="text-sm text-muted-foreground">Buyers</div>
                  <div className="text-2xl font-bold text-emerald-600">{metrics.total_buyers || 0}</div>
                </Card>
              </div>
              
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">User Directory</h2>
                <div className="space-y-4">
                  {metrics.users && metrics.users.length > 0 ? (
                    metrics.users.map((u) => (
                      <div key={u.id} className={`flex justify-between items-center p-4 border rounded-lg transition-colors ${u.is_banned ? 'bg-red-50/50 border-red-200' : 'bg-card'}`}>
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {u.full_name || "Unknown"}
                            {u.is_banned && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">BANNED</span>}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3" /> {u.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${u.role === "artisan" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                            {u.role}
                          </span>
                          <div className="flex gap-2 ml-4 border-l pl-4">
                            <Button 
                              variant={u.is_banned ? "outline" : "secondary"} 
                              size="sm"
                              className={u.is_banned ? "text-emerald-600 hover:text-emerald-700" : "text-amber-600 hover:text-amber-700"}
                              onClick={() => handleBanUser(u.id, u.is_banned)}
                            >
                              <Ban className="w-4 h-4 mr-1" /> {u.is_banned ? 'Unban' : 'Ban'}
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDeleteUser(u.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" /> Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No users found.</p>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === "requests" && (
            <div className="space-y-4">
              {auctionRequests.length === 0 ? (
                <Card className="p-6">No pending requests.</Card>
              ) : (
                auctionRequests.map((auction) => (
                  <Card key={auction.id} className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{auction.title}</h3>
                        <p className="text-sm text-muted-foreground">Starting bid: {auction.starting_bid}</p>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="secondary">
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Accept
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Approve Auction</DialogTitle>
                            </DialogHeader>
                            <ApproveForm auction={auction} onApprove={handleApprove} />
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="destructive">
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Reject Auction</DialogTitle>
                            </DialogHeader>
                            <RejectForm auction={auction} onReject={handleReject} />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === "auctions" && (
            <div className="space-y-4">
              {auctions.map((auction) => (
                <Card key={auction.id} className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{auction.id.slice(0, 8)}</p>
                    <h3 className="text-lg font-semibold">{auction.title}</h3>
                    <p className="text-sm text-muted-foreground">Status: {auction.status}</p>
                    {(auction.status === "scheduled" || auction.status === "live") && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Users className="w-4 h-4" />
                        {regCounts[auction.id] || 0} registered participants
                      </p>
                    )}
                    {auction.status === "ended" && (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm">
                          <span className="font-semibold text-amber-700">Winner:</span> {auction.current_winner_name || "None"}
                          {auction.current_bid && ` (₹${Number(auction.current_bid).toLocaleString()})`}
                        </p>
                        {auction.winner_email && (
                          <p className="text-sm flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" /> Winner: {auction.winner_email}
                          </p>
                        )}
                        {auction.artisan_email && (
                          <p className="text-sm flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" /> Artisan: {auction.artisan_email}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {auction.status === "scheduled" && (
                      <Button variant="secondary" onClick={() => handleGoLive(auction.id)}>
                        <Play className="w-4 h-4 mr-2" />
                        Go Live
                      </Button>
                    )}
                    {auction.status === "live" && (
                      <Button variant="destructive" onClick={() => handleEnd(auction.id)}>
                        <StopCircle className="w-4 h-4 mr-2" />
                        End
                      </Button>
                    )}
                    <Dialog
                      open={editOpen && editAuction?.id === auction.id}
                      onOpenChange={(open) => {
                        setEditOpen(open);
                        setEditAuction(open ? auction : null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Edit Auction</DialogTitle>
                        </DialogHeader>
                        <EditForm auction={editAuction || auction} onUpdate={handleUpdate} />
                      </DialogContent>
                    </Dialog>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const ApproveForm = ({ auction, onApprove }) => {
  const [form, setForm] = useState({
    title: auction.title,
    description: auction.description || "",
    story: auction.story || "",
    starting_bid: auction.starting_bid,
    scheduled_start: auction.scheduled_start || "",
    scheduled_end: auction.scheduled_end || "",
    admin_notes: auction.admin_notes || "",
  });

  return (
    <div className="space-y-3">
      <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" />
      <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" />
      <Textarea value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} placeholder="Story" />
      <div className="grid grid-cols-2 gap-3">
        <Input type="number" value={form.starting_bid} onChange={(e) => setForm({ ...form, starting_bid: Number(e.target.value) })} />
        <Input type="datetime-local" value={form.scheduled_start} onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })} />
      </div>
      <Input type="datetime-local" value={form.scheduled_end} onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })} />
      <Textarea value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} placeholder="Admin notes" />
      <Button className="w-full" onClick={() => onApprove(auction.id, form)}>Confirm & Schedule</Button>
    </div>
  );
};

const RejectForm = ({ auction, onReject }) => {
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-3">
      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rejection reason" />
      <Button variant="destructive" className="w-full" onClick={() => onReject(auction.id, reason)}>Reject Request</Button>
    </div>
  );
};

const EditForm = ({ auction, onUpdate }) => {
  const [form, setForm] = useState({
    title: auction.title,
    description: auction.description || "",
    story: auction.story || "",
    starting_bid: auction.starting_bid,
    scheduled_start: auction.scheduled_start || "",
    scheduled_end: auction.scheduled_end || "",
    admin_notes: auction.admin_notes || "",
    status: auction.status || "",
  });

  useEffect(() => {
    setForm({
      title: auction.title,
      description: auction.description || "",
      story: auction.story || "",
      starting_bid: auction.starting_bid,
      scheduled_start: auction.scheduled_start || "",
      scheduled_end: auction.scheduled_end || "",
      admin_notes: auction.admin_notes || "",
      status: auction.status || "",
    });
  }, [auction]);

  return (
    <div className="space-y-3">
      <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" />
      <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" />
      <Textarea value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} placeholder="Story" />
      <Input type="number" value={form.starting_bid} onChange={(e) => setForm({ ...form, starting_bid: Number(e.target.value) })} />
      <div className="grid grid-cols-2 gap-3">
        <Input type="datetime-local" value={form.scheduled_start} onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })} />
        <Input type="datetime-local" value={form.scheduled_end} onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })} />
      </div>
      <Input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} placeholder="Status" />
      <Textarea value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} placeholder="Admin notes" />
      <Button className="w-full" onClick={() => onUpdate(auction.id, form)}>Update Auction</Button>
    </div>
  );
};

export default AdminDashboard;
