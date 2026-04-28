"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/marketing/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/use-cases", label: "Field" },
  { href: "/docs", label: "Manual" },
  { href: "/changelog", label: "Logs" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-bg/85 backdrop-blur-xl border-b border-line">
      <div className="container mx-auto max-w-6xl px-6 flex h-14 items-center justify-between">
        <div className="flex items-center gap-10">
          <Logo />
          <nav className="hidden md:flex items-center gap-6 small-caps">
            {NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="x-link text-muted hover:text-fg transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm"><Link href="/login">Sign in</Link></Button>
          <Button asChild variant="rust" size="sm"><Link href="/register">Get access</Link></Button>
        </div>
        <button
          className="md:hidden p-2 -mr-2 text-muted"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      <div
        className={cn(
          "md:hidden border-t border-line overflow-hidden transition-[max-height] duration-300",
          open ? "max-h-96" : "max-h-0",
        )}
      >
        <div className="container mx-auto max-w-6xl px-6 py-4 flex flex-col gap-3 small-caps">
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-muted hover:text-fg"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <Button asChild variant="outline" size="sm" className="flex-1"><Link href="/login">Sign in</Link></Button>
            <Button asChild variant="rust" size="sm" className="flex-1"><Link href="/register">Get access</Link></Button>
          </div>
        </div>
      </div>
    </header>
  );
}
