import { useEffect, useState } from "react";
import { Phone, PhoneCall, PhoneOff, Shield, Send, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function AuctionContactExchange({ auctionId, userId, role }) {
  const [contactStatus, setContactStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [respondMode, setRespondMode] = useState(null); // "accept" | "decline"

  const token = JSON.parse(localStorage.getItem("auth") || "{}").token;

  const fetchContactStatus = async () => {
    try {
      const res = await fetch(`/api/auction-orders/${auctionId}/contact`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setContactStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch contact status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auctionId && token) fetchContactStatus();
  }, [auctionId]);

  const handleInitiateRequest = async () => {
    if (!phone.trim() || !/^\d{10,15}$/.test(phone.trim())) {
      toast.error("Please enter a valid phone number (10-15 digits)");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auction-orders/${auctionId}/contact-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail?.message || "Failed to send request");
      }
      toast.success("Contact request sent!");
      setShowPhoneInput(false);
      setPhone("");
      fetchContactStatus();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (action) => {
    if (action === "accept" && (!phone.trim() || !/^\d{10,15}$/.test(phone.trim()))) {
      toast.error("Please enter your phone number (10-15 digits)");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auction-orders/${auctionId}/contact-respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          phone: action === "accept" ? phone.trim() : "0000000000",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail?.message || "Failed to respond");
      }
      toast.success(action === "accept" ? "Contact shared successfully!" : "Request declined");
      setRespondMode(null);
      setPhone("");
      fetchContactStatus();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/2" />
      </Card>
    );
  }

  const status = contactStatus?.status || "none";
  const isRequester = contactStatus?.requester_id === userId;
  const isResponder = contactStatus?.responder_id === userId;
  const requesterRole = contactStatus?.requester_role;

  // Accepted — show both phone numbers
  if (status === "accepted") {
    return (
      <Card className="p-5 border-2 border-emerald-300/40 bg-emerald-50/30">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <h4 className="font-semibold text-emerald-800">Contact Info Exchanged</h4>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-background p-3 border">
            <p className="text-xs text-muted-foreground mb-1">
              {requesterRole === "artisan" ? "Artisan's Phone" : "Winner's Phone"}
            </p>
            <p className="font-semibold text-lg flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              {contactStatus.requester_phone}
            </p>
          </div>
          <div className="rounded-lg bg-background p-3 border">
            <p className="text-xs text-muted-foreground mb-1">
              {requesterRole === "artisan" ? "Winner's Phone" : "Artisan's Phone"}
            </p>
            <p className="font-semibold text-lg flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              {contactStatus.responder_phone}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Declined
  if (status === "declined") {
    return (
      <Card className="p-4 border-2 border-red-200/40 bg-red-50/20">
        <div className="flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700 font-medium">Contact sharing was declined.</p>
        </div>
      </Card>
    );
  }

  // Pending — requester is waiting
  if (status === "pending" && isRequester) {
    return (
      <Card className="p-4 border-2 border-amber-200/40 bg-amber-50/20">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-amber-600" />
          <h4 className="font-semibold text-amber-800 text-sm">Contact Request Sent</h4>
        </div>
        <p className="text-sm text-muted-foreground">
          Waiting for the other party to accept your contact sharing request...
        </p>
      </Card>
    );
  }

  // Pending — responder needs to act
  if (status === "pending" && isResponder) {
    const fromLabel = requesterRole === "artisan" ? "The artisan" : "The auction winner";
    return (
      <Card className="p-4 border-2 border-blue-200/40 bg-blue-50/20">
        <div className="flex items-center gap-2 mb-3">
          <Phone className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-blue-800 text-sm">Contact Request Received</h4>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {fromLabel} wants to exchange contact information with you.
        </p>

        {respondMode === "accept" ? (
          <div className="space-y-3">
            <Input
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              maxLength={15}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleRespond("accept")} disabled={submitting}>
                {submitting ? "Sharing..." : "Share & Accept"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRespondMode(null)}>
                Back
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setRespondMode("accept")}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Accept & Share
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={() => handleRespond("decline")}
              disabled={submitting}
            >
              <XCircle className="w-4 h-4 mr-1" /> Decline
            </Button>
          </div>
        )}
      </Card>
    );
  }

  // No request yet — show initiate button
  return (
    <Card className="p-4 border-dashed border-2 border-muted-foreground/20">
      <div className="flex items-center gap-2 mb-3">
        <Phone className="w-5 h-5 text-muted-foreground" />
        <h4 className="font-semibold text-sm">Share Contact Info</h4>
      </div>

      {!showPhoneInput ? (
        <>
          <p className="text-sm text-muted-foreground mb-3">
            Exchange phone numbers with the {role === "artisan" ? "auction winner" : "artisan"} for delivery coordination.
          </p>
          <Button size="sm" variant="outline" onClick={() => setShowPhoneInput(true)}>
            <Send className="w-4 h-4 mr-1" /> Share My Contact
          </Button>
        </>
      ) : (
        <div className="space-y-3">
          <Input
            type="tel"
            placeholder="Enter your phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            maxLength={15}
          />
          <p className="text-xs text-muted-foreground">
            Your number will only be shared after the other party accepts.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleInitiateRequest} disabled={submitting}>
              {submitting ? "Sending..." : "Send Request"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowPhoneInput(false); setPhone(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
