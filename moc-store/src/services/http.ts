// Khi có backend: đặt VITE_API_BASE_URL (xem .env.example) và dùng request() trong các service.
export const API_BASE = import.meta.env["VITE_API_BASE_URL"] as string | undefined;

export async function request<T>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  if (!API_BASE) throw new Error("Chưa cấu hình VITE_API_BASE_URL");
  const res = await fetch(`${API_BASE}${path}`, { method, headers: { "Content-Type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  if (!res.ok) throw new Error(`API ${method} ${path} lỗi ${res.status}`);
  return (await res.json()) as T;
}
