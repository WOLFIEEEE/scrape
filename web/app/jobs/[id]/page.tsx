"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { ApiError, api, type JobStatus } from "@/lib/api";
import { formatDate, relativeTime } from "@/lib/utils";

const STATUS_VARIANT: Record<JobStatus, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  pending: "secondary",
  running: "warning",
  completed: "success",
  failed: "destructive",
  cancelled: "secondary",
};

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"extracted" | "fetches">("extracted");

  const jobQ = useQuery({
    queryKey: ["job", id],
    queryFn: () => api.getJob(id),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "pending" || s === "running" ? 1000 : false;
    },
  });

  const fetchesQ = useQuery({
    queryKey: ["job-fetches", id],
    queryFn: () => api.jobFetches(id),
    refetchInterval: () => (jobQ.data?.status === "pending" || jobQ.data?.status === "running" ? 2000 : false),
    enabled: tab === "fetches",
  });

  const extractedQ = useQuery({
    queryKey: ["job-extracted", id],
    queryFn: () => api.jobExtracted(id),
    refetchInterval: () => (jobQ.data?.status === "pending" || jobQ.data?.status === "running" ? 2000 : false),
    enabled: tab === "extracted",
  });
  const jobStatus = jobQ.data?.status;

  useEffect(() => {
    if (jobStatus !== "running" && jobStatus !== "pending") return;
    const es = new EventSource(`/api/jobs/${id}/events`, { withCredentials: true });
    es.addEventListener("progress", () => {
      qc.invalidateQueries({ queryKey: ["job", id] });
    });
    es.onerror = () => es.close();
    return () => es.close();
  }, [id, jobStatus, qc]);

  const cancelM = useMutation({
    mutationFn: () => api.cancelJob(id),
    onSuccess: () => { toast.success("Cancellation requested"); qc.invalidateQueries({ queryKey: ["job", id] }); },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail : "Cancel failed"),
  });
  const deleteM = useMutation({
    mutationFn: () => api.deleteJob(id),
    onSuccess: () => { toast.success("Dig deleted"); router.push("/jobs"); },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail : "Delete failed"),
  });
  const duplicateM = useMutation({
    mutationFn: () => api.duplicateJob(id),
    onSuccess: (j) => {
      toast.success("Re-run filed");
      qc.invalidateQueries({ queryKey: ["jobs"] });
      router.push(`/jobs/${j.id}`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail : "Duplicate failed"),
  });

  const job = jobQ.data;
  if (jobQ.isLoading) return <p className="text-muted small-caps">Loading…</p>;
  if (!job) return <p className="text-rust">Dig not found.</p>;

  const live = job.status === "pending" || job.status === "running";
  const pct = job.total > 0 ? Math.round((job.completed / job.total) * 100) : 0;
  const successPct = job.total > 0 ? Math.round((job.succeeded / job.total) * 100) : 0;

  return (
    <div className="space-y-10">
      <Link href="/jobs" className="x-link inline-flex items-center gap-1.5 small-caps text-muted">
        <ArrowLeft className="h-3 w-3" /> All digs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Badge variant={STATUS_VARIANT[job.status]}>{job.status}</Badge>
            {live && <span className="inline-flex items-center gap-1.5 small-caps text-lichen">
              <span className="h-2 w-2 bg-lichen animate-pulse-dot"></span> EXCAVATING
            </span>}
          </div>
          <h1 className="display text-5xl md:text-6xl leading-[0.95]">{job.name}</h1>
          <p className="text-xs text-muted mt-3 font-mono inline-flex items-center gap-2">
            id · {job.id}
            <CopyButton text={job.id} />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!live && (
            <Button variant="outline" size="sm" onClick={() => duplicateM.mutate()} disabled={duplicateM.isPending}>
              <RotateCcw className="h-3 w-3 mr-2" /> Re-run
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <a href={`/api/jobs/${id}/export.json`} download><Download className="h-3 w-3 mr-2" /> JSON</a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/jobs/${id}/export.csv`} download><Download className="h-3 w-3 mr-2" /> CSV</a>
          </Button>
          {live && (
            <Button variant="outline" size="sm" onClick={() => cancelM.mutate()} disabled={cancelM.isPending}>
              <X className="h-3 w-3 mr-2" /> Cancel
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { if (confirm("Delete this dig? Findings stay in the DB.")) deleteM.mutate(); }}
            disabled={deleteM.isPending}
          >
            <Trash2 className="h-3 w-3 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 border border-line">
        <Stat code="/01" label="PROGRESS" value={`${job.completed}/${job.total}`} hint={`${pct}%`} />
        <Stat code="/02" label="YIELD" value={job.succeeded} hint={`${successPct}%`} />
        <Stat code="/03" label="MAX STRATUM" value={`0${job.max_tier}`} hint={job.use_browser ? "BROWSER ON" : "BROWSER OFF"} />
        <Stat code="/04" label="FILED" value={relativeTime(job.created_at)} hint={formatDate(job.created_at)} />
      </div>

      {/* Live progress bar when running */}
      {live && job.total > 0 && (
        <div>
          <div className="eyebrow mb-2 text-rust">/ EXCAVATION DEPTH</div>
          <div className="h-1 bg-bg-2 overflow-hidden">
            <div className="h-full bg-rust transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {job.error && (
        <div className="border border-rust p-6 bg-rust/5">
          <div className="eyebrow text-rust mb-2">/ FAILURE LOG</div>
          <pre className="text-sm font-mono whitespace-pre-wrap text-rust">{job.error}</pre>
        </div>
      )}

      <div>
        <div className="flex items-center gap-1 border-b border-line" role="tablist" aria-label="Job results">
          <TabBtn active={tab === "extracted"} onClick={() => setTab("extracted")}>
            Findings · {extractedQ.data?.length ?? 0}
          </TabBtn>
          <TabBtn active={tab === "fetches"} onClick={() => setTab("fetches")}>
            Fetches · {fetchesQ.data?.length ?? 0}
          </TabBtn>
        </div>
        <div className="mt-4">
          {tab === "extracted" && <ExtractedTable rows={extractedQ.data ?? []} loading={extractedQ.isLoading} />}
          {tab === "fetches" && <FetchesTable rows={fetchesQ.data ?? []} loading={fetchesQ.isLoading} />}
        </div>
      </div>
    </div>
  );
}

function Stat({ code, label, value, hint }: { code: string; label: string; value: string | number; hint?: string }) {
  return (
    <div className="p-5 border-line first:border-l-0 border-l">
      <div className="flex items-center justify-between">
        <div className="eyebrow text-rust">{code}</div>
        <div className="eyebrow">{label}</div>
      </div>
      <div className="display text-3xl mt-3 num">{value}</div>
      {hint && <div className="small-caps text-muted mt-1">{hint}</div>}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-4 py-2.5 -mb-px small-caps border-b transition-colors ${active ? "border-rust text-fg" : "border-transparent text-muted hover:text-fg"}`}
    >
      {children}
    </button>
  );
}

