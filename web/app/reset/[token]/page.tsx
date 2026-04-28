"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  password: z.string().min(8, "min 8 characters").max(128),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "passwords don't match", path: ["confirm"] });

type V = z.infer<typeof schema>;

export default function ResetPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<V>({ resolver: zodResolver(schema) });

  async function onSubmit({ password }: V) {
    setSubmitting(true);
    try {
      await api.resetPassword(params.token, password);
      toast.success("Password updated. Sign in.");
      router.push("/login");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.detail : "Reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-10">
        <div className="flex justify-center"><Logo /></div>
        <div>
          <div className="eyebrow text-rust mb-3">/ FORM 04 · RESET</div>
          <h1 className="display text-4xl leading-[0.95]">Choose a new password.</h1>
          <p className="mt-3 text-sm text-muted">Use 8+ characters. We'll log you out everywhere else.</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password" className="eyebrow">New password</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
            {errors.password && <p className="text-xs text-rust">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm" className="eyebrow">Confirm</Label>
            <Input id="confirm" type="password" autoComplete="new-password" {...register("confirm")} />
            {errors.confirm && <p className="text-xs text-rust">{errors.confirm.message}</p>}
          </div>
          <Button type="submit" variant="rust" className="w-full" disabled={submitting}>
            {submitting ? "Updating…" : "Update password"}
          </Button>
        </form>
        <p className="text-sm text-center text-muted">
          <Link href="/login" className="text-rust underline underline-offset-4">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
