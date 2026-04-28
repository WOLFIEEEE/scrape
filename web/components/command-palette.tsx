"use client";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Book,
  ExternalLink,
  Inbox,
  KeyRound,
  LogOut,
  Plus,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
} from "lucide-react";
import { api, type JobListItem } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Action = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
};

/**
 * Command palette — ⌘K opens, type to filter, Enter to run.
 * Lives at the root layout; reads jobs only when open.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Open with ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Pull recent jobs only while open + authenticated; silently no-op if signed out
  const jobsQ = useQuery({
    queryKey: ["jobs"],
    queryFn: api.listJobs,
    enabled: open,
    retry: false,
  });

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  const go = useCallback(
    (path: string) => {
      close();
      router.push(path);
    },
    [close, router],
  );

  const baseActions: Action[] = useMemo(
    () => [
      { id: "go-dashboard", label: "Go to dashboard", group: "Navigate", icon: Inbox, run: () => go("/dashboard") },
      { id: "go-jobs", label: "All digs", group: "Navigate", icon: Inbox, run: () => go("/jobs") },
      { id: "new-dig", label: "New dig", hint: "Begin a fresh excavation", group: "Actions", icon: Plus, run: () => go("/jobs/new") },
      { id: "go-settings", label: "Settings", group: "Navigate", icon: SettingsIcon, run: () => go("/settings") },
      { id: "go-keys", label: "API keys", group: "Settings", icon: KeyRound, run: () => go("/settings#keys") },
      { id: "go-docs", label: "Open the manual", group: "Reference", icon: Book, run: () => go("/docs") },
      { id: "go-api", label: "API reference", group: "Reference", icon: Book, run: () => go("/docs/api") },
      { id: "go-security", label: "Security", group: "Reference", icon: ShieldCheck, run: () => go("/security") },
      {
        id: "logout",
        label: "Sign out",
        group: "Actions",
        icon: LogOut,
        run: async () => {
          try {
            await api.logout();
            toast.success("Signed out");
            close();
            router.push("/login");
            router.refresh();
          } catch {
            toast.error("Logout failed");
          }
        },
      },
    ],
    [close, go, router],
  );

  const jobActions: Action[] = useMemo(() => {
    const jobs: JobListItem[] = jobsQ.data ?? [];
    return jobs.slice(0, 8).map((j) => ({
      id: `job-${j.id}`,
      label: j.name,
      hint: `${j.status} · ${j.completed}/${j.total}`,
      group: "Recent digs",
      icon: ArrowRight,
      run: () => go(`/jobs/${j.id}`),
    }));
  }, [jobsQ.data, go]);

  const all = useMemo(() => [...baseActions, ...jobActions], [baseActions, jobActions]);
  const filtered = useMemo(() => {
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter((a) => a.label.toLowerCase().includes(q) || a.group.toLowerCase().includes(q));
  }, [all, query]);

  // Reset active index when filter changes
  useEffect(() => setActive(0), [query]);

  // Group actions in order
  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, Action[]>();
    for (const a of filtered) {
      if (!map.has(a.group)) {
        order.push(a.group);
        map.set(a.group, []);
      }
      map.get(a.group)!.push(a);
    }
    return order.map((g) => ({ group: g, actions: map.get(g)! }));
  }, [filtered]);

  // Keyboard navigation
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[active]?.run();
    } else if (e.key === "Escape") {
      close();
    }
  };

  // Scroll active into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLButtonElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          className="fixed z-50 left-1/2 top-[20vh] -translate-x-1/2 w-[min(640px,calc(100vw-2rem))] bg-bg border border-line shadow-2xl"
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
            <Search className="h-3.5 w-3.5 text-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search digs, navigate, run actions…"
              className="flex-1 bg-transparent font-mono text-sm text-fg focus:outline-none placeholder:text-muted/60"
            />
            <kbd className="small-caps text-muted">esc</kbd>
          </div>
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-10 text-center small-caps text-muted">No matches</div>
            ) : (
              groups.map((g) => (
                <div key={g.group}>
                  <div className="px-4 pt-3 pb-1.5 eyebrow text-rust">{g.group}</div>
                  {g.actions.map((a) => {
                    const idx = filtered.indexOf(a);
                    const isActive = idx === active;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        data-idx={idx}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => a.run()}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                          isActive ? "bg-bg-2 text-fg" : "text-muted hover:bg-bg-2/50",
                        )}
                      >
                        <a.icon className={cn("h-3.5 w-3.5", isActive ? "text-rust" : "")} />
                        <span className="flex-1 text-sm">{a.label}</span>
                        {a.hint && <span className="small-caps text-muted">{a.hint}</span>}
                        {isActive && <ArrowRight className="h-3 w-3 text-rust" />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          <div className="border-t border-line px-4 py-2 flex items-center justify-between small-caps text-muted">
            <span className="inline-flex items-center gap-2">
              <kbd className="px-1 border border-line">↵</kbd> select
              <kbd className="ml-2 px-1 border border-line">↑↓</kbd> navigate
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="px-1 border border-line">⌘K</kbd> toggle
              <ExternalLink className="h-2.5 w-2.5" />
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
