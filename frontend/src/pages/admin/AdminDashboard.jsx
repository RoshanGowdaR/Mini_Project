import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, StopCircle, Pencil, CheckCircle2, XCircle, Users, Mail, LogOut } from "lucide-react";
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground">Loading admin dashboard...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm text-foreground px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold">Auction Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage live auctions, users, and approvals.</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </div>

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="requests">Auction Requests</TabsTrigger>
            <TabsTrigger value="auctions">All Auctions</TabsTrigger>
            <TabsTrigger value="users">Users & Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              <p className="text-muted-foreground">Stay tuned for more detailed activity insights.</p>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
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
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {metrics.users && metrics.users.length > 0 ? (
                  metrics.users.map((u) => (
                    <div key={u.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{u.full_name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {u.email}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${u.role === "artisan" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {u.role}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No users found.</p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="auctions" className="space-y-4">
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
          </TabsContent>
        </Tabs>
      </div>
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
