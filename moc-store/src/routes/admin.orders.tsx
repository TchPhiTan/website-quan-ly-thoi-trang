import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHead, Badge, Select, Modal, Table, th, td } from "@/components/admin/admin-ui";
import { useAdmin, type AOrder, type OrderStatus } from "@/lib/admin-data";
import { useOrders } from "@/services/hooks";
import { orderService } from "@/services";
import { money } from "@/lib/store";
export const Route = createFileRoute("/admin/orders")({ head: () => ({ meta: [{ title: "Quản lý đơn hàng — MỘC" }] }), component: Orders });
const tone = (s: OrderStatus) => s === "Đã duyệt" ? "ok" : s === "Đã hủy" ? "bad" : "warn";
function Orders() {
  const a = useAdmin(); const orders = useOrders(); const [filter, setFilter] = useState("all"); const [view, setView] = useState<AOrder | null>(null);
  const rows = orders.filter(o => filter === "all" || o.status === filter);
  const set = (id: string, status: OrderStatus) => { void a.run(orderService.setStatus(id, status), status === "Đã duyệt" ? "Đã duyệt đơn hàng" : "Đã hủy đơn hàng"); };
  return <><PageHead eyebrow="Bán hàng" title="Quản lý đơn hàng" />
    <div className="flex items-center gap-3 mb-5"><Select label="Lọc theo trạng thái" value={filter} onChange={setFilter} options={[{ value: "all", label: "Tất cả trạng thái" }, { value: "Chờ duyệt", label: "Chờ duyệt" }, { value: "Đã duyệt", label: "Đã duyệt" }, { value: "Đã hủy", label: "Đã hủy" }]} /><span className="text-xs text-muted-foreground ml-auto">{rows.length} đơn</span></div>
    <Table><thead><tr><th className={th}>Mã đơn</th><th className={th}>Khách hàng</th><th className={th}>Ngày đặt</th><th className={th}>Tổng tiền</th><th className={th}>Trạng thái</th><th className={th}>Thao tác</th></tr></thead>
      <tbody>{rows.map(o => <tr key={o.id}><td className={td}>#{o.id}</td><td className={td}>{o.customer}</td><td className={td}>{o.date}</td><td className={td}>{money(o.total)}</td><td className={td}><Badge tone={tone(o.status)}>{o.status}</Badge></td>
        <td className={td}><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="Duyệt đơn" disabled={o.status !== "Chờ duyệt"} onClick={() => set(o.id, "Đã duyệt")}><Check /></Button><Button variant="ghost" size="icon" aria-label="Hủy đơn" disabled={o.status !== "Chờ duyệt"} onClick={() => set(o.id, "Đã hủy")}><X /></Button><Button variant="ghost" size="icon" aria-label="Xem chi tiết" onClick={() => setView(o)}><Eye /></Button></div></td></tr>)}</tbody></Table>
    <Modal open={view !== null} onOpenChange={o => { if (!o) setView(null); }} title={view ? `Đơn #${view.id}` : ""} desc={view?.date}>{view && <div className="text-sm space-y-2"><p><b>Khách hàng:</b> {view.customer} — {view.phone}</p><p><b>Địa chỉ:</b> {view.address}</p><p><b>Sản phẩm:</b> {view.items}</p><p><b>Tổng tiền:</b> {money(view.total)}</p><p><b>Trạng thái:</b> {view.status}</p></div>}</Modal></>;
}
