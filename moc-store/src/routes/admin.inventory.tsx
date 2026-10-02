import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHead, Badge, Select, Modal, Field, Table, th, td } from "@/components/admin/admin-ui";
import { useAdmin, stockState, withinDays, type AProduct } from "@/lib/admin-data";
import { useProducts, useStockLog } from "@/services/hooks";
import { productService } from "@/services";
export const Route = createFileRoute("/admin/inventory")({ head: () => ({ meta: [{ title: "Quản lý tồn kho — MỘC" }] }), component: Inventory });
const timeOpts = [{ value: "0", label: "Tất cả thời gian" }, { value: "7", label: "7 ngày qua" }, { value: "30", label: "30 ngày qua" }];
function Inventory() {
  const a = useAdmin(); const products = useProducts(); const stockLog = useStockLog(); const [days, setDays] = useState("0"); const [sel, setSel] = useState<string[]>([]); const [detail, setDetail] = useState<AProduct | null>(null); const [edit, setEdit] = useState<AProduct | null>(null); const [qty, setQty] = useState(""); const [note, setNote] = useState(""); const [err, setErr] = useState("");
  const lastChange = (id: string) => stockLog.find(l => l.productId === id)?.date ?? "—";
  const rows = products.filter(p => days === "0" || withinDays(lastChange(p.id), Number(days)));
  const all = rows.length > 0 && rows.every(p => sel.includes(p.id));
  const save = () => { const n = Number(qty); if (!edit || qty === "" || !Number.isInteger(n) || n < 0) { setErr("Số lượng phải là số nguyên không âm."); return; } void a.run(productService.setStock(edit.id, n, note.trim() || "Điều chỉnh thủ công"), "Đã cập nhật số lượng tồn kho"); setEdit(null); setErr(""); };
  return <><PageHead eyebrow="Kho hàng" title="Quản lý tồn kho" desc="Ngưỡng sắp hết hàng: từ 10 sản phẩm trở xuống." />
    <div className="flex flex-wrap items-center gap-3 mb-5"><Select label="Lọc theo thời gian cập nhật" value={days} onChange={setDays} options={timeOpts} /><span className="text-xs text-muted-foreground ml-auto">{sel.length > 0 ? `Đã chọn ${sel.length}` : `${rows.length} sản phẩm`}</span></div>
    <Table><thead><tr><th className={th}><input type="checkbox" aria-label="Chọn tất cả" className="accent-accent size-4" checked={all} onChange={e => setSel(e.target.checked ? rows.map(p => p.id) : [])} /></th><th className={th}>Sản phẩm</th><th className={th}>Tồn kho</th><th className={th}>Tình trạng</th><th className={th}>Cập nhật gần nhất</th><th className={th}>Thao tác</th></tr></thead>
      <tbody>{rows.map(p => { const s = stockState(p.stock); return <tr key={p.id}><td className={td}><input type="checkbox" aria-label={`Chọn ${p.name}`} className="accent-accent size-4" checked={sel.includes(p.id)} onChange={e => setSel(e.target.checked ? [...sel, p.id] : sel.filter(x => x !== p.id))} /></td><td className={td}><span className="font-medium">{p.name}</span></td><td className={td}>{p.stock}</td><td className={td}><Badge tone={s.tone}>{s.label}</Badge></td><td className={td}>{lastChange(p.id)}</td>
        <td className={td}><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="Xem chi tiết tồn kho" onClick={() => setDetail(p)}><Eye /></Button><Button variant="ghost" size="icon" aria-label="Chỉnh sửa số lượng" onClick={() => { setEdit(p); setQty(String(p.stock)); setNote(""); setErr(""); }}><Pencil /></Button></div></td></tr>; })}</tbody></Table>
    <Modal open={detail !== null} onOpenChange={o => { if (!o) setDetail(null); }} title={detail?.name ?? ""} desc={detail ? `Tồn hiện tại: ${detail.stock}` : undefined}><div className="text-sm space-y-2">{detail && stockLog.filter(l => l.productId === detail.id).map(l => <div key={l.id} className="flex justify-between border-b pb-2"><span>{l.date} — {l.note}</span><span className={l.delta >= 0 ? "text-emerald-700" : "text-destructive"}>{l.delta > 0 ? "+" : ""}{l.delta}</span></div>)}{detail && stockLog.every(l => l.productId !== detail.id) && <p className="text-muted-foreground">Chưa có lịch sử thay đổi.</p>}</div></Modal>
    <Modal open={edit !== null} onOpenChange={o => { if (!o) setEdit(null); }} title="Chỉnh sửa số lượng" desc={edit?.name}><div className="space-y-4 mt-2"><Field label="Số lượng tồn mới"><Input type="number" min="0" value={qty} onChange={e => setQty(e.target.value)} className="h-11" /></Field><Field label="Ghi chú"><Input value={note} onChange={e => setNote(e.target.value)} className="h-11" placeholder="Nhập hàng, hư hỏng, kiểm kê..." /></Field>{err && <p className="text-destructive text-xs">{err}</p>}<Button className="w-full h-11" onClick={save}>Lưu số lượng</Button></div></Modal></>;
}
