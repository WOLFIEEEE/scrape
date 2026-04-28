import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-baseline gap-1.5 ${className}`}
      aria-label="Scrape — home"
    >
      <span className="display-up text-[20px] leading-none">Scrape</span>
      <span className="eyebrow text-rust transition-opacity group-hover:opacity-100 opacity-90">/01</span>
    </Link>
  );
}
