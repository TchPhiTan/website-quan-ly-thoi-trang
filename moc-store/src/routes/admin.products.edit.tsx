import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHead, Field, Select, opts } from "@/components/admin/admin-ui";
import { useAdmin, type AProduct } from "@/lib/admin-data";
import { useProducts } from "@/services/hooks";
import { productService } from "@/services";
import { swatchFor } from "@/services/images";
export const Route = createFileRoute("/admin/products/edit")({
  validateSearch: (s: Record<string, unknown>): { id: string | undefined } => ({ id: typeof s["id"] === "string" ? s["id"] : undefined }),
  head: () => ({ meta: [{ title: "Thêm / sửa sản phẩm — MỘC" }] }), component: ProductForm,
});
const cats = ["Áo nữ", "Quần nữ", "Đầm", "Áo nam", "Quần nam"];
const list = (v: FormDataEntryValue | null) => String(v || "").split(",").map(x => x.trim()).filter(Boolean);
function ProductForm() {
  const a = useAdmin(); const { id } = Route.useSearch(); const nav = useNavigate(); const products = useProducts(); const cur = id ? products.find(p => p.id === id) : undefined;
  const [category, setCategory] = useState(cur?.category ?? "Áo nữ"); const [preview, setPreview] = useState(cur?.image ?? products[0]?.image ?? ""); const [err, setErr] = useState("");
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const d = new FormData(e.currentTarget); const name = String(d.get("name") || "").trim(); const price = Number(d.get("price")); const stock = Number(d.get("stock")); const colors = list(d.get("colors")).map(swatchFor); const sizes = list(d.get("sizes"));
    if (!name || !(price > 0) || !Number.isInteger(stock) || stock < 0) { setErr("Vui lòng nhập tên, giá lớn hơn 0 và tồn kho là số nguyên không âm."); return; }
    if (!colors.length || !sizes.length) { setErr("Vui lòng nhập ít nhất một màu và một kích cỡ."); return; }
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sp";
    const newId = products.some(p => p.id === slug) ? `${slug}-${Date.now()}` : slug;
    const next: AProduct = { id: cur?.id ?? newId, name, category, price, stock, colors, sizes, description: String(d.get("description") || ""), image: preview, status: cur?.status ?? "Đang bán", createdAt: cur?.createdAt ?? new Date().toISOString().slice(0, 10), ...(cur?.label ? { label: cur.label } : {}) };
    void a.run(productService.save(next), cur ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm mới").then(ok => { if (ok) void nav({ to: "/admin/products" }); });
  };
  const pick = (f: File | undefined) => { if (!f) return; if (f.size > 400 * 1024) { setErr("Ảnh quá lớn: bản mẫu chỉ nhận tối đa 400KB."); return; } const r = new FileReader(); r.onload = () => setPreview(String(r.result)); r.readAsDataURL(f); };
  return <><Link to="/admin/products" className="inline-flex items-center gap-2 text-sm mb-6 hover:text-accent"><ArrowLeft className="size-4" /> Danh sách sản phẩm</Link>
    <PageHead eyebrow="Sản phẩm" title={cur ? "Sửa sản phẩm" : "Thêm sản phẩm"} />
    <form key={cur?.id ?? "new"} onSubmit={submit} noValidate className="grid lg:grid-cols-[1fr_280px] gap-8 max-w-5xl">
      <div className="space-y-5"><Field label="Tên sản phẩm"><Input name="name" defaultValue={cur?.name ?? ""} className="h-11" /></Field>
        <div className="grid sm:grid-cols-2 gap-5"><Field label="Danh mục"><Select value={category} onChange={setCategory} options={opts(cats)} /></Field><Field label="Giá (₫)"><Input name="price" type="number" min="0" defaultValue={cur?.price ?? ""} className="h-11" /></Field></div>
        <div className="grid sm:grid-cols-2 gap-5"><Field label="Màu sắc (cách nhau bởi dấu phẩy)"><Input name="colors" defaultValue={cur?.colors.map(c => c.name).join(", ") ?? ""} className="h-11" placeholder="Trắng, Đen" /></Field><Field label="Kích cỡ (cách nhau bởi dấu phẩy)"><Input name="sizes" defaultValue={cur?.sizes.join(", ") ?? ""} className="h-11" placeholder="S, M, L" /></Field></div>
        <Field label="Tồn kho"><Input name="stock" type="number" min="0" defaultValue={cur?.stock ?? 0} className="h-11" /></Field>
        <Field label="Mô tả"><textarea name="description" defaultValue={cur?.description ?? ""} className="w-full border border-border bg-card p-3 text-sm min-h-32 outline-none focus:border-accent" /></Field>
        {err && <p className="text-destructive text-xs">{err}</p>}<div className="flex gap-3"><Button type="submit">Lưu sản phẩm</Button><Link to="/admin/products"><Button type="button" variant="outline">Hủy</Button></Link></div></div>
      <div><p className="text-xs font-medium mb-2">Ảnh sản phẩm</p><div className="bg-secondary mb-3">{preview ? <img src={preview} alt="Xem trước" className="product-image" /> : null}</div><input type="file" accept="image/*" className="text-xs w-full" onChange={e => pick(e.target.files?.[0])} /><p className="text-[11px] text-muted-foreground mt-2">Ảnh tối đa 400KB, lưu tạm trong trình duyệt. Khi có backend, tải ảnh lên máy chủ.</p></div>
    </form></>;
}
