import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Upload, Link2, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHead, Field, Select, opts } from "@/components/admin/admin-ui";
import { useAdmin, type AProduct } from "@/lib/admin-data";
import { useProducts } from "@/services/hooks";
import { categoryService, productService } from "@/services";
import { swatchFor } from "@/services/images";

export const Route = createFileRoute("/admin/products/edit")({
  validateSearch: (s: Record<string, unknown>): { id: string | undefined } => ({ id: typeof s["id"] === "string" ? s["id"] : undefined }),
  head: () => ({ meta: [{ title: "Thêm / sửa sản phẩm — MỘC" }] }), component: ProductForm,
});

const cats = ["Áo nữ", "Quần nữ", "Đầm nữ", "Áo nam", "Quần nam"];
const list = (v: FormDataEntryValue | null) => String(v || "").split(",").map(x => x.trim()).filter(Boolean);

function optimizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const maxDim = 1200;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(String(reader.result)); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function ProductForm() {
  const a = useAdmin(); const { id } = Route.useSearch(); const nav = useNavigate(); const products = useProducts(a.signedIn); const cur = id ? products.find(p => p.id === id) : undefined;
  const [categories, setCategories] = useState<{ id: string; title: string }[]>([]); const [category, setCategory] = useState(cur?.categoryId ?? cur?.category ?? (a.signedIn ? "" : "Áo nữ")); const [preview, setPreview] = useState(cur?.image ?? products[0]?.image ?? ""); const [err, setErr] = useState("");
  useEffect(() => { if (!a.signedIn) return; void categoryService.listAdmin().then(setCategories).catch(error => console.error("Không tải được danh mục từ API", error)); }, [a.signedIn]);
  useEffect(() => { if (cur) { setCategory(cur.categoryId ?? cur.category); setPreview(cur.image); } }, [cur]);
  useEffect(() => { if (!cur && !category && categories[0]) setCategory(categories[0].id); }, [categories, category, cur]);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const d = new FormData(e.currentTarget); const name = String(d.get("name") || "").trim(); const price = Number(d.get("price")); const stock = Number(d.get("stock")); const colors = list(d.get("colors")).map(swatchFor); const sizes = list(d.get("sizes"));
    if (!name || !(price > 0) || !Number.isInteger(stock) || stock < 0) { setErr("Vui lòng nhập tên, giá lớn hơn 0 và tồn kho là số nguyên không âm."); return; }
    if (!colors.length || !sizes.length) { setErr("Vui lòng nhập ít nhất một màu và một kích cỡ."); return; }
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sp";
    const newId = products.some(p => p.id === slug) ? `${slug}-${Date.now()}` : slug;
    const selectedCategory = categories.find(item => item.id === category); const next: AProduct = { id: cur?.id ?? newId, ...(cur?.apiId ? { apiId: cur.apiId } : {}), ...(selectedCategory ? { categoryId: selectedCategory.id } : cur?.categoryId ? { categoryId: cur.categoryId } : {}), name, category: selectedCategory?.title ?? (cur?.category === category ? cur.category : category), price, stock, colors, sizes, description: String(d.get("description") || ""), image: preview, status: cur?.status ?? "Đang bán", createdAt: cur?.createdAt ?? new Date().toISOString().slice(0, 10), ...(cur?.label ? { label: cur.label } : {}) };
    void a.run(productService.save(next, a.signedIn), cur ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm mới").then(ok => { if (ok) void nav({ to: "/admin/products" }); });
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setErr("");
    try {
      const dataUrl = await optimizeImage(f);
      setPreview(dataUrl);
    } catch {
      setErr("Không thể xử lý ảnh, vui lòng thử lại bằng ảnh khác.");
    }
  };

  return <><Link to="/admin/products" className="inline-flex items-center gap-2 text-sm mb-6 hover:text-accent"><ArrowLeft className="size-4" /> Danh sách sản phẩm</Link>
    <PageHead eyebrow="Sản phẩm" title={cur ? "Sửa sản phẩm" : "Thêm sản phẩm"} />
    <form key={cur?.id ?? "new"} onSubmit={submit} noValidate className="grid lg:grid-cols-[1fr_300px] gap-8 max-w-5xl">
      <div className="space-y-5"><Field label="Tên sản phẩm"><Input name="name" defaultValue={cur?.name ?? ""} className="h-11" /></Field>
        <div className="grid sm:grid-cols-2 gap-5"><Field label="Danh mục"><Select value={category} onChange={setCategory} options={categories.length ? categories.map(item => ({ value: item.id, label: item.title })) : opts(cats)} /></Field><Field label="Giá (₫)"><Input name="price" type="number" min="0" defaultValue={cur?.price ?? ""} className="h-11" /></Field></div>
        <div className="grid sm:grid-cols-2 gap-5"><Field label="Màu sắc (cách nhau bởi dấu phẩy)"><Input name="colors" defaultValue={cur?.colors.map(c => c.name).join(", ") ?? ""} className="h-11" placeholder="Trắng, Đen" /></Field><Field label="Kích cỡ (cách nhau bởi dấu phẩy)"><Input name="sizes" defaultValue={cur?.sizes.join(", ") ?? ""} className="h-11" placeholder="S, M, L" /></Field></div>
        <Field label="Tồn kho"><Input name="stock" type="number" min="0" defaultValue={cur?.stock ?? 0} className="h-11" /></Field>
        <Field label="Mô tả"><textarea name="description" defaultValue={cur?.description ?? ""} className="w-full border border-border bg-card p-3 text-sm min-h-32 outline-none focus:border-accent" /></Field>
        {err && <p className="text-destructive text-xs">{err}</p>}<div className="flex gap-3"><Button type="submit">Lưu sản phẩm</Button><Link to="/admin/products"><Button type="button" variant="outline">Hủy</Button></Link></div></div>
      <div className="space-y-3">
        <p className="text-xs font-medium">Ảnh sản phẩm</p>
        <div className="border border-border bg-secondary/30 rounded-lg p-3.5 space-y-3">
          {preview ? (
            <div className="relative group">
              <img src={preview} alt="Xem trước" className="w-full h-52 object-cover rounded-md border border-border" />
              <button
                type="button"
                onClick={() => setPreview("")}
                className="absolute top-2 right-2 p-1.5 bg-background/90 hover:bg-destructive hover:text-white rounded-full shadow transition"
                aria-label="Xóa ảnh"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-7 text-muted-foreground border border-dashed border-border rounded-md">
              <ImageIcon className="size-8 mb-2 opacity-40" />
              <p className="text-xs font-medium">Chưa có ảnh</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="inline-flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium border border-border bg-background hover:bg-secondary rounded-md cursor-pointer transition">
              <Upload className="size-3.5" />
              <span>Tải ảnh lên</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  void pick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase text-muted-foreground">hoặc</span>
              <div className="relative flex-1">
                <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Dán link ảnh (URL)..."
                  value={preview.startsWith("data:") ? "" : preview}
                  onChange={e => setPreview(e.target.value.trim())}
                  className="h-8 pl-8 text-xs bg-background"
                />
              </div>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground leading-normal">
          Hỗ trợ JPG, PNG, WEBP hoặc dán URL ảnh trực tiếp. Ảnh tự động tối ưu hóa khi tải lên.
        </p>
      </div>
    </form></>;
}
