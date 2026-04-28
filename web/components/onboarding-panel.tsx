"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, ShoppingBag, BookOpen, Newspaper } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

const PRESETS = [
  {
    code: "/01",
    icon: ShoppingBag,
    name: "E-commerce sample",
    body: "Three Books to Scrape product pages — clean HTML, friendly to scrape, instant feedback.",
    job: {
      name: "Books to Scrape — sample",
      max_tier: 0,
      use_browser: false,
      use_llm: false,
      urls: [
        "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
        "https://books.toscrape.com/catalogue/sapiens-a-brief-history-of-humankind_996/index.html",
        "https://books.toscrape.com/catalogue/the-grand-design_405/index.html",
      ],
    },
  },
  {
    code: "/02",
    icon: BookOpen,
    name: "Quotes to Scrape",
    body: "Quotes & authors — useful when prototyping LLM extractors.",
    job: {
      name: "Quotes to Scrape — sample",
      max_tier: 0,
      use_browser: false,
      use_llm: false,
      urls: [
        "https://quotes.toscrape.com/page/1/",
        "https://quotes.toscrape.com/page/2/",
        "https://quotes.toscrape.com/page/3/",
      ],
    },
  },
  {
    code: "/03",
    icon: Newspaper,
    name: "HTTPBin diagnostics",
    body: "Echo + headers + cookies endpoints — verify your install end-to-end.",
    job: {
      name: "HTTPBin diagnostics",
      max_tier: 0,
      use_browser: false,
      use_llm: false,
      urls: [
        "https://httpbin.org/headers",
        "https://httpbin.org/cookies/set/scrape/yes",
        "https://httpbin.org/json",
      ],
    },
  },
];

export function OnboardingPanel() {
  const router = useRouter();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (job: { name: string; urls: string[]; max_tier: number; use_browser: boolean; use_llm: boolean }) =>
      api.createJob(job),
    onSuccess: (job) => {
      toast.success("Sample dig started");
      qc.invalidateQueries({ queryKey: ["jobs"] });
      router.push(`/jobs/${job.id}`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail : "Failed to start"),
  });

  return (
    <div className="border border-line">
      <div className="px-6 py-5 border-b border-line flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="eyebrow text-rust">/ FIRST DIG</div>
          <h2 className="display text-3xl mt-2">Pick a sample. We'll start it for you.</h2>
          <p className="text-sm text-muted mt-2 max-w-lg">
            Each preset uses scraper-friendly public sites. They run on Stratum 00 (HTTP only),
            need no API keys, and finish in seconds.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/jobs/new">Or build your own <ArrowUpRight className="ml-2 h-3 w-3" /></Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line">
        {PRESETS.map((p) => (
          <button
            key={p.code}
            type="button"
            onClick={() => create.mutate(p.job)}
            disabled={create.isPending}
            className="group text-left p-6 hover:bg-bg-2/40 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="eyebrow text-rust">{p.code}</span>
              <p.icon className="h-4 w-4 text-muted group-hover:text-rust transition-colors" />
            </div>
            <div className="display-up text-xl">{p.name}</div>
            <p className="mt-2 text-sm text-muted leading-relaxed">{p.body}</p>
            <div className="mt-4 small-caps text-rust opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1">
              Run sample <ArrowUpRight className="h-3 w-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
