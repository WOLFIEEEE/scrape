"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api";
import { Logo } from "@/components/marketing/logo";

const schema = z.object({
  email: z.string().email("invalid email"),
  password: z.string().min(1, "password required"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await api.login(values);
      toast.success("Returned to the dig.");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.detail : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex flex-1 relative border-r border-line bg-bg-2/40">
        <div className="absolute inset-0 dig-grid dig-fade opacity-40 pointer-events-none"></div>
        <div className="relative flex flex-col justify-between p-14 w-full">
          <Logo />
          <div className="max-w-sm space-y-6">
            <div className="eyebrow text-rust">/ ENTRY</div>
            <h2 className="display text-5xl leading-[0.95]">
              Resume<br />
              <span className="text-rust">the excavation.</span>
            </h2>
            <p className="text-muted leading-relaxed">
              Production-grade scraping infrastructure trusted by data teams shipping in 2026.
            </p>
          </div>
          <div className="small-caps text-muted">
            <span className="inline-flex h-2 w-2 bg-lichen animate-pulse-dot mr-2"></span>
            All systems nominal
          </div>
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-10">
          <div className="lg:hidden flex justify-center"><Logo /></div>
          <div>
            <div className="eyebrow text-rust mb-3">/ FORM 01 · LOGIN</div>
            <h1 className="display text-5xl leading-[0.95]">Welcome back.</h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="eyebrow">Email</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
              {errors.email && <p className="text-xs text-rust">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="eyebrow">Password</Label>
                <Link href="/forgot" className="x-link text-xs text-muted">Forgot?</Link>
              </div>
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
              {errors.password && <p className="text-xs text-rust">{errors.password.message}</p>}
            </div>
            <Button type="submit" variant="rust" disabled={submitting} className="w-full">
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="text-sm text-center text-muted">
            New here?{" "}
            <Link href="/register" className="text-rust underline underline-offset-4">Begin a dig</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
