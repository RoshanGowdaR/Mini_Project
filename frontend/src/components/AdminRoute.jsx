import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const AdminRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      const token = localStorage.getItem("ophelia_admin_token");
      if (!token) {
        navigate("/admin/login");
        return;
      }

      try {
        const response = await fetch("/api/admin/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          localStorage.removeItem("ophelia_admin_token");
          navigate("/admin/login");
          return;
        }
        setAllowed(true);
      } catch {
        localStorage.removeItem("ophelia_admin_token");
        navigate("/admin/login");
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return allowed ? children : null;
};

export default AdminRoute;
