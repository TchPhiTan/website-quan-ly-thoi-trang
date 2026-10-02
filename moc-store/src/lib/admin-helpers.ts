export const LOW_STOCK = 10;
export function stockState(n: number): { label: string; tone: "ok" | "warn" | "bad" } {
  return n <= 0 ? { label: "Hết hàng", tone: "bad" } : n <= LOW_STOCK ? { label: "Sắp hết", tone: "warn" } : { label: "Còn hàng", tone: "ok" };
}
export function withinDays(date: string, days: number) { return days === 0 || Date.now() - new Date(date).getTime() <= days * 864e5; }
export function downloadCsv(name: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const blob = new Blob(["\uFEFF" + rows.map(r => r.map(esc).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
