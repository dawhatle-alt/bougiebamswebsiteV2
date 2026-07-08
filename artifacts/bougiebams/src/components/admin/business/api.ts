// Single place the Business HQ section talks to the API from. Admin session
// cookie auth (credentials: include); 401/403 responses are routed to the
// admin shell's onAuthError via the handler BusinessManager registers.

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${API_BASE}/api/admin/business`;

let authErrorHandler: ((status: number) => void) | null = null;

export function setBusinessAuthErrorHandler(fn: ((status: number) => void) | null) {
  authErrorHandler = fn;
}

export async function bizFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API}${path}`, { ...init, headers, credentials: "include" });
  if ((res.status === 401 || res.status === 403) && authErrorHandler) {
    authErrorHandler(res.status);
  }
  return res;
}

export async function bizJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await bizFetch(path, init);
  if (!res.ok) throw new Error(`API request failed: ${res.status} ${path}`);
  return res.json() as Promise<T>;
}
