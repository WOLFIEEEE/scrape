"use client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api } from "@/lib/api";

const STRATA = {
  0: "STRATUM 00 — Surface · HTTP only",
  1: "STRATUM 01 — Subsurface · + Browser",
  2: "STRATUM 02 — Deep · + CAPTCHA solver",
  3: "STRATUM 03 — Bedrock · + Managed unblock",
};

function parseUrlInput(value: string) {
  return value.split(/\s+/).map((s) => s.trim()).filter(Boolean);
}

function invalidUrls(value: string) {
  return parseUrlInput(value).filter((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol !== "http:" && parsed.protocol !== "https:";
    } catch {
      return true;
    }
  });
}

const schema = z.object({
  name: z.string().min(1, "name required").max(120),
  urls: z.string().min(1, "at least one URL").superRefine((value, ctx) => {
    const urls = parseUrlInput(value);
    const bad = invalidUrls(value);
    if (urls.length > 10_000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "maximum 10,000 URLs" });
    }
    if (bad.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `invalid URL${bad.length > 1 ? "s" : ""}: ${bad.slice(0, 3).join(", ")}`,
      });
    }
  }),
  max_tier: z.coerce.number().int().min(0).max(3),
  use_browser: z.boolean(),
  use_llm: z.boolean(),
  schema_name: z.string().max(80).optional(),
  extraction_schema: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewJobPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", urls: "", max_tier: 1, use_browser: true, use_llm: false },
  });
  const useLlm = watch("use_llm");
  const urlsValue = watch("urls");
  const liveUrls = parseUrlInput(urlsValue ?? "");
  const liveInvalid = invalidUrls(urlsValue ?? "").length;
  const liveValid = liveUrls.length - liveInvalid;

  const create = useMutation({
    mutationFn: api.createJob,
    onSuccess: (job) => {
      toast.success("Dig commenced.");
      router.push(`/jobs/${job.id}`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail : "Failed to file dig"),
  });

  function onSubmit(values: FormValues) {
    const urls = parseUrlInput(values.urls);
    if (urls.length === 0) {
      toast.error("No URLs to crawl");
      return;
    }
    let extractionSchema: Record<string, unknown> | undefined;
    if (values.use_llm && values.extraction_schema?.trim()) {
      try {
        extractionSchema = JSON.parse(values.extraction_schema);
      } catch {
        toast.error("Schema must be valid JSON");
        return;
      }
    }
    create.mutate({
      name: values.name,
      urls,
      max_tier: values.max_tier,
      use_browser: values.use_browser,
      use_llm: values.use_llm,
      schema_name: values.schema_name || undefined,
      extraction_schema: extractionSchema,
    });
  }

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <div className="eyebrow text-rust mb-2">/ FORM 05 · NEW DIG</div>
        <h1 className="display text-5xl md:text-6xl">File a new dig.</h1>
        <p className="mt-3 text-sm text-muted">URLs run concurrently with per-host rate limiting.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="border border-line">
        <div className="border-b border-line p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="eyebrow">Dig name</Label>
            <Input id="name" {...register("name")} placeholder="Q4 product prices" />
            {errors.name && <p className="text-xs text-rust">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="urls" className="eyebrow">URLs</Label>
              <span className="eyebrow num">
                <span className="text-fg">{liveValid}</span>
                <span className="text-muted"> VALID</span>
                {liveInvalid > 0 && <span className="text-rust"> · {liveInvalid} INVALID</span>}
              </span>
            </div>
            <Textarea
              id="urls"
              rows={9}
              className="text-xs"
              placeholder={`https://example.com/page-1\nhttps://example.com/page-2`}
              aria-invalid={Boolean(errors.urls)}
              {...register("urls")}
            />
            {errors.urls && <p className="text-xs text-rust">{errors.urls.message}</p>}
            <p className="text-xs text-muted">One URL per line. Whitespace-separated also works.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="max_tier" className="eyebrow">Max stratum</Label>
              <select
                id="max_tier"
                {...register("max_tier")}
                className="h-11 w-full bg-transparent border border-line px-3 font-mono text-sm text-fg focus:outline-none focus:border-fg focus-visible:ring-1 focus-visible:ring-rust"
              >
                {Object.entries(STRATA).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-3 pt-7">
              <label className="flex items-center gap-3 small-caps text-muted hover:text-fg cursor-pointer">
                <input type="checkbox" {...register("use_browser")} className="h-3.5 w-3.5 accent-rust" />
                Enable browser stratum
              </label>
              <label className="flex items-center gap-3 small-caps text-muted hover:text-fg cursor-pointer">
                <input type="checkbox" {...register("use_llm")} className="h-3.5 w-3.5 accent-rust" />
                Use LLM extraction
              </label>
            </div>
          </div>

          {useLlm && (
            <div className="space-y-6 pt-2 border-t border-line mt-4">
              <div className="space-y-2">
                <Label htmlFor="schema_name" className="eyebrow">Schema name</Label>
                <Input id="schema_name" {...register("schema_name")} placeholder="product" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="extraction_schema" className="eyebrow">JSON schema</Label>
                <Textarea
                  id="extraction_schema"
                  rows={10}
                  className="text-xs"
                  placeholder={JSON.stringify({ type: "object", properties: { title: { type: "string" }, price: { type: "number" } }, required: ["title"] }, null, 2)}
                  {...register("extraction_schema")}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 flex items-center justify-between gap-3 bg-bg-2/30">
          <p className="small-caps text-muted">Auto-escalates only on confirmed block.</p>
          <Button type="submit" variant="rust" disabled={create.isPending || liveValid === 0}>
            {create.isPending ? "Filing…" : `Begin dig${liveValid ? ` · ${liveValid} URLs` : ""}`}
          </Button>
        </div>
      </form>
    </div>
  );
}
