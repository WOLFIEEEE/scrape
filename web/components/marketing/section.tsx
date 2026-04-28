import { cn } from "@/lib/utils";

export function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("container mx-auto max-w-6xl px-6 py-20", className)}>
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" ? "mx-auto text-center" : "")}>
      {eyebrow && <div className="eyebrow mb-4">{eyebrow}</div>}
      <h2 className="display text-5xl md:text-6xl">{title}</h2>
      {description && (
        <p className="text-base md:text-lg text-muted mt-6 leading-relaxed max-w-2xl mx-auto">
          {description}
        </p>
      )}
    </div>
  );
}
