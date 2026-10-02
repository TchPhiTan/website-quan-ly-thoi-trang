import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHead, Select, Field, Table, Bars, Badge, th, td } from "@/components/admin/admin-ui";
import { useAdmin, stockState, downloadCsv } from "@/lib/admin-data";
import { useOrders, useProducts } from "@/services/hooks";
import { money } from "@/lib/store";
export const Route = createFileRoute("/admin/reports")({ head: () => ({ meta: [{ title: "Quản lý báo cáo — MỘC" }] }), component: Reports });
function Reports() {
  const a = useAdmin(); const orders = useOrders(); const products = useProducts(); const [from, setFrom] = useState("2026-09-01"); const [to, setTo] = useState("2026-09-30"); const [status, setStatus] = useState("all"); const [applied, setApplied] = useState({ from: "2026-09-01", to: "2026-09-30", status: "all" }); const [err, setErr] = useState("");
  const run = () => { if (!from || !to || from > to) { setErr("Khoảng ngày không hợp lệ: ngày bắt đầu phải trước hoặc bằng ngày kết thúc."); return; } setErr(""); setApplied({ from, to, status }); };
  const rows = orders.filter(o => o.date >= applied.from && o.date <= applied.to && (applied.status === "all" ? o.status !== "Đã hủy" : o.status === applied.status));
  const byDay: Record<string, number> = {}; rows.forEach(o => { byDay[o.date] = (byDay[o.date] ?? 0) + o.total; });
  const chart: [string, number][] = Object.keys(byDay).sort().map(d => [d.slice(8) + "/" + d.slice(5, 7), Math.round((byDay[d] ?? 0) / 1000)]);
  const total = rows.reduce((s, o) => s + o.total, 0); const stockValue = products.reduce((s, p) => s + p.stock * p.price, 0);
  const exportFile = () => { downloadCsv(`bao-cao-${applied.from}_${applied.to}.csv`, [["BÁO CÁO DOANH THU", `${applied.from} đến ${applied.to}`], ["Mã đơn", "Khách hàng", "Ngày", "Trạng thái", "Tổng tiền"], ...rows.map(o => [o.id, o.customer, o.date, o.status, o.total]), ["Tổng doanh thu", "", "", "", total], [], ["BÁO CÁO TỒN KHO"], ["Sản phẩm", "Tồn", "Đơn giá", "Giá trị tồn"], ...products.map(p => [p.name, p.stock, p.price, p.stock * p.price])]); a.notify("Đã xuất file báo cáo (CSV, mở được bằng Excel)"); };
  return <><PageHead eyebrow="Phân tích" title="Quản lý báo cáo" desc="Thống kê doanh thu và xem báo cáo tồn kho." />
    <div className="flex flex-wrap items-end gap-4 mb-6"><Field label="Từ ngày"><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-10 w-44" /></Field><Field label="Đến ngày"><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-10 w-44" /></Field>
      <Field label="Trạng thái đơn"><Select value={status} onChange={setStatus} options={[{ value: "all", label: "Tất cả (trừ đã hủy)" }, { value: "Chờ duyệt", label: "Chờ duyệt" }, { value: "Đã duyệt", label: "Đã duyệt" }, { value: "Đã hủy", label: "Đã hủy" }]} /></Field>
      <Button onClick={run}>Thống kê</Button><Button variant="outline" onClick={exportFile}><Download /> Xuất file Excel</Button></div>
    {err && <p className="text-destructive text-xs mb-4">{err}</p>}
    <div className="grid sm:grid-cols-3 gap-4 mb-8">{[["Doanh thu", money(total)], ["Số đơn", String(rows.length)], ["Giá trị tồn kho", money(stockValue)]].map(([l, v]) => <div key={l} className="border border-border p-6"><p className="text-[11px] uppercase tracking-widest text-muted-foreground">{l}</p><p className="editorial-title text-4xl mt-4">{v}</p></div>)}</div>
    <section className="border border-border p-6 mb-8"><h2 className="text-lg font-semibold">Doanh thu theo ngày <span className="text-xs font-normal text-muted-foreground">(nghìn ₫)</span></h2>{chart.length ? <Bars data={chart} unit="" /> : <p className="text-sm text-muted-foreground py-10 text-center">Không có đơn hàng trong điều kiện đã chọn.</p>}</section>
    <h2 className="font-semibold mb-3">Chi tiết đơn hàng</h2><Table><thead><tr><th className={th}>Mã đơn</th><th className={th}>Khách hàng</th><th className={th}>Ngày</th><th className={th}>Trạng thái</th><th className={th}>Tổng tiền</th></tr></thead><tbody>{rows.map(o => <tr key={o.id}><td className={td}>#{o.id}</td><td className={td}>{o.customer}</td><td className={td}>{o.date}</td><td className={td}>{o.status}</td><td className={td}>{money(o.total)}</td></tr>)}</tbody></Table>
    <h2 className="font-semibold mt-10 mb-3">Báo cáo tồn kho</h2><Table><thead><tr><th className={th}>Sản phẩm</th><th className={th}>Tồn</th><th className={th}>Tình trạng</th><th className={th}>Giá trị tồn</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td className={td}>{p.name}</td><td className={td}>{p.stock}</td><td className={td}><Badge tone={stockState(p.stock).tone}>{stockState(p.stock).label}</Badge></td><td className={td}>{money(p.stock * p.price)}</td></tr>)}</tbody></Table></>;
}
