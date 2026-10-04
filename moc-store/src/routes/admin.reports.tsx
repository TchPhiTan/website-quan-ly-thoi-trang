import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHead, Field, Table, Bars, Badge, th, td } from "@/components/admin/admin-ui";
import { useAdmin, stockState, downloadCsv } from "@/lib/admin-data";
import { useProducts, useReports } from "@/services/hooks";
import { money } from "@/lib/store";
export const Route = createFileRoute("/admin/reports")({ head: () => ({ meta: [{ title: "Quản lý báo cáo — MỘC" }] }), component: Reports });
const currentYear = new Date().getFullYear();
const number = new Intl.NumberFormat("vi-VN");
const monthLabel = (month: number) => `T${month}`;
function Reports() {
  const a = useAdmin();
  const products = useProducts(a.signedIn);
  const [yearInput, setYearInput] = useState(String(currentYear));
  const [year, setYear] = useState(currentYear);
  const [err, setErr] = useState("");
  const { overview, revenue, topProducts, loading, error } = useReports(year, a.signedIn);
  const run = () => { const nextYear = Number(yearInput); if (!Number.isInteger(nextYear) || nextYear < 2000 || nextYear > 2100) { setErr("Năm không hợp lệ."); return; } setErr(""); setYear(nextYear); };
  const chart = (revenue?.data || []).map(item => [monthLabel(item.month), Math.round(item.revenue / 1000)] as [string, number]);
  const exportFile = () => { if (!overview || !revenue) return; downloadCsv(`bao-cao-${year}.csv`, [["BÁO CÁO TỔNG QUAN", `Năm doanh thu ${year}`], ["Chỉ số", "Giá trị"], ["Tổng đơn", overview.total_orders], ["Tổng người dùng", overview.total_users], ["Tổng sản phẩm", overview.total_products], ["Doanh thu tháng hiện tại", overview.month_revenue], ["Đơn tháng hiện tại", overview.month_orders], ["Đơn chờ duyệt", overview.pending_orders], ["Biến thể sắp hết", overview.low_stock_variants], [], ["DOANH THU THEO THÁNG", year], ["Tháng", "Doanh thu", "Số đơn"], ...revenue.data.map(item => [monthLabel(item.month), item.revenue, item.orders]), [], ["TOP SẢN PHẨM"], ["Sản phẩm", "Đã bán", "Đánh giá", "Giá"], ...topProducts.map(product => [product.title, product.sold_count, `${product.rating_avg} (${product.rating_count})`, Number(product.price)]), [], ["TỒN KHO"], ["Sản phẩm", "Tồn", "Đơn giá", "Giá trị tồn"], ...products.map(product => [product.name, product.stock, product.price, product.stock * product.price])]); a.notify("Đã xuất file báo cáo (CSV, mở được bằng Excel)"); };
  const metrics = overview ? [["Tổng đơn", number.format(overview.total_orders)], ["Người dùng", number.format(overview.total_users)], ["Sản phẩm", number.format(overview.total_products)], ["Doanh thu tháng", money(overview.month_revenue)], ["Đơn tháng", number.format(overview.month_orders)], ["Chờ duyệt", number.format(overview.pending_orders)], ["Sắp hết hàng", number.format(overview.low_stock_variants)]] : [];
  return <><PageHead eyebrow="Phân tích" title="Quản lý báo cáo" desc="Số liệu quản trị từ hệ thống Neon và tồn kho sản phẩm." />
    <div className="flex flex-wrap items-end gap-4 mb-6"><Field label="Năm doanh thu"><Input type="number" min="2000" max="2100" value={yearInput} onChange={e => setYearInput(e.target.value)} className="h-10 w-32" /></Field><Button onClick={run}>Cập nhật</Button><Button variant="outline" disabled={!overview || loading} onClick={exportFile}><Download /> Xuất CSV</Button></div>
    {(err || error) && <p className="text-destructive text-xs mb-4">{err || error}</p>}{loading && <p className="text-sm text-muted-foreground mb-4">Đang tải báo cáo...</p>}
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">{metrics.map(([label, value]) => <div key={label} className="border border-border p-5"><p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p><p className="editorial-title text-3xl mt-3">{value}</p></div>)}</div>
    <section className="border border-border p-6 mb-8"><h2 className="text-lg font-semibold">Doanh thu theo tháng <span className="text-xs font-normal text-muted-foreground">({year}, nghìn ₫)</span></h2>{chart.length ? <Bars data={chart} unit="" /> : <p className="text-sm text-muted-foreground py-10 text-center">Chưa có dữ liệu doanh thu.</p>}</section>
    <h2 className="font-semibold mb-3">Top sản phẩm bán chạy</h2><Table><thead><tr><th className={th}>Sản phẩm</th><th className={th}>Đã bán</th><th className={th}>Đánh giá</th><th className={th}>Giá</th></tr></thead><tbody>{topProducts.map(product => <tr key={product.id}><td className={td}><div className="flex items-center gap-3"><img src={product.thumbnail || "/placeholder-product.svg"} alt={product.title} className="w-10 h-12 object-cover" /><span className="font-medium">{product.title}</span></div></td><td className={td}>{number.format(product.sold_count)}</td><td className={td}>{Number(product.rating_avg).toFixed(1)} ({number.format(product.rating_count)})</td><td className={td}>{money(Number(product.price))}</td></tr>)}</tbody></Table>{!topProducts.length && !loading && <p className="text-center text-sm text-muted-foreground py-8">Chưa có dữ liệu sản phẩm bán chạy.</p>}
    <h2 className="font-semibold mt-10 mb-3">Chi tiết tồn kho</h2><Table><thead><tr><th className={th}>Sản phẩm</th><th className={th}>Tồn</th><th className={th}>Tình trạng</th><th className={th}>Giá trị tồn</th></tr></thead><tbody>{products.map(product => { const state = stockState(product.stock); return <tr key={product.id}><td className={td}>{product.name}</td><td className={td}>{number.format(product.stock)}</td><td className={td}><Badge tone={state.tone}>{state.label}</Badge></td><td className={td}>{money(product.stock * product.price)}</td></tr>; })}</tbody></Table></>;
}
