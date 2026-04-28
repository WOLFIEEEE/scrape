import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/marketing/logo";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 dig-grid dig-fade opacity-30 pointer-events-none"></div>
      <div className="relative max-w-xl">
        <div className="flex justify-center mb-8"><Logo /></div>
        <div className="eyebrow text-rust mb-4">/ STRATUM NOT FOUND</div>
        <h1 className="display text-[28vw] sm:text-[14rem] leading-[0.85] text-fg num">404</h1>
        <p className="mt-6 text-muted leading-relaxed max-w-md mx-auto">
          The bureau has searched the index. Whatever you came looking for has either been
          unfiled, never excavated, or is buried under a stratum we haven't dug yet.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <Button asChild variant="rust"><Link href="/home">Return to surface</Link></Button>
          <Button asChild variant="outline"><Link href="/docs">Consult the manual</Link></Button>
        </div>
      </div>
    </div>
  );
}
