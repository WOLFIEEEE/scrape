"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Inbox, Search } from "lucide-react";
import { api, type JobStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JobsTable } from "@/components/jobs-table";
import { EmptyState } from "@/components/empty-state";

const FILTERS: Array<{ id: "all" | JobStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "running", label: "Running" },
  { id: "completed", label: "Completed" },
  { id: "failed", label: "Failed" },
  { id: "cancelled", label: "Cancelled" },
];

export default function JobsPage() {
  const q = useQuery({ queryKey: ["jobs"], queryFn: api.listJobs, refetchInterval: 3_000 });
  const all = useMemo(() => q.data ?? [], [q.data]);

  const [filter, setFilter] = useState<"all" | JobStatus>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let xs = all;
    if (filter !== "all") {
      xs = xs.filter((j) => j.status === filter || (filter === "running" && j.status === "pending"));
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      xs = xs.filter((j) => j.name.toLowerCase().includes(s) || j.id.toLowerCase().includes(s));
    }
    return xs;
  }, [all, filter, search]);

  const counts: Record<string, number> = useMemo(
    () => ({
      all: all.length,
      running: all.filter((j) => j.status === "running" || j.status === "pending").length,
      completed: all.filter((j) => j.status === "completed").length,
      failed: all.filter((j) => j.status === "failed").length,
      cancelled: all.filter((j) => j.status === "cancelled").length,
    }),
    [all],
  );

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="eyebrow text-rust mb-2">/ DIG REGISTER</div>
          <h1 className="display text-5xl md:text-6xl">All digs.</h1>
          <p className="mt-3 text-sm text-muted">
            Updates every three seconds. Press{" "}
            <kbd className="mx-1 px-1.5 py-0.5 border border-line text-xs">⌘K</kbd>
            {" "}for the command palette.
          </p>
        </div>
        <Button asChild variant="rust"><Link href="/jobs/new"><Plus className="h-3 w-3 mr-2" /> New dig</Link></Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line">
        <nav className="flex items-center gap-1 -mb-px small-caps" aria-label="Filter digs by status">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-2 border-b transition-colors ${
                filter === f.id ? "border-rust text-fg" : "border-transparent text-muted hover:text-fg"
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-muted num">{counts[f.id] ?? 0}</span>
            </button>
          ))}
        </nav>
        <div className="relative w-full sm:w-72 mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          <Input
            placeholder="Filter by name or id"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
            aria-label="Filter digs"
          />
        </div>
      </div>

      <div>
        {q.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-12 skeleton" />)}
          </div>
        ) : all.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No digs yet."
            description="Begin your first dig to see it appear here."
            cta={{ href: "/jobs/new", label: "Begin a dig" }}
          />
        ) : filtered.length === 0 ? (
          <p className="text-center small-caps text-muted py-12 border border-dashed border-line">
            No digs match this filter.
          </p>
        ) : (
          <JobsTable jobs={filtered} />
        )}
      </div>
    </div>
  );
}
