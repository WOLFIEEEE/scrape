"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, Check, Copy, Key, Plus, Trash2, Webhook as WebhookIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { ApiError, api, type ApiKeyWithSecret } from "@/lib/api";
import { relativeTime } from "@/lib/utils";

export default function SettingsPage() {
  return (
    <div className="space-y-10">
      <div>
        <div className="eyebrow text-rust mb-2">/ CONTROL ROOM</div>
        <h1 className="display text-5xl md:text-6xl">Settings.</h1>
        <p className="text-muted mt-3 text-sm">
          Manage your profile, password, API keys, and webhooks.
        </p>
      </div>
      <UsageCard />
      <ProfileCard />
      <PasswordCard />
      <ApiKeysCard />
      <WebhooksCard />
      <DangerZone />
    </div>
  );
}

// --- Usage -----------------------------------------------------------------

function UsageCard() {
  const usageQ = useQuery({ queryKey: ["usage"], queryFn: api.usage, refetchInterval: 10_000 });
  if (!usageQ.data) return null;
  const u = usageQ.data;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage</CardTitle>
        <CardDescription>Current billing period: {u.period}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Plan" value={u.plan} />
          <Stat label="Used" value={u.used.toLocaleString()} />
          <Stat label="Remaining" value={u.remaining.toLocaleString()} />
          <Stat label="Concurrent jobs" value={u.concurrent_running} />
        </div>
        <div>
          <div className="flex items-center justify-between text-xs text-muted mb-1.5">
            <span>{u.used.toLocaleString()} / {u.quota.toLocaleString()} fetches</span>
            <span>{u.percent}%</span>
          </div>
          <div className="h-2 bg-bg-2 overflow-hidden">
            <div
              className={`h-full transition-all ${u.over_quota || u.percent > 80 ? "bg-rust" : "bg-lichen"}`}
              style={{ width: `${Math.min(100, u.percent)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

// --- Profile ---------------------------------------------------------------

const profileSchema = z.object({ name: z.string().max(80) });

function ProfileCard() {
  const meQ = useQuery({ queryKey: ["me"], queryFn: api.me });
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm<{ name: string }>({
    resolver: zodResolver(profileSchema),
    values: { name: meQ.data?.name ?? "" },
  });
  const m = useMutation({
    mutationFn: ({ name }: { name: string }) => api.updateProfile(name),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail : "Failed"),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>How you appear inside the app.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((v) => m.mutate(v))} className="space-y-4 max-w-sm">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={meQ.data?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" {...register("name")} />
          </div>
          <Button type="submit" disabled={m.isPending}>{m.isPending ? "Saving…" : "Save"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

// --- Password --------------------------------------------------------------

const passwordSchema = z.object({
  current_password: z.string().min(1, "required"),
  new_password: z.string().min(8, "min 8 characters").max(128),
  confirm: z.string(),
}).refine((d) => d.new_password === d.confirm, { message: "passwords don't match", path: ["confirm"] });

function PasswordCard() {
  type V = z.infer<typeof passwordSchema>;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<V>({ resolver: zodResolver(passwordSchema) });
  const m = useMutation({
    mutationFn: (v: V) => api.changePassword(v.current_password, v.new_password),
    onSuccess: () => {
      toast.success("Password updated");
      reset();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail : "Failed"),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Change your account password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((v) => m.mutate(v))} className="space-y-4 max-w-sm">
          <div className="space-y-2">
            <Label htmlFor="current_password">Current password</Label>
            <Input id="current_password" type="password" {...register("current_password")} />
            {errors.current_password && <p className="text-xs text-rust">{errors.current_password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_password">New password</Label>
            <Input id="new_password" type="password" {...register("new_password")} />
            {errors.new_password && <p className="text-xs text-rust">{errors.new_password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input id="confirm" type="password" {...register("confirm")} />
            {errors.confirm && <p className="text-xs text-rust">{errors.confirm.message}</p>}
          </div>
          <Button type="submit" disabled={m.isPending}>{m.isPending ? "Updating…" : "Update password"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

// --- API keys --------------------------------------------------------------

function ApiKeysCard() {
  const qc = useQueryClient();
  const keysQ = useQuery({ queryKey: ["api-keys"], queryFn: api.listKeys });
  const [name, setName] = useState("");
  const [reveal, setReveal] = useState<ApiKeyWithSecret | null>(null);
  const [copied, setCopied] = useState(false);

  const createM = useMutation({
    mutationFn: () => api.createKey(name || "untitled"),
    onSuccess: (key) => {
      toast.success("API key created");
      setReveal(key);
      setName("");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail : "Failed"),
  });
  const revokeM = useMutation({
    mutationFn: (id: number) => api.revokeKey(id),
    onSuccess: () => {
      toast.success("Key revoked");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail : "Failed"),
  });

  const keys = keysQ.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Key className="h-4 w-4" /> API keys</CardTitle>
        <CardDescription>Use bearer tokens to call the API from servers and CI.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-end gap-2">
          <div className="space-y-2 flex-1 max-w-xs">
            <Label htmlFor="key-name">Name</Label>
            <Input id="key-name" placeholder="prod-pipeline" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={() => createM.mutate()} disabled={createM.isPending}>
            <Plus className="h-4 w-4 mr-2" /> Create key
          </Button>
        </div>

        {reveal && (
          <div className="border border-rust bg-rust/5 p-4">
            <div className="text-sm font-semibold text-rust">
              Save this key — you won't see it again
            </div>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 font-mono text-xs bg-bg border border-line px-3 py-2 break-all">
                {reveal.secret}
              </code>
              <Button
                size="sm" variant="outline"
                aria-label="Copy API key"
                onClick={() => {
                  navigator.clipboard.writeText(reveal.secret).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  });
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setReveal(null)}>Done</Button>
            </div>
          </div>
        )}

        {keys.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">No keys yet.</p>
        ) : (
          <div className="border border-line overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-2/40">
                <tr>
                  <Th>Name</Th><Th>Prefix</Th><Th>Last used</Th><Th>Created</Th><Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-t border-line">
                    <td className="px-3 py-2 font-medium">
                      {k.name}
                      {k.revoked && <Badge variant="secondary" className="ml-2">revoked</Badge>}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{k.prefix}…</td>
                    <td className="px-3 py-2 text-muted">{k.last_used_at ? relativeTime(k.last_used_at) : "—"}</td>
                    <td className="px-3 py-2 text-muted">{relativeTime(k.created_at)}</td>
                    <td className="px-3 py-2 text-right">
                      {!k.revoked && (
                        <Button size="sm" variant="ghost" onClick={() => revokeM.mutate(k.id)}>Revoke</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Webhooks --------------------------------------------------------------

const webhookSchema = z.object({
  url: z.string().url("invalid URL"),
});

function WebhooksCard() {
  const qc = useQueryClient();
  const hooksQ = useQuery({ queryKey: ["webhooks"], queryFn: api.listWebhooks });
  type V = z.infer<typeof webhookSchema>;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<V>({ resolver: zodResolver(webhookSchema) });

  const createM = useMutation({
    mutationFn: (v: V) => api.createWebhook(v.url, ["job.completed", "job.failed"]),
    onSuccess: () => { toast.success("Webhook added"); reset(); qc.invalidateQueries({ queryKey: ["webhooks"] }); },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail : "Failed"),
  });
  const deleteM = useMutation({
    mutationFn: (id: number) => api.deleteWebhook(id),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["webhooks"] }); },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail : "Failed"),
  });

  const hooks = hooksQ.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><WebhookIcon className="h-4 w-4" /> Webhooks</CardTitle>
        <CardDescription>HMAC-signed callbacks on job state changes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit((v) => createM.mutate(v))} className="flex items-end gap-2">
          <div className="space-y-2 flex-1">
            <Label htmlFor="hook-url">Endpoint URL</Label>
            <Input id="hook-url" placeholder="https://your-api.com/scrape-hook" {...register("url")} />
            {errors.url && <p className="text-xs text-rust">{errors.url.message}</p>}
          </div>
          <Button type="submit" disabled={createM.isPending}><Plus className="h-4 w-4 mr-2" /> Add</Button>
        </form>

        {hooks.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">No webhooks configured.</p>
        ) : (
          <div className="space-y-3">
            {hooks.map((h) => (
              <div key={h.id} className="border border-line p-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm break-all">{h.url}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {h.events.map((e) => (
                      <span key={e} className="text-[10px] font-mono uppercase border border-line px-1.5 py-0.5 text-muted">{e}</span>
                    ))}
                  </div>
                  <div className="text-xs text-muted mt-2 flex items-center gap-2 flex-wrap">
                    <span>Secret:</span>
                    <code className="font-mono">{h.secret.slice(0, 14)}…</code>
                    <CopyButton text={h.secret} label="copy" />
                    <span>·</span>
                    <span>{h.last_status ? `last ${h.last_status} ${relativeTime(h.last_attempt_at)}` : "never delivered"}</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" aria-label="Delete webhook" onClick={() => deleteM.mutate(h.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Danger zone -----------------------------------------------------------

function DangerZone() {
  const router = useRouter();
  const m = useMutation({
    mutationFn: () => api.deleteAccount(),
    onSuccess: () => { toast.success("Account deleted"); router.push("/login"); router.refresh(); },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail : "Failed"),
  });
  function confirmDelete() {
    if (!confirm("Permanently delete your account and all jobs? This can't be undone.")) return;
    if (!confirm("Really? This is forever.")) return;
    m.mutate();
  }
  return (
    <Card className="border-rust">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-rust">
          <AlertTriangle className="h-4 w-4" /> Danger zone
        </CardTitle>
        <CardDescription>Irreversible operations.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={confirmDelete} disabled={m.isPending}>
          <Trash2 className="h-4 w-4 mr-2" /> Delete account
        </Button>
      </CardContent>
    </Card>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th scope="col" className={`px-3 py-2 font-medium text-xs uppercase text-muted text-left ${className ?? ""}`}>{children}</th>;
}
