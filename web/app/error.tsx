"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/marketing/logo";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[scrape] route error", error);
  }, [error]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-xl">
        <div className="flex justify-center mb-8"><Logo /></div>
        <div className="eyebrow text-rust mb-4">/ FAULT</div>
        <h1 className="display text-6xl md:text-8xl leading-[0.9]">
          Something <span className="display-it text-rust">collapsed.</span>
        </h1>
        <p className="mt-6 text-muted leading-relaxed">
          A handler failed to deliver a clean stratum. The error has been logged. You can try
          again or take the lift back up.
        </p>
        {error.digest && (
          <p className="mt-3 small-caps text-muted">REF · {error.digest}</p>
        )}
        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <Button onClick={() => reset()} variant="rust">Try again</Button>
          <Button asChild variant="outline"><Link href="/home">Return to surface</Link></Button>
        </div>
      </div>
    </div>
  );
}
