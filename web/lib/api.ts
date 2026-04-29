// API client. All paths go through Next's rewrite to /api/* so we keep
// cookies same-origin and avoid CORS dance.
//
// Throws ApiError on non-2xx so React Query knows to mark queries as failed.

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(`API ${status}: ${detail}`);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail || JSON.stringify(body);
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- Types -----------------------------------------------------------------

export interface User {
  id: number;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
  email_verified: boolean;
}

export type JobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface JobListItem {
  id: string;
  name: string;
  status: JobStatus;
  total: number;
  completed: number;
  succeeded: number;
  created_at: string;
}

export interface Job {
  id: string;
  name: string;
  status: JobStatus;
  max_tier: number;
  use_browser: boolean;
  use_llm: boolean;
  total: number;
  completed: number;
  succeeded: number;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface FetchRow {
  id: number;
  url: string;
  final_url: string;
  status: number;
  tier_used: number;
  block_reason: string;
  elapsed_ms: number;
  body_size: number;
  fetched_at: string;
}

export interface ExtractedRow {
  id: number;
  url: string;
  schema_name: string;
  data: Record<string, unknown>;
  confidence: number;
  extracted_at: string;
}

export interface JobCreateInput {
  name: string;
  urls: string[];
  max_tier: number;
  use_browser: boolean;
  use_llm: boolean;
  schema_name?: string;
  extraction_schema?: Record<string, unknown>;
}

export interface ApiKey {
  id: number;
  name: string;
  prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked: boolean;
}
export interface ApiKeyWithSecret extends ApiKey { secret: string; }
export interface Webhook {
  id: number;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  last_status: number | null;
  last_attempt_at: string | null;
  created_at: string;
}
export interface Usage {
  plan: string;
  quota: number;
  used: number;
  remaining: number;
  period: string;
  percent: number;
  over_quota: boolean;
  concurrent_running: number;
}

// --- Endpoints -------------------------------------------------------------

export const api = {
  // auth
  register: (body: { email: string; password: string; name?: string }) =>
    request<User>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<User>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  me: () => request<User>("/api/auth/me"),

  // jobs
  listJobs: () => request<JobListItem[]>("/api/jobs"),
  getJob: (id: string) => request<Job>(`/api/jobs/${id}`),
  createJob: (body: JobCreateInput) =>
    request<Job>("/api/jobs", { method: "POST", body: JSON.stringify(body) }),
  cancelJob: (id: string) =>
    request<Job>(`/api/jobs/${id}/cancel`, { method: "POST" }),
  duplicateJob: (id: string) =>
    request<Job>(`/api/jobs/${id}/duplicate`, { method: "POST" }),
  deleteJob: (id: string) =>
    request<void>(`/api/jobs/${id}`, { method: "DELETE" }),
  jobFetches: (id: string) =>
    request<FetchRow[]>(`/api/jobs/${id}/fetches?limit=500`),
  jobExtracted: (id: string) =>
    request<ExtractedRow[]>(`/api/jobs/${id}/extracted?limit=500`),

  // account
  changePassword: (current_password: string, new_password: string) =>
    request<void>("/api/account/password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),
  updateProfile: (name: string) =>
    request<User>("/api/account/profile", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteAccount: () => request<void>("/api/account", { method: "DELETE" }),

  // password reset
  requestPasswordReset: (email: string) =>
    request<{ sent: boolean; dev_token?: string }>("/api/auth/forgot", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, new_password: string) =>
    request<void>("/api/auth/reset", {
      method: "POST",
      body: JSON.stringify({ token, new_password }),
    }),

  // email verification
  verifyEmail: (token: string) =>
    request<{ verified: boolean; email: string | null }>("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  resendVerification: (email: string) =>
    request<{ sent: boolean }>("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  // api keys
  listKeys: () => request<ApiKey[]>("/api/keys"),
  createKey: (name: string) =>
    request<ApiKeyWithSecret>("/api/keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  revokeKey: (id: number) => request<void>(`/api/keys/${id}`, { method: "DELETE" }),

  // webhooks
  listWebhooks: () => request<Webhook[]>("/api/webhooks"),
  createWebhook: (url: string, events: string[]) =>
    request<Webhook>("/api/webhooks", {
      method: "POST",
      body: JSON.stringify({ url, events }),
    }),
  deleteWebhook: (id: number) =>
    request<void>(`/api/webhooks/${id}`, { method: "DELETE" }),

  // usage
  usage: () => request<Usage>("/api/usage"),
};
