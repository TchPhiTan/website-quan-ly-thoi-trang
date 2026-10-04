import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AlertTriangle, Download, Eye, FileUp, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHead, Badge, Select, Modal, Field, Table, th, td } from "@/components/admin/admin-ui";
import { useAdmin, stockState, downloadCsv, LOW_STOCK, type Session } from "@/lib/admin-data";
import { useInventory, useSessions } from "@/services/hooks";
import { inventoryService, sessionService } from "@/services";
import { VietQrSandboxModal, type BankingOrderData } from "@/components/vietqr-sandbox-modal";
export const Route = createFileRoute("/admin/inventory-tools")({ head: () => ({ meta: [{ title: "Hỗ trợ quản lý tồn kho — MỘC" }] }), component: InventoryTools });
type Tab = "low" | "bulk" | "barcode" | "diag";
const tabs: { value: Tab; label: string }[] = [{ value: "low", label: "Tồn kho thấp" }, { value: "bulk", label: "Điều chỉnh hàng loạt" }, { value: "barcode", label: "Mã vạch / QR" }, { value: "diag", label: "Chẩn đoán tồn kho" }];
const conditions = ["Tất cả sản phẩm", "Sản phẩm tồn kho thấp", "Sản phẩm đang bán"];
function Barcode({ value }: { value: string }) {
  let x = 4; const bars: { x: number; w: number }[] = [];
  for (const ch of `*${value.toUpperCase()}*`) { const bits = ch.charCodeAt(0).toString(2).padStart(8, "0"); for (const b of bits) { const w = b === "1" ? 3 : 1.5; if (b === "1" || x % 2 === 0) bars.push({ x, w }); x += w + 1.5; } }
  return <svg viewBox={`0 0 ${x + 4} 70`} className="w-full max-w-md bg-white border"><g fill="black">{bars.map((b, i) => <rect key={i} x={b.x} y={4} width={b.w} height={50} />)}</g><text x={(x + 4) / 2} y={66} fontSize="9" textAnchor="middle">{value}</text></svg>;
}
function InventoryTools() {
  const a = useAdmin(); const products = useInventory(); const sessions = useSessions(); const [tab, setTab] = useState<Tab>("low");
  const low = products.filter(p => p.stock <= LOW_STOCK);
  const [edits, setEdits] = useState<Record<string, string>>({}); const [bcId, setBcId] = useState(products[0]?.id ?? "");
  const [sandboxQrOrder, setSandboxQrOrder] = useState<BankingOrderData | null>(null);
  const [qcId, setQcId] = useState(products[0]?.id ?? ""); const [qcVar, setQcVar] = useState(""); const [qcQty, setQcQty] = useState(""); const [qcErr, setQcErr] = useState("");
  const [name, setName] = useState(""); const [cond, setCond] = useState(conditions[0] ?? ""); const [nameErr, setNameErr] = useState("");
  const [openId, setOpenId] = useState<string | null>(null); const [files, setFiles] = useState<Record<string, File>>({});
  const productName = (id: string) => products.find(p => p.id === id)?.name ?? id;
  const opened = sessions.find(s => s.id === openId);

  const applyBulk = () => { let n = 0; for (const [id, v] of Object.entries(edits)) { const q = Number(v); const product = products.find(item => item.id === id); if (product && v !== "" && Number.isInteger(q) && q >= 0) { void inventoryService.restock(product, q, "Điều chỉnh hàng loạt"); n++; } } setEdits({}); a.notify(n ? `Đã điều chỉnh ${n} sản phẩm` : "Chưa có giá trị hợp lệ để cập nhật"); };
  const exportPO = () => { downloadCsv("PO-nhap-hang.csv", [["Mã SP", "Tên sản phẩm", "Tồn hiện tại", "Số lượng đề xuất đặt"], ...low.map(p => [p.id, p.name, p.stock, Math.max(20 - p.stock, 0)])]); a.notify("Đã xuất file PO"); };
  const diag = products.flatMap(p => { const r: [string, string, string][] = []; if (p.stock <= 0) r.push([p.name, "Hết hàng", "Nhập thêm hoặc chuyển ngừng bán"]); else if (p.stock <= LOW_STOCK) r.push([p.name, `Sắp hết hàng (${p.stock})`, "Xem xét lập PO"]); if (p.status === "Ngừng bán" && p.stock > 0) r.push([p.name, "Còn tồn nhưng đã ngừng bán", "Kiểm tra trạng thái sản phẩm"]); return r; });
  const sessionDiff = sessions.filter(s => !s.applied).flatMap(s => s.lines.filter(l => l.counted !== null && l.counted !== l.expected).map((l): [string, string, string] => [productName(l.productId), `Chênh lệch kiểm kê "${s.name}": hệ thống ${l.expected}, đếm ${l.counted}`, "Áp dụng kết quả kiểm kê"]));
  const issues = [...diag, ...sessionDiff];

  const quick = () => { const q = Number(qcQty); const product = products.find(item => item.id === qcId); if (!product || qcQty === "" || !Number.isInteger(q) || q < 0) { setQcErr("Chọn sản phẩm và nhập số lượng đếm là số nguyên không âm."); return; } setQcErr(""); void a.run(inventoryService.restock(product, q, `Kiểm kê nhanh${qcVar.trim() ? ` (${qcVar.trim()})` : ""}`), "Đã cập nhật nhanh tồn kho"); setQcQty(""); setQcVar(""); };
  const create = (e: FormEvent) => { e.preventDefault(); if (!name.trim()) { setNameErr("Vui lòng nhập tên phiên kiểm kê."); return; } setNameErr("");
    const list = products.filter(p => cond === conditions[1] ? p.stock <= LOW_STOCK : cond === conditions[2] ? p.status === "Đang bán" : true);
    const s: Session = { id: `s${Date.now()}`, name: name.trim(), condition: cond, createdAt: new Date().toISOString().slice(0, 10), lines: list.map(p => ({ productId: p.id, expected: p.stock, counted: null })), applied: false };
    void a.run(sessionService.save(s), `Đã tạo phiên kiểm kê (${list.length} dòng)`); setName(""); setOpenId(s.id); };
  const patchSession = (id: string, fn: (s: Session) => Session) => { const s = sessions.find(x => x.id === id); if (s) void sessionService.save(fn(s)); };
  const sample = (s: Session) => { downloadCsv(`kiem-ke-${s.id}.csv`, [["Mã SP", "Tên sản phẩm", "Tồn hệ thống", "Số lượng đếm thực tế"], ...s.lines.map(l => [l.productId, productName(l.productId), l.expected, l.counted ?? ""])]); };
  const upload = async (s: Session) => { const f = files[s.id]; if (!f) { a.notify("Hãy chọn file CSV trước"); return; }
    const map: Record<string, number> = {}; (await f.text()).replace(/^\uFEFF/, "").split(/\r?\n/).slice(1).forEach(row => { const id = row.split(",")[0]?.trim() ?? ""; const v = row.slice(row.lastIndexOf(",") + 1).trim(); if (id && v !== "" && Number.isInteger(Number(v)) && Number(v) >= 0) map[id] = Number(v); });
    const hit = s.lines.filter(l => map[l.productId] !== undefined).length; patchSession(s.id, x => ({ ...x, lines: x.lines.map(l => ({ ...l, counted: map[l.productId] ?? l.counted })) })); a.notify(hit ? `Đã nạp ${hit} dòng từ CSV` : "File không có dòng hợp lệ"); };
  const applySession = (s: Session) => { const n = s.lines.filter(l => l.counted !== null).length; if (!n) { a.notify("Phiên chưa có số lượng đếm"); return; } s.lines.forEach(l => { const product = products.find(item => item.id === l.productId); if (product && l.counted !== null) void inventoryService.restock(product, l.counted, `Kiểm kê: ${s.name}`); }); patchSession(s.id, x => ({ ...x, applied: true })); a.notify(`Đã áp dụng kết quả kiểm kê (${n} sản phẩm)`); };

  return <><PageHead eyebrow="Kho hàng" title="Hỗ trợ quản lý tồn kho" desc="Kiểm kê, điều chỉnh hàng loạt, mã vạch và chẩn đoán." />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">{tabs.map(t => <Button key={t.value} variant={tab === t.value ? "default" : "outline"} className="h-12" onClick={() => setTab(t.value)}>{t.label}</Button>)}</div>
    <section className="mb-10">
      {tab === "low" && <><div className="flex justify-between items-center mb-3"><p className="text-sm text-muted-foreground">{low.length} sản phẩm từ {LOW_STOCK} trở xuống</p><Button variant="outline" size="sm" onClick={exportPO} disabled={!low.length}><Download /> Xuất file PO</Button></div><Table><thead><tr><th className={th}>Sản phẩm</th><th className={th}>Tồn</th><th className={th}>Tình trạng</th></tr></thead><tbody>{low.map(p => <tr key={p.id}><td className={td}>{p.name}</td><td className={td}>{p.stock}</td><td className={td}><Badge tone={stockState(p.stock).tone}>{stockState(p.stock).label}</Badge></td></tr>)}</tbody></Table></>}
      {tab === "bulk" && <><div className="flex justify-between items-center mb-3"><p className="text-sm text-muted-foreground">Nhập số lượng mới vào các dòng cần đổi, để trống nếu giữ nguyên.</p><Button size="sm" onClick={applyBulk}>Áp dụng thay đổi</Button></div><Table><thead><tr><th className={th}>Sản phẩm</th><th className={th}>Tồn hiện tại</th><th className={th}>Số lượng mới</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td className={td}>{p.name}</td><td className={td}>{p.stock}</td><td className={td}><Input type="number" min="0" aria-label={`Số lượng mới ${p.name}`} value={edits[p.id] ?? ""} onChange={e => setEdits({ ...edits, [p.id]: e.target.value })} className="h-9 w-28" /></td></tr>)}</tbody></Table></>}
      {tab === "barcode" && (
        <div className="space-y-4">
          <Select label="Chọn sản phẩm" value={bcId} onChange={setBcId} options={products.map(p => ({ value: p.id, label: p.name }))} />
          <Barcode value={bcId} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>In mã vạch</Button>
            <Button
              size="sm"
              className="bg-accent text-accent-foreground gap-1.5"
              onClick={() => {
                const prod = products.find(p => p.id === bcId) || products[0];
                setSandboxQrOrder({
                  id: `DEMO-${(prod?.id || "PRD").slice(0, 8)}`,
                  amount: prod?.price || 489000,
                });
              }}
            >
              Mở Trình Thực Hành VietQR Sandbox
            </Button>
          </div>
          <p className="text-xs text-muted-foreground max-w-md">Mã vạch minh họa và mã VietQR tương thích thực hành quét thanh toán và kiểm kê kho.</p>
        </div>
      )}
      {tab === "diag" && <><div className="flex justify-between items-center mb-3"><p className="text-sm text-muted-foreground flex items-center gap-2"><AlertTriangle className="size-4 text-accent" />{issues.length} vấn đề cần xem xét</p><Button variant="outline" size="sm" disabled={!issues.length} onClick={() => { downloadCsv("chan-doan-ton-kho.csv", [["Sản phẩm", "Vấn đề", "Gợi ý"], ...issues]); a.notify("Đã xuất file chẩn đoán"); }}><Download /> Xuất chẩn đoán</Button></div>{issues.length ? <Table><thead><tr><th className={th}>Sản phẩm</th><th className={th}>Vấn đề</th><th className={th}>Gợi ý</th></tr></thead><tbody>{issues.map((r, i) => <tr key={i}><td className={td}>{r[0]}</td><td className={td}>{r[1]}</td><td className={td}>{r[2]}</td></tr>)}</tbody></Table> : <p className="text-sm text-muted-foreground py-6">Không phát hiện vấn đề.</p>}</>}
    </section>

    <div className="grid lg:grid-cols-2 gap-6 mb-10">
      <section className="border border-border p-6 space-y-4"><h2 className="font-semibold">Kiểm kê nhanh</h2>
        <Field label="Sản phẩm"><Select value={qcId} onChange={setQcId} options={products.map(p => ({ value: p.id, label: `${p.id} — ${p.name}` }))} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Biến thể (nếu có)"><Input value={qcVar} onChange={e => setQcVar(e.target.value)} placeholder="Đen / M" className="h-11" /></Field><Field label="Số lượng đếm thực tế"><Input type="number" min="0" value={qcQty} onChange={e => setQcQty(e.target.value)} className="h-11" /></Field></div>
        <p className="text-[11px] text-muted-foreground">Tồn kho đang tính theo sản phẩm, biến thể chỉ được ghi chú vào lịch sử.</p>{qcErr && <p className="text-destructive text-xs">{qcErr}</p>}<Button onClick={quick}>Cập nhật nhanh</Button></section>
      <form onSubmit={create} noValidate className="border border-border p-6 space-y-4"><h2 className="font-semibold">Tạo phiên kiểm kê</h2>
        <Field label="Tên phiên"><Input value={name} onChange={e => setName(e.target.value)} placeholder="Kiểm kê cuối tháng 9" className="h-11" /></Field>
        <Field label="Điều kiện tạo phiên"><Select value={cond} onChange={setCond} options={conditions.map(c => ({ value: c, label: c }))} /></Field>{nameErr && <p className="text-destructive text-xs">{nameErr}</p>}<Button type="submit">Xác nhận tạo phiên</Button></form>
    </div>

    <h2 className="font-semibold mb-3">Danh sách phiên kiểm kê</h2>
    {sessions.length === 0 ? <p className="text-sm text-muted-foreground border border-dashed border-border py-10 text-center">Chưa có phiên kiểm kê nào.</p> :
      <Table><thead><tr><th className={th}>Tên phiên</th><th className={th}>Điều kiện</th><th className={th}>Ngày tạo</th><th className={th}>Dòng</th><th className={th}>Trạng thái</th><th className={th}>Thao tác</th></tr></thead><tbody>{sessions.map(s => <tr key={s.id}><td className={td}><b>{s.name}</b></td><td className={td}>{s.condition}</td><td className={td}>{s.createdAt}</td><td className={td}>{s.lines.length}</td><td className={td}><Badge tone={s.applied ? "ok" : "warn"}>{s.applied ? "Đã áp dụng" : "Chưa áp dụng"}</Badge></td>
        <td className={td}><div className="flex flex-wrap items-center gap-1"><Button variant="ghost" size="icon" aria-label="Mở chi tiết phiên" onClick={() => setOpenId(s.id)}><Eye /></Button><Button variant="ghost" size="icon" aria-label="Tải CSV mẫu" onClick={() => sample(s)}><Download /></Button>
          <label className="text-xs border border-border px-2 py-2 cursor-pointer hover:bg-secondary max-w-40 truncate"><FileUp className="size-3 inline mr-1" />{files[s.id]?.name ?? "Chọn file CSV"}<input type="file" accept=".csv,text/csv" className="sr-only" disabled={s.applied} onChange={e => { const f = e.target.files?.[0]; if (f) setFiles(cur => ({ ...cur, [s.id]: f })); }} /></label>
          <Button variant="ghost" size="icon" aria-label="Upload CSV" disabled={s.applied || !files[s.id]} onClick={() => void upload(s)}><Upload /></Button><Button size="sm" disabled={s.applied} onClick={() => applySession(s)}>Áp dụng</Button><Button variant="ghost" size="icon" aria-label="Xóa phiên" onClick={() => { void a.run(sessionService.remove(s.id), "Đã xóa phiên kiểm kê"); }}><Trash2 /></Button></div></td></tr>)}</tbody></Table>}
    <Modal open={opened !== undefined} onOpenChange={o => { if (!o) setOpenId(null); }} title={opened?.name ?? ""} desc={opened ? `${opened.condition} — ${opened.createdAt}` : undefined} className="max-w-2xl">{opened && <Table><thead><tr><th className={th}>Sản phẩm</th><th className={th}>Hệ thống</th><th className={th}>Đếm thực tế</th><th className={th}>Chênh lệch</th></tr></thead><tbody>{opened.lines.map(l => <tr key={l.productId}><td className={td}>{productName(l.productId)}</td><td className={td}>{l.expected}</td><td className={td}><Input type="number" min="0" aria-label={`Đếm ${productName(l.productId)}`} disabled={opened.applied} value={l.counted ?? ""} onChange={e => patchSession(opened.id, x => ({ ...x, lines: x.lines.map(y => y.productId === l.productId ? { ...y, counted: e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value))) } : y) }))} className="h-9 w-24" /></td><td className={td}>{l.counted === null ? "—" : l.counted - l.expected}</td></tr>)}</tbody></Table>}</Modal>
    <VietQrSandboxModal
      order={sandboxQrOrder}
      open={!!sandboxQrOrder}
      onOpenChange={o => !o && setSandboxQrOrder(null)}
    />
  </>;
}
