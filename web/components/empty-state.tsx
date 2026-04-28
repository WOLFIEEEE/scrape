import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="relative border border-dashed border-line p-14 text-center overflow-hidden bg-bg-2/30">
      <div className="absolute inset-0 dig-grid dig-fade opacity-30 pointer-events-none"></div>
      <div className="relative">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center border border-line">
          <Icon className="h-5 w-5 text-muted" />
        </div>
        <div className="eyebrow text-rust mt-6">/ EMPTY SITE</div>
        <h3 className="display text-3xl mt-3">{title}</h3>
        <p className="mt-3 text-sm text-muted max-w-sm mx-auto leading-relaxed">{description}</p>
        {cta && (
          <Button asChild variant="rust" className="mt-7">
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
