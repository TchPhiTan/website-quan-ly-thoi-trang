export const API_BASE = (import.meta.env["VITE_API_BASE_URL"] as string | undefined) || "http://localhost:8080/api";

export async function request<T>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  if (!API_BASE) throw new Error("Chưa cấu hình VITE_API_BASE_URL");
  const res = await fetch(`${API_BASE}${path}`, { method, credentials: "include", headers: { "Content-Type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  if (!res.ok) {
    let message = `API ${method} ${path} lỗi ${res.status}`;
    try { const payload = await res.json() as { error?: string }; if (payload.error) message = payload.error; } catch { /* Response may not be JSON. */ }
    throw new Error(message);
  }
  return (await res.json()) as T;
}
