export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  if (r.status === 401) {
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "demo@filmcraft.ai", password: "demo1234" }) }).catch(() => null);
    const r2 = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
    if (!r2.ok) throw new Error((await r2.json().catch(() => ({})))?.error?.message ?? r2.statusText);
    return r2.json() as Promise<T>;
  }
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error?.message ?? r.statusText);
  return r.json() as Promise<T>;
}
