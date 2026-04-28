"use client";
import { useEffect, useState } from "react";

type Status = "nominal" | "degraded" | "down";

/**
 * Polls /api/health and reports actual system status.
 * 3 consecutive failures → degraded, 5 → down. Resets on first success.
 */
export function useSystemStatus(): Status {
  const [status, setStatus] = useState<Status>("nominal");

  useEffect(() => {
    let fails = 0;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch("/api/health", { cache: "no-store" });
        if (!r.ok) throw new Error("not ok");
        fails = 0;
        if (!cancelled) setStatus("nominal");
      } catch {
        fails += 1;
        if (!cancelled) setStatus(fails >= 5 ? "down" : fails >= 3 ? "degraded" : "nominal");
      }
    };
    poll();
    const id = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return status;
}

const STATUS_LABEL: Record<Status, string> = {
  nominal: "All systems nominal",
  degraded: "Bureau is degraded",
  down: "Bureau offline",
};
const STATUS_COLOR: Record<Status, string> = {
  nominal: "bg-lichen",
  degraded: "bg-yellow-500",
  down: "bg-rust",
};

export function StatusPill({ className = "" }: { className?: string }) {
  const status = useSystemStatus();
  return (
    <span className={`inline-flex items-center gap-2 small-caps text-muted ${className}`}>
      <span
        className={`inline-flex h-2 w-2 ${STATUS_COLOR[status]} ${status === "nominal" ? "animate-pulse-dot" : ""}`}
        aria-hidden
      />
      {STATUS_LABEL[status]}
    </span>
  );
}
