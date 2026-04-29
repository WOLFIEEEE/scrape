"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

/**
 * Top-of-page banner shown to logged-in users whose email isn't verified yet.
 *
 * - Hidden when /me hasn't loaded yet (avoids a flash of "verify" before we
 *   know the user is actually verified).
 * - Hidden when email_verified is true.
 * - User-dismissable via session storage so the banner doesn't follow you
 *   around the dashboard, but it comes back next session.
 */
export function VerificationBanner() {
  const meQ = useQuery({ queryKey: ["me"], queryFn: api.me });
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("verify_banner_dismissed") === "1";
  });
  const [resending, setResending] = useState(false);

  if (!meQ.data) return null;
  if (meQ.data.email_verified) return null;
  if (dismissed) return null;

  async function resend() {
    if (!meQ.data) return;
    setResending(true);
    try {
      await api.resendVerification(meQ.data.email);
      toast.success("Verification email sent — check your inbox.");
    } catch {
      // The server returns 202 even on failure to avoid enumeration; this
      // catch is purely defensive against network loss.
      toast.error("Couldn't send the email. Try again in a moment.");
    } finally {
      setResending(false);
    }
  }

  function dismiss() {
    sessionStorage.setItem("verify_banner_dismissed", "1");
    setDismissed(true);
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-rust/40 bg-rust/10 text-fg"
    >
      <div className="container mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <Mail className="h-4 w-4 text-rust shrink-0" aria-hidden />
          <span>
            Verify your email — we sent a link to{" "}
            <strong className="font-medium">{meQ.data.email}</strong>. Verifying
            unlocks webhooks and exports.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resend}
            disabled={resending}
            className="text-xs small-caps text-rust hover:text-rust/80 underline underline-offset-4 disabled:opacity-50"
          >
            {resending ? "Sending…" : "Resend"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss verification reminder"
            className="text-muted hover:text-fg p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
