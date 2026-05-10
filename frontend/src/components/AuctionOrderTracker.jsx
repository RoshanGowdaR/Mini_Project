import { useState } from "react";
import { Check, Circle, Package, Truck, MapPin, Trophy, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const STATUSES = [
  { key: "won", label: "Auction Won", icon: Trophy, color: "text-amber-600" },
  { key: "preparing", label: "Preparing Item", icon: Package, color: "text-blue-600" },
  { key: "ready_to_ship", label: "Ready to Ship", icon: Package, color: "text-indigo-600" },
  { key: "shipped", label: "Shipped", icon: Truck, color: "text-purple-600" },
  { key: "delivered", label: "Delivered", icon: MapPin, color: "text-emerald-600" },
];

export default function AuctionOrderTracker({ order, role, onStatusUpdated }) {
  const [updating, setUpdating] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState("");
  const [selectedNextStatus, setSelectedNextStatus] = useState(null);

  const currentIndex = STATUSES.findIndex((s) => s.key === (order?.status || "won"));

  const getNextStatus = () => {
    if (currentIndex < STATUSES.length - 1) {
      return STATUSES[currentIndex + 1];
    }
    return null;
  };

  const handleUpdateStatus = async () => {
    const next = selectedNextStatus || getNextStatus();
    if (!next) return;

    setUpdating(true);
    try {
      const token = JSON.parse(localStorage.getItem("auth") || "{}").token;
      const body = { status: next.key };
      if (note.trim()) body.note = note.trim();

      const res = await fetch(`/api/auction-orders/${order.auction_id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail?.message || "Failed to update status");
      }

      toast.success(`Status updated to "${next.label}"`);
      setNote("");
      setShowNoteInput(false);
      setSelectedNextStatus(null);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const nextStatus = getNextStatus();

  return (
    <div className="space-y-4">
      {/* Status Stepper */}
      <div className="relative flex flex-col gap-0">
        {STATUSES.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;
          const StepIcon = step.icon;

          return (
            <div key={step.key} className="flex items-start gap-4">
              {/* Connector + Icon Column */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCompleted
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : isCurrent
                      ? "bg-primary/10 border-primary text-primary animate-pulse"
                      : "bg-muted/50 border-muted-foreground/20 text-muted-foreground/40"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                </div>
                {/* Connector Line */}
                {index < STATUSES.length - 1 && (
                  <div
                    className={`w-0.5 h-10 transition-all duration-300 ${
                      isCompleted ? "bg-emerald-500" : "bg-muted-foreground/15"
                    }`}
                  />
                )}
              </div>

              {/* Label */}
              <div className={`pt-2 pb-4 ${isPending ? "opacity-40" : ""}`}>
                <p
                  className={`font-semibold text-sm ${
                    isCurrent ? "text-primary" : isCompleted ? "text-emerald-700" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </p>
                {isCurrent && order?.artisan_note && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    Note: {order.artisan_note}
                  </p>
                )}
                {isCurrent && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                    Current
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Artisan Update Controls */}
      {role === "artisan" && nextStatus && (
        <Card className="p-4 border-dashed border-2 border-primary/30 bg-primary/5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Next step: <span className="text-primary">{nextStatus.label}</span>
              </p>
            </div>

            {!showNoteInput ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowNoteInput(true)}
                  disabled={updating}
                >
                  Update Status
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <textarea
                  className="w-full text-sm p-2 rounded-md border bg-background resize-none"
                  rows={2}
                  placeholder="Optional: Add a note (e.g., tracking ID, expected date)..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleUpdateStatus} disabled={updating}>
                    {updating ? "Updating..." : `Mark as "${nextStatus.label}"`}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowNoteInput(false);
                      setNote("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Delivered Badge */}
      {currentIndex === STATUSES.length - 1 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <Check className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-700">
            Item has been delivered successfully!
          </span>
        </div>
      )}
    </div>
  );
}
