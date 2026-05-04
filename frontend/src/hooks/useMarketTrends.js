import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const CACHE_KEY = "ophelia_market_trends_cache";
const CACHE_TIMESTAMP_KEY = "ophelia_market_trends_timestamp";

const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const useMarketTrends = (fallbackData) => {
  const [data, setData] = useState(fallbackData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const toastIdRef = useRef(null);

  useEffect(() => {
    const cached = safeParse(localStorage.getItem(CACHE_KEY), null);
    const cachedTimestamp = Number(localStorage.getItem(CACHE_TIMESTAMP_KEY)) || null;
    if (cached) {
      setData({ ...fallbackData, ...cached });
    }
    if (cachedTimestamp) {
      setLastUpdated(cachedTimestamp);
    }
  }, [fallbackData]);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    toastIdRef.current = toast.loading("Refreshing in background...");

    try {
      const response = await fetch("/api/ai/market-trends");
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "Refresh failed");
      }

      const nextData = { ...fallbackData, ...(payload || {}) };
      const timestamp = Date.now();
      localStorage.setItem(CACHE_KEY, JSON.stringify(nextData));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, String(timestamp));
      setData(nextData);
      setLastUpdated(timestamp);
      toast.success("Analytics updated!", { id: toastIdRef.current });
    } catch (error) {
      toast.error("Refresh failed, showing last known data", { id: toastIdRef.current });
    } finally {
      setIsRefreshing(false);
      toastIdRef.current = null;
    }
  }, [fallbackData, isRefreshing]);

  return {
    data,
    isRefreshing,
    lastUpdated,
    refresh,
  };
};
