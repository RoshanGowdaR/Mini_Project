import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Package, Calendar, DollarSign, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { parseJsonSafely } from "@/lib/utils";

const ArtisanOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    const authData = localStorage.getItem("auth");
    if (authData) {
      try {
        setAuth(JSON.parse(authData));
      } catch (e) {
        console.error("Failed to parse auth data", e);
      }
    }
  }, []);

  useEffect(() => {
    if (auth?.token && auth?.user?.role === "artisan") {
      fetchOrders();
    } else if (auth) {
      setLoading(false);
    }
  }, [auth]);

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/artisans/orders", {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
      const data = await parseJsonSafely(response, []);
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch orders");
      }
      setOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error(error.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`/api/artisans/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const data = await parseJsonSafely(response, {});
      if (!response.ok) {
        throw new Error(data.message || "Failed to update order status");
      }
      
      toast.success(`Order status updated to ${newStatus}`);
      setOrders(orders.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error(error.message || "Failed to update status");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "confirmed": return "bg-blue-100 text-blue-800 border-blue-200";
      case "shipped": return "bg-purple-100 text-purple-800 border-purple-200";
      case "delivered": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading && !auth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!auth?.user || auth?.user?.role !== "artisan") {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl mt-16">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif text-primary">Order Management</h1>
            <p className="text-muted-foreground mt-2">Manage incoming orders for your handcrafted products.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <Card className="p-12 text-center flex flex-col items-center">
            <Package className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No Orders Yet</h3>
            <p className="text-muted-foreground">When buyers purchase your products, they will appear here.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order._id} className="p-6 overflow-hidden relative">
                <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between">
                  
                  {/* Order Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{order.product?.title || "Unknown Product"}</h3>
                        <p className="text-sm text-muted-foreground font-mono">Order ID: {order._id.substring(0, 8)}</p>
                      </div>
                      <Badge className={`px-3 py-1 text-sm font-medium border ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="space-y-1">
                        <div className="flex items-center text-muted-foreground">
                          <User className="w-4 h-4 mr-1" /> Buyer
                        </div>
                        <p className="font-medium">{order.buyer_name}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center text-muted-foreground">
                          <Package className="w-4 h-4 mr-1" /> Quantity
                        </div>
                        <p className="font-medium">{order.quantity}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center text-muted-foreground">
                          <DollarSign className="w-4 h-4 mr-1" /> Total
                        </div>
                        <p className="font-medium font-mono">₹{Number(order.total_amount).toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-1" /> Date
                        </div>
                        <p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 min-w-[200px]">
                    <p className="text-sm font-medium mb-1 w-full text-left md:text-right">Update Status</p>
                    <Select value={order.status} onValueChange={(val) => updateOrderStatus(order._id, val)}>
                      <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default ArtisanOrders;
