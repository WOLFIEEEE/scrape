"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { JobsTable } from "@/components/jobs-table";
import { OnboardingPanel } from "@/components/onboarding-panel";

export default function DashboardPage() {
  const meQ = useQuery({ queryKey: ["me"], queryFn: api.me });
  const jobsQ = useQuery({ queryKey: ["jobs"], queryFn: api.listJobs, refetchInterval: 3_000 });
  const usageQ = useQuery({ queryKey: ["usage"], queryFn: api.usage, refetchInterval: 10_000 });
  const jobs = jobsQ.data ?? [];

  const total = jobs.length;
  const running = jobs.filter((j) => j.status === "running" || j.status === "pending").length;
  const completed = jobs.filter((j) => j.status === "completed").length;
  const failed = jobs.filter((j) => j.status === "failed").length;
  const totalUrls = jobs.reduce((acc, j) => acc + (j.total ?? 0), 0);
  const okUrls = jobs.reduce((acc, j) => acc + (j.succeeded ?? 0), 0);
  const successRate = totalUrls > 0 ? Math.round((okUrls / totalUrls) * 100) : 0;

  const greeting = meQ.data?.name || meQ.data?.email?.split("@")[0] || "operator";

  return (
    <div className="space-y-12">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="eyebrow text-rust mb-2">/ SITE LOG · OVERVIEW</div>
          <h1 className="display text-5xl md:text-6xl">
            Welcome back,<br />
            <span className="text-rust">{greeting}.</span>
          </h1>
        </div>
        <Button asChild variant="rust">
          <Link href="/jobs/new"><Plus className="h-3 w-3 mr-2" /> New dig</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 border border-line">
        <Stat code="/01" label="TOTAL DIGS" value={total} />
        <Stat code="/02" label="ACTIVE" value={running} accent={running > 0} />
        <Stat code="/03" label="COMPLETED" value={completed} />
        <Stat code="/04" label="YIELD" value={`${successRate}%`} hint={`${okUrls}/${totalUrls}`} />
      </div>

      {usageQ.data && (
        <div className="border border-line p-6 bg-bg-2/30">
          <div className="flex items-center justify-between mb-4">
            <div className="eyebrow">QUOTA · {usageQ.data.period}</div>
            <div className="text-xs text-muted">
              <span className="text-fg num">{usageQ.data.used.toLocaleString()}</span>
              <span> / </span>
              <span className="num">{usageQ.data.quota.toLocaleString()}</span>
              <span className="ml-2 text-muted">FETCHES</span>
            </div>
          </div>
          <div className="h-1 bg-bg-2 overflow-hidden">
            <div
              className={`h-full transition-all ${usageQ.data.over_quota ? "bg-rust" : usageQ.data.percent > 80 ? "bg-rust" : "bg-lichen"}`}
              style={{ width: `${Math.min(100, usageQ.data.percent)}%` }}
            />
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="eyebrow">/ RECENT DIGS</div>
          {jobs.length > 0 && (
            <Link href="/jobs" className="x-link small-caps text-muted">View all</Link>
          )}
        </div>
        {jobsQ.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-12 skeleton" />)}
          </div>
        ) : jobs.length === 0 ? (
          <OnboardingPanel />
        ) : (
          <JobsTable jobs={jobs.slice(0, 10)} />
        )}
      </div>

      {failed > 0 && (
        <p className="small-caps text-muted">
          {failed} failed dig{failed > 1 ? "s" : ""} — open them for details.
        </p>
      )}
    </div>
  );
}

function Stat({ code, label, value, hint, accent }: { code: string; label: string; value: string | number; hint?: string; accent?: boolean }) {
  return (
    <div className="p-6 border-line first:border-l-0 border-l">
      <div className="flex items-center justify-between mb-3">
        <div className="eyebrow text-rust">{code}</div>
        <div className="eyebrow">{label}</div>
      </div>
      <div className={`display text-5xl num ${accent ? "text-rust" : ""}`}>{value}</div>
      {hint && <div className="small-caps text-muted mt-1">{hint}</div>}
    </div>
  );
}
