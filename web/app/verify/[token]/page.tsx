"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { Logo } from "@/components/marketing/logo";

type Status = "pending" | "ok" | "invalid" | "expired" | "used" | "error";

const COPY: Record<Status, { title: string; body: string }> = {
  pending: {
    title: "Verifying your email…",
    body: "Hold a moment.",
  },
  ok: {
    title: "Email verified.",
    body: "Your account is fully active. You can close this tab and head back to the dashboard.",
  },
  invalid: {
    title: "That link isn't valid.",
    body: "The link may have been mistyped, or you're using one that's already been replaced by a newer email.",
  },
  expired: {
    title: "That link has expired.",
    body: "Verification links are good for seven days. Request a new one and we'll send another.",
  },
  used: {
    title: "That link was already used.",
    body: "If you've already verified, you're all set — just sign in.",
  },
  error: {
    title: "Something went wrong.",
    body: "We couldn't reach the verification service. Try again in a minute, or contact support.",
  },
};

export default function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [status, setStatus] = useState<Status>("pending");
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.verifyEmail(token);
        if (cancelled) return;
        if (res.verified) {
          setStatus("ok");
          setVerifiedEmail(res.email);
        } else {
          setStatus("error");
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError) {
          if (e.detail.includes("expired")) setStatus("expired");
          else if (e.detail.includes("already used")) setStatus("used");
          else if (e.detail.includes("invalid")) setStatus("invalid");
          else setStatus("error");
        } else {
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const c = COPY[status];
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-10">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="space-y-6 text-center">
          <div
            className={
              "mx-auto inline-flex h-12 w-12 items-center justify-center border " +
              (status === "ok"
                ? "border-lichen text-lichen"
                : status === "pending"
                  ? "border-line text-muted"
                  : "border-rust text-rust")
            }
          >
            {status === "ok" && <CheckCircle2 className="h-5 w-5" />}
            {status === "pending" && <Loader2 className="h-5 w-5 animate-spin" />}
            {status !== "ok" && status !== "pending" && <XCircle className="h-5 w-5" />}
          </div>
          <div>
            <div className="eyebrow text-rust mb-2">
              / FILED · VERIFICATION
            </div>
            <h1 className="display text-4xl leading-[0.95]">{c.title}</h1>
          </div>
          <p className="text-sm text-muted">{c.body}</p>
          {status === "ok" && verifiedEmail && (
            <p className="text-xs text-muted font-mono">{verifiedEmail}</p>
          )}
          <div className="flex items-center justify-center gap-3 pt-2">
            {status === "ok" ? (
              <Button asChild variant="rust">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            ) : status === "pending" ? null : (
              <>
                <Button asChild variant="rust">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/register">Create a new account</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
