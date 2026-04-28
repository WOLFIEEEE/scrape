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
  password: z.string().min(8, "min 8 characters").max(128),
  name: z.string().max(80).optional(),
});
type FormValues = z.infer<typeof schema>;

const PERKS = [
  "10,000 free fetches every month",
  "All strata usable with your own keys",
  "Self-host or use the managed cloud",
  "No credit card required",
];

export default function RegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await api.register({ email: values.email, password: values.password, name: values.name });
      toast.success("Dig site established.");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.detail : "Registration failed");
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
            <div className="eyebrow text-rust">/ INTAKE</div>
            <h2 className="display text-5xl leading-[0.95]">
              Begin the<br />
              <span className="text-rust">excavation.</span>
            </h2>
            <ul className="mt-2 space-y-3">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-muted">
                  <span className="text-rust mt-1">→</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="small-caps text-muted">First user becomes site administrator.</div>
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-10">
          <div className="lg:hidden flex justify-center"><Logo /></div>
          <div>
            <div className="eyebrow text-rust mb-3">/ FORM 02 · INTAKE</div>
            <h1 className="display text-5xl leading-[0.95]">Create your account.</h1>
            <p className="mt-3 text-sm text-muted">Free forever · no credit card.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="eyebrow">Name <span className="opacity-50">(optional)</span></Label>
              <Input id="name" placeholder="Ada Lovelace" {...register("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="eyebrow">Email</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
              {errors.email && <p className="text-xs text-rust">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="eyebrow">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
              {errors.password && <p className="text-xs text-rust">{errors.password.message}</p>}
            </div>
            <Button type="submit" variant="rust" disabled={submitting} className="w-full">
              {submitting ? "Filing…" : "File intake"}
            </Button>
            <p className="text-[11px] text-muted text-center">
              By creating an account you agree to our{" "}
              <Link href="/terms" className="underline">Terms</Link> and{" "}
              <Link href="/privacy" className="underline">Privacy</Link>.
            </p>
          </form>

          <p className="text-sm text-center text-muted">
            Already filed?{" "}
            <Link href="/login" className="text-rust underline underline-offset-4">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
