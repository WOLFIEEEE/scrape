import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

export function relativeTime(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s).getTime();
  const diff = Math.round((Date.now() - d) / 1000);
  const abs = Math.abs(diff);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [3600, "minute"],
    [86400, "hour"],
    [604800, "day"],
    [2629800, "week"],
    [31557600, "month"],
  ];
  for (let i = 0; i < units.length; i++) {
    const [limit, unit] = units[i];
    if (abs < limit) {
      const prev = i === 0 ? 1 : units[i - 1][0];
      const value = Math.round(diff / prev);
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-value, unit);
    }
  }
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
    -Math.round(diff / 31557600),
    "year",
  );
}
