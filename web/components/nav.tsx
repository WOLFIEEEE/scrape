"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/marketing/logo";
import { VerificationBanner } from "@/components/verification-banner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: api.me });

  async function logout() {
    try {
      await api.logout();
      toast.success("Signed out");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Logout failed");
    }
  }

  const links = [
    { href: "/dashboard", label: "Site" },
    { href: "/jobs", label: "Digs" },
    { href: "/jobs/new", label: "New dig" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-xl">
      <VerificationBanner />
      <div className="container mx-auto max-w-6xl flex items-center justify-between h-14 px-6">
        <div className="flex items-center gap-10">
          <Logo />
          <nav className="hidden md:flex items-center gap-6 small-caps">
            {links.map((l) => {
              const active = pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "x-link transition-colors",
                    active ? "text-rust" : "text-muted hover:text-fg",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/docs" target="_blank" className="hidden md:inline-flex items-center gap-1.5 small-caps text-muted hover:text-rust transition-colors">
            Manual <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
          <ThemeToggle />
          {user && (
            <div className="hidden md:flex min-w-0 max-w-64 items-center gap-2 px-2 py-1 border border-line">
              <span className="h-5 w-5 bg-rust text-paper flex items-center justify-center text-[10px] font-mono">
                {user.email[0]?.toUpperCase()}
              </span>
              <span className="small-caps text-muted truncate">{user.email}</span>
            </div>
          )}
          <Button size="sm" variant="ghost" onClick={logout} aria-label="Sign out">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <nav className="md:hidden border-t border-line overflow-x-auto" aria-label="Primary">
        <div className="container mx-auto max-w-6xl flex items-center gap-5 px-6 py-2 small-caps whitespace-nowrap">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "x-link transition-colors",
                  active ? "text-rust" : "text-muted hover:text-fg",
                )}
              >
                {l.label}
              </Link>
            );
          })}
          <Link href="/docs" target="_blank" className="x-link text-muted">
            Manual
          </Link>
        </div>
      </nav>
    </header>
  );
}
