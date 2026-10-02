import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHead, Bars } from "@/components/admin/admin-ui";
import { LOW_STOCK } from "@/lib/admin-data";
import { useOrders, useProducts, useReviews } from "@/services/hooks";
import { money } from "@/lib/store";
export const Route = createFileRoute("/admin/")({ head: () => ({ meta: [{ title: "Bảng điều khiển — MỘC" }] }), component: Dashboard });
type Range = "today" | "7d" | "30d" | "year";
const series: Record<Range, [string, number][]> = {
  today: [["8h", 1.2], ["10h", 2.4], ["12h", 3.1], ["14h", 1.8], ["16h", 2.9], ["18h", 4.2], ["20h", 3.5]],
  "7d": [["T2", 6.1], ["T3", 4.8], ["T4", 7.3], ["T5", 5.2], ["T6", 9.4], ["T7", 12.1], ["CN", 8.8]],
  "30d": [["1/9", 15], ["4/9", 22], ["7/9", 18], ["10/9", 27], ["13/9", 24], ["16/9", 31], ["19/9", 29], ["22/9", 35], ["25/9", 33], ["28/9", 38]],
  year: [["T1", 120], ["T2", 98], ["T3", 140], ["T4", 132], ["T5", 160], ["T6", 155], ["T7", 148], ["T8", 171], ["T9", 190]],
};
const ranges: { value: Range; label: string }[] = [{ value: "today", label: "Hôm nay" }, { value: "7d", label: "7 ngày" }, { value: "30d", label: "30 ngày" }, { value: "year", label: "Năm" }];
function Dashboard() {
  const orders = useOrders(); const products = useProducts(); const reviews = useReviews(); const [range, setRange] = useState<Range>("7d");
  const revenue = orders.filter(o => o.status !== "Đã hủy").reduce((s, o) => s + o.total, 0);
  const kpis = [{ label: "Doanh thu", value: money(revenue), to: "/admin/reports" as const }, { label: "Đơn hàng", value: String(orders.length), to: "/admin/orders" as const }, { label: "Sản phẩm sắp hết hàng", value: String(products.filter(p => p.stock <= LOW_STOCK).length), to: "/admin/inventory" as const }, { label: "Đánh giá chưa phản hồi", value: String(reviews.filter(r => !r.reply).length), to: "/admin/reviews" as const }];
  return <><PageHead eyebrow="Tổng quan" title="Bảng điều khiển" desc="Theo dõi nhanh tình hình cửa hàng." />
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">{kpis.map(k => <Link key={k.label} to={k.to} className="border border-border p-6 hover:border-foreground transition-colors"><p className="text-[11px] uppercase tracking-widest text-muted-foreground">{k.label}</p><p className="editorial-title text-4xl mt-4">{k.value}</p></Link>)}</div>
    <section className="border border-border p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Biểu đồ doanh thu <span className="text-xs font-normal text-muted-foreground">(triệu ₫, dữ liệu minh họa)</span></h2><div className="flex gap-2">{ranges.map(r => <Button key={r.value} size="sm" variant={range === r.value ? "default" : "outline"} onClick={() => setRange(r.value)}>{r.label}</Button>)}</div></div><Bars data={series[range]} unit="" /></section></>;
}
