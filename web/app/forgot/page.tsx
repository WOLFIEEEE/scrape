"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { Logo } from "@/components/marketing/logo";

const schema = z.object({ email: z.string().email("invalid email") });
type V = z.infer<typeof schema>;

export default function ForgotPage() {
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<V>({ resolver: zodResolver(schema) });

  async function onSubmit({ email }: V) {
    setSubmitting(true);
    try {
      const res = await api.requestPasswordReset(email);
      setDone(true);
      if (res?.dev_token) setDevToken(res.dev_token);
    } catch {
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-10">
        <div className="flex justify-center"><Logo /></div>
        {done ? (
          <div className="space-y-6 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center border border-lichen text-lichen">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="eyebrow text-rust mb-2">/ FILED</div>
              <h1 className="display text-4xl">Check your email.</h1>
            </div>
            <p className="text-sm text-muted">
              If an account exists for that email, a reset link is on its way. Links expire in 30 minutes.
            </p>
            {devToken && (
              <div className="text-left border border-rust p-4 bg-bg-2/50 space-y-2">
                <div className="eyebrow text-rust">DEV MODE</div>
                <p className="text-xs text-muted">SMTP isn't configured. Use this link to reset:</p>
                <Link href={`/reset/${devToken}`} className="block break-all font-mono text-xs text-rust underline">
                  /reset/{devToken}
                </Link>
              </div>
            )}
            <p className="text-sm">
              <Link href="/login" className="text-rust underline underline-offset-4">Back to sign in</Link>
            </p>
          </div>
        ) : (
          <>
            <div>
              <div className="eyebrow text-rust mb-3">/ FORM 03 · RECOVERY</div>
              <h1 className="display text-4xl leading-[0.95]">Forgot your password?</h1>
              <p className="mt-3 text-sm text-muted">Enter your email; we'll send a reset link.</p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="eyebrow">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...register("email")} />
                {errors.email && <p className="text-xs text-rust">{errors.email.message}</p>}
              </div>
              <Button type="submit" variant="rust" className="w-full" disabled={submitting}>
                {submitting ? "Filing…" : "Send reset link"}
              </Button>
            </form>
            <p className="text-sm text-center text-muted">
              Remembered it?{" "}
              <Link href="/login" className="text-rust underline underline-offset-4">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
