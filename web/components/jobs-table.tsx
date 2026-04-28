"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { JobListItem, JobStatus } from "@/lib/api";
import { relativeTime } from "@/lib/utils";

const STATUS_VARIANT: Record<JobStatus, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  pending: "secondary",
  running: "warning",
  completed: "success",
  failed: "destructive",
  cancelled: "secondary",
};

export function JobsTable({ jobs }: { jobs: JobListItem[] }) {
  return (
    <div className="border border-line overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line">
            <Th>Dig</Th>
            <Th>Status</Th>
            <Th className="text-right">Progress</Th>
            <Th className="text-right">Yield</Th>
            <Th>Filed</Th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j, i) => (
            <tr key={j.id} className={`border-line hover:bg-bg-2/40 transition-colors ${i < jobs.length - 1 ? "border-b" : ""}`}>
              <Td>
                <Link href={`/jobs/${j.id}`} className="x-link display-up text-base">{j.name}</Link>
                <div className="text-[10px] text-muted font-mono mt-0.5">{j.id}</div>
              </Td>
              <Td>
                <Badge variant={STATUS_VARIANT[j.status]}>{j.status}</Badge>
              </Td>
              <Td className="text-right num">
                <span className="text-fg">{j.completed}</span>
                <span className="text-muted"> / {j.total}</span>
              </Td>
              <Td className="text-right num">
                <span className={j.total > 0 && j.succeeded / j.total < 0.9 ? "text-rust" : "text-fg"}>
                  {j.total > 0 ? `${Math.round((j.succeeded / j.total) * 100)}%` : "—"}
                </span>
              </Td>
              <Td className="text-muted small-caps">{relativeTime(j.created_at)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th scope="col" className={`px-4 py-2.5 eyebrow text-left ${className ?? ""}`}>{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className ?? ""}`}>{children}</td>;
}