function ExtractedTable({ rows, loading }: { rows: Array<{ id: number; url: string; data: Record<string, unknown>; confidence: number; extracted_at: string }>; loading: boolean }) {
  if (loading) return <p className="small-caps text-muted">Loading…</p>;
  if (rows.length === 0) return <p className="small-caps text-muted">No findings yet.</p>;
  const cols = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r.data)) cols.add(k);
  cols.delete("url");
  const colList = ["url", ...Array.from(cols)];
  return (
    <div className="border border-line overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line">
            {colList.map((c) => <th key={c} scope="col" className="text-left px-3 py-2 eyebrow">{c}</th>)}
            <th scope="col" className="text-right px-3 py-2 eyebrow">CONF</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={`align-top hover:bg-bg-2/40 ${i < rows.length - 1 ? "border-b border-line" : ""}`}>
              {colList.map((c) => {
                const v = c === "url" ? r.url : r.data[c];
                return (
                  <td key={c} className="px-3 py-2 max-w-md break-words">
                    {c === "url" ? (
                      <a href={r.url} target="_blank" rel="noreferrer" className="x-link font-mono text-xs">{r.url}</a>
                    ) : v == null ? (
                      <span className="text-muted">—</span>
                    ) : typeof v === "object" ? (
                      <code className="text-xs">{JSON.stringify(v)}</code>
                    ) : (
                      <span className="text-sm">{String(v).slice(0, 200)}</span>
                    )}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right num text-muted">{r.confidence.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FetchesTable({ rows, loading }: { rows: Array<{ id: number; url: string; status: number; tier_used: number; block_reason: string; elapsed_ms: number; body_size: number; fetched_at: string }>; loading: boolean }) {
  if (loading) return <p className="small-caps text-muted">Loading…</p>;
  if (rows.length === 0) return <p className="small-caps text-muted">No fetches yet.</p>;
  return (
    <div className="border border-line overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line">
            <Th>URL</Th><Th>Status</Th><Th>Stratum</Th><Th>Block</Th>
            <Th className="text-right">MS</Th><Th className="text-right">SIZE</Th><Th>WHEN</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={`hover:bg-bg-2/40 ${i < rows.length - 1 ? "border-b border-line" : ""}`}>
              <td className="px-3 py-2 font-mono text-xs max-w-md break-words"><a href={r.url} target="_blank" rel="noreferrer" className="x-link">{r.url}</a></td>
              <td className="px-3 py-2"><Badge variant={r.status >= 200 && r.status < 400 ? "success" : "destructive"}>{r.status}</Badge></td>
              <td className="px-3 py-2 num">0{r.tier_used}</td>
              <td className="px-3 py-2 small-caps text-muted">{r.block_reason}</td>
              <td className="px-3 py-2 text-right num">{r.elapsed_ms}</td>
              <td className="px-3 py-2 text-right num">{r.body_size}</td>
              <td className="px-3 py-2 small-caps text-muted">{relativeTime(r.fetched_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th scope="col" className={`px-3 py-2 eyebrow text-left ${className ?? ""}`}>{children}</th>;
}
