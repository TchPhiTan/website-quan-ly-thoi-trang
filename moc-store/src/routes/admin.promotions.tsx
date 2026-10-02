import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHead, Badge, Select, Modal, Field, Table, th, td, opts } from "@/components/admin/admin-ui";
import { useAdmin, type Promo, type PromoKind } from "@/lib/admin-data";
import { usePromos } from "@/services/hooks";
import { promoService } from "@/services";
import { money } from "@/lib/store";
export const Route = createFileRoute("/admin/promotions")({ head: () => ({ meta: [{ title: "Quản lý khuyến mại — MỘC" }] }), component: Promotions });
const kinds: PromoKind[] = ["Giảm tiền", "Giảm %", "Miễn phí vận chuyển"];
const valueText = (p: Promo) => p.kind === "Giảm %" ? `${p.value}%` : money(p.value);
function Promotions() {
  const a = useAdmin(); const promos = usePromos(); const [open, setOpen] = useState(false); const [cur, setCur] = useState<Promo | null>(null); const [kind, setKind] = useState<string>("Giảm tiền"); const [active, setActive] = useState("1"); const [err, setErr] = useState("");
  const openForm = (p: Promo | null) => { setCur(p); setKind(p?.kind ?? "Giảm tiền"); setActive(p && !p.active ? "0" : "1"); setErr(""); setOpen(true); };
  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const d = new FormData(e.currentTarget); const code = String(d.get("code") || "").trim().toUpperCase(); const value = Number(d.get("value")); const expires = String(d.get("expires") || "");
    if (!code || !(value > 0) || !expires) { setErr("Vui lòng nhập mã, giá trị lớn hơn 0 và ngày hết hạn."); return; }
    if (kind === "Giảm %" && value > 100) { setErr("Giảm theo % không được vượt quá 100."); return; }
    if (promos.some(p => p.code === code && p.id !== cur?.id)) { setErr("Mã khuyến mại đã tồn tại."); return; }
    const next: Promo = { id: cur?.id ?? `p${Date.now()}`, code, title: String(d.get("title") || code), kind: kind as PromoKind, value, minOrder: Number(d.get("minOrder")) || 0, expires, active: active === "1" };
    void a.run(promoService.save(next), cur ? "Đã cập nhật khuyến mại" : "Đã thêm khuyến mại mới"); setOpen(false);
  };
  return <><PageHead eyebrow="Marketing" title="Quản lý khuyến mại" action={<Button onClick={() => openForm(null)}><Plus /> Thêm khuyến mại mới</Button>} />
    <Table><thead><tr><th className={th}>Mã</th><th className={th}>Chương trình</th><th className={th}>Loại</th><th className={th}>Giá trị</th><th className={th}>Đơn tối thiểu</th><th className={th}>Hết hạn</th><th className={th}>Trạng thái</th><th className={th}>Thao tác</th></tr></thead>
      <tbody>{promos.map(p => <tr key={p.id}><td className={td}><b>{p.code}</b></td><td className={td}>{p.title}</td><td className={td}>{p.kind}</td><td className={td}>{valueText(p)}</td><td className={td}>{money(p.minOrder)}</td><td className={td}>{p.expires}</td><td className={td}><Badge tone={p.active ? "ok" : "muted"}>{p.active ? "Đang hoạt động" : "Ngừng hoạt động"}</Badge></td>
        <td className={td}><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="Chỉnh sửa" onClick={() => openForm(p)}><Pencil /></Button><Button variant="ghost" size="icon" aria-label="Ngừng hoạt động" disabled={!p.active} onClick={() => { void a.run(promoService.setActive(p.id, false), "Đã chuyển sang ngừng hoạt động"); }}><Trash2 /></Button></div></td></tr>)}</tbody></Table>
    <Modal open={open} onOpenChange={setOpen} title={cur ? "Chỉnh sửa khuyến mại" : "Thêm khuyến mại mới"}><form key={cur?.id ?? "new"} onSubmit={save} noValidate className="space-y-4 mt-2">
      <div className="grid grid-cols-2 gap-3"><Field label="Mã khuyến mại"><Input name="code" defaultValue={cur?.code ?? ""} className="h-11" /></Field><Field label="Loại"><Select value={kind} onChange={setKind} options={opts(kinds)} /></Field></div>
      <Field label="Tên chương trình"><Input name="title" defaultValue={cur?.title ?? ""} className="h-11" /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Giá trị (₫ hoặc %)"><Input name="value" type="number" min="0" defaultValue={cur?.value ?? ""} className="h-11" /></Field><Field label="Đơn tối thiểu (₫)"><Input name="minOrder" type="number" min="0" defaultValue={cur?.minOrder ?? 0} className="h-11" /></Field></div>
      <div className="grid grid-cols-2 gap-3"><Field label="Ngày hết hạn"><Input name="expires" type="date" defaultValue={cur?.expires ?? ""} className="h-11" /></Field><Field label="Trạng thái"><Select value={active} onChange={setActive} options={[{ value: "1", label: "Đang hoạt động" }, { value: "0", label: "Ngừng hoạt động" }]} /></Field></div>
      {err && <p className="text-destructive text-xs">{err}</p>}<Button type="submit" className="w-full h-11">Lưu khuyến mại</Button></form></Modal></>;
}
