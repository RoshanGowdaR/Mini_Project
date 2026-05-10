import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(undefined);

const parseJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Exchange Supabase token for custom backend JWT
  const exchangeSupabaseToken = async (supabaseSession) => {
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          access_token: supabaseSession.access_token,
          userType: "buyer" // Default for OAuth
        }),
      });
      const data = await parseJsonSafely(response);
      if (response.ok && data.token) {
        save(data.user, data.token);
      }
    } catch (err) {
      console.error("Token exchange failed:", err);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed.user || null);
      setToken(parsed.token || null);
    }
    setLoading(false);

    // Listen for Google Sign-In redirect via Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        await exchangeSupabaseToken(session);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed.user || null);
      setToken(parsed.token || null);
    }
    setLoading(false);
  }, []);

  const save = (nextUser, nextToken) => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem("auth", JSON.stringify({ user: nextUser, token: nextToken }));
  };

  const signIn = async (email, password) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await parseJsonSafely(response);

      if (response.ok && data.admin_login && data.admin_token) {
        localStorage.setItem("ophelia_admin_token", data.admin_token);
        return { admin: data.admin, isAdmin: true };
      }

      if (response.ok && data.token) {
        save(data.user, data.token);
        return { user: data.user };
      }

      return { error: data.error || data.message || "Login failed" };
    } catch (error) {
      return { error: error.message || "Login failed" };
    }
  };

  const signUp = async (email, password, fullName, userType) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, userType }),
      });
      const data = await parseJsonSafely(response);

      if (response.ok && data.token) {
        save(data.user, data.token);
        return { user: data.user };
      }

      return { error: data.error || data.message || "Registration failed" };
    } catch (error) {
      return { error: error.message || "Registration failed" };
    }
  };

  const signOut = async () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth");
    localStorage.removeItem("ophelia_admin_token");
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, token, signIn, signUp, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
