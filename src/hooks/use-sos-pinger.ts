import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { pingSosLocation, getSharedSos } from "@/lib/safety.functions";

function getPos(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 60_000 },
    );
  });
}

const STORAGE_KEY = "hamduk.activeSos";

interface ActiveSos {
  sessionId: number;
  shareToken: string;
  link: string;
}

/**
 * Keeps an active SOS session alive by pinging the server with the user's
 * current location every 10 minutes (and once on mount). Stops automatically
 * if the server reports status != "active" (admin or user stopped it).
 */
export function useSosPinger(): {
  active: ActiveSos | null;
  setActive: (s: ActiveSos | null) => void;
  clear: () => void;
} {
  const [active, _setActive] = useState<ActiveSos | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ActiveSos) : null;
    } catch {
      return null;
    }
  });
  const pingFn = useServerFn(pingSosLocation);
  const peekFn = useServerFn(getSharedSos);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const setActive = (s: ActiveSos | null) => {
    _setActive(s);
    if (typeof window === "undefined") return;
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  };

  const clear = () => setActive(null);

  useEffect(() => {
    if (!active) return;

    const tick = async () => {
      // Stop loop if server marked it stopped.
      const peek = await peekFn({ data: { token: active.shareToken } }).catch(() => null);
      if (!peek || peek.status !== "active") {
        clear();
        return;
      }
      const pos = await getPos();
      if (!pos) return;
      const r = await pingFn({
        data: { sessionId: active.sessionId, lat: pos.lat, lng: pos.lng },
      }).catch(() => null);
      if (!r || r.status !== "active") clear();
    };
    void tick();
    timer.current = setInterval(() => void tick(), 10 * 60_000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.sessionId]);

  return { active, setActive, clear };
}
