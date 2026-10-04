import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Archive, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHead, Badge, Select, Modal, Table, th, td } from "@/components/admin/admin-ui";
import { useAdmin, withinDays, type AProduct } from "@/lib/admin-data";
import { useProducts } from "@/services/hooks";
import { productService } from "@/services";
import { money } from "@/lib/store";
export const Route = createFileRoute("/admin/products/")({ head: () => ({ meta: [{ title: "Quản lý sản phẩm — MỘC" }] }), component: Products });
const timeOpts = [{ value: "0", label: "Tất cả thời gian" }, { value: "7", label: "7 ngày qua" }, { value: "30", label: "30 ngày qua" }, { value: "90", label: "90 ngày qua" }];
function Products() {
  const a = useAdmin(); const products = useProducts(a.signedIn); const [days, setDays] = useState("0"); const [sel, setSel] = useState<string[]>([]); const [removed, setRemoved] = useState<string[]>([]); const [view, setView] = useState<AProduct | null>(null);
  const rows = products.filter(p => !removed.includes(p.id) && !(p.apiId && removed.includes(p.apiId)) && withinDays(p.createdAt, Number(days)));
  const all = rows.length > 0 && rows.every(p => sel.includes(p.id));
  const stop = (ids: string[]) => { void a.run(productService.setStatus(ids, "Ngừng bán", a.signedIn, products), "Đã chuyển sang trạng thái ngừng bán"); setSel([]); };
  const remove = (product: AProduct) => {
    void a.run(productService.remove(product, a.signedIn), "Đã xóa sản phẩm").then(ok => {
      if (ok) setRemoved(current => [...current, product.id, ...(product.apiId ? [product.apiId] : [])]);
    });
  };
  return <><PageHead eyebrow="Danh mục" title="Quản lý sản phẩm" action={<Link to="/admin/products/edit" search={{ id: undefined }}><Button><Plus /> Thêm sản phẩm</Button></Link>} />
    <div className="flex flex-wrap items-center gap-3 mb-5"><Select label="Lọc theo thời gian" value={days} onChange={setDays} options={timeOpts} />{sel.length > 0 && <Button variant="outline" onClick={() => stop(sel)}>Ngừng bán {sel.length} sản phẩm đã chọn</Button>}<span className="text-xs text-muted-foreground ml-auto">{rows.length} sản phẩm</span></div>
    <Table><thead><tr><th className={th}><input type="checkbox" aria-label="Chọn tất cả" className="accent-accent size-4" checked={all} onChange={e => setSel(e.target.checked ? rows.map(p => p.id) : [])} /></th><th className={th}>Sản phẩm</th><th className={th}>Danh mục</th><th className={th}>Giá</th><th className={th}>Tồn</th><th className={th}>Ngày tạo</th><th className={th}>Trạng thái</th><th className={th}>Thao tác</th></tr></thead>
      <tbody>{rows.map(p => <tr key={p.id}><td className={td}><input type="checkbox" aria-label={`Chọn ${p.name}`} className="accent-accent size-4" checked={sel.includes(p.id)} onChange={e => setSel(e.target.checked ? [...sel, p.id] : sel.filter(x => x !== p.id))} /></td>
        <td className={td}><div className="flex items-center gap-3"><img src={p.image} alt={p.name} className="w-10 h-12 object-cover" /><span className="font-medium">{p.name}</span></div></td><td className={td}>{p.category}</td><td className={td}>{money(p.price)}</td><td className={td}>{p.stock}</td><td className={td}>{p.createdAt}</td>
        <td className={td}><Badge tone={p.status === "Đang bán" ? "ok" : "muted"}>{p.status}</Badge></td>
        <td className={td}><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="Xem chi tiết" onClick={() => setView(p)}><Eye /></Button><Link to="/admin/products/edit" search={{ id: p.id }}><Button variant="ghost" size="icon" aria-label="Sửa"><Pencil /></Button></Link><Button variant="ghost" size="icon" aria-label="Ngừng bán" disabled={p.status === "Ngừng bán"} onClick={() => stop([p.id])}><Archive /></Button><Button variant="ghost" size="icon" aria-label="Xóa sản phẩm" onClick={() => remove(p)}><Trash2 /></Button></div></td></tr>)}</tbody></Table>
    {rows.length === 0 && <p className="text-center text-sm text-muted-foreground py-10">Không có sản phẩm trong khoảng thời gian này.</p>}
    <Modal open={view !== null} onOpenChange={o => { if (!o) setView(null); }} title={view?.name ?? ""} desc={view?.category}>{view && <div className="flex gap-5"><img src={view.image} alt={view.name} className="w-32 h-40 object-cover" /><div className="text-sm space-y-2"><p className="font-semibold">{money(view.price)}</p><p>Màu: {view.colors.map(c => c.name).join(", ")}</p><p>Size: {view.sizes.join(", ")}</p><p>Tồn kho: {view.stock}</p><p className="text-muted-foreground leading-6">{view.description}</p></div></div>}</Modal></>;
}
