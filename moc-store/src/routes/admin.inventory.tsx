import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, PlusCircle, AlertTriangle, PackageX, Boxes, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHead, Badge, Select, Modal, Field, Table, th, td } from "@/components/admin/admin-ui";
import { useAdmin, stockState, withinDays, type AProduct } from "@/lib/admin-data";
import { useInventory, useStockLog } from "@/services/hooks";
import { inventoryService } from "@/services";

export const Route = createFileRoute("/admin/inventory")({
  head: () => ({ meta: [{ title: "Quản lý tồn kho — MỘC" }] }),
  component: Inventory,
});

const timeOpts = [
  { value: "0", label: "Tất cả thời gian" },
  { value: "7", label: "7 ngày qua" },
  { value: "30", label: "30 ngày qua" },
];

function Inventory() {
  const a = useAdmin();
  const products = useInventory();
  const stockLog = useStockLog();

  const [days, setDays] = useState("0");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [sel, setSel] = useState<string[]>([]);
  const [detail, setDetail] = useState<AProduct | null>(null);
  const [restockProduct, setRestockProduct] = useState<AProduct | null>(null);
  const [addQty, setAddQty] = useState("10");
  const [note, setNote] = useState("Nhập hàng bổ sung từ xưởng");
  const [err, setErr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lastChange = (id: string) => stockLog.find(l => l.productId === id)?.date ?? "—";

  // Thống kê nhanh
  const totalStockUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 10).length;
  const outOfStockCount = products.filter(p => p.stock <= 0).length;

  const rows = products.filter(p => {
    if (days !== "0" && !withinDays(lastChange(p.id), Number(days))) return false;
    if (stockFilter === "low") return p.stock > 0 && p.stock <= 10;
    if (stockFilter === "out") return p.stock <= 0;
    return true;
  });

  const all = rows.length > 0 && rows.every(p => sel.includes(p.id));

  const handleRestock = async () => {
    if (!restockProduct) return;
    const additional = Number(addQty);
    if (!Number.isInteger(additional) || additional <= 0) {
      setErr("Số lượng nhập thêm phải là số nguyên dương lớn hơn 0.");
      return;
    }

    const newTotal = restockProduct.stock + additional;
    setIsSubmitting(true);
    setErr("");

    const success = await a.run(
      inventoryService.restock(restockProduct, newTotal, note.trim() || "Nhập thêm tồn kho"),
      `Đã nhập thêm +${additional} sản phẩm cho ${restockProduct.name}`,
    );

    setIsSubmitting(false);
    if (success) {
      setRestockProduct(null);
    }
  };

  return (
    <>
      <PageHead
        eyebrow="Kho hàng"
        title="Quản lý tồn kho"
        desc="Theo dõi số lượng, cảnh báo hàng sắp hết và nhập bổ sung tồn kho cho các sản phẩm MỘC."
      />

      {/* Thẻ thống kê tổng quan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="border border-border p-4 bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs">Tổng mã hàng</span>
            <Boxes className="size-4" />
          </div>
          <p className="text-2xl font-semibold">{products.length}</p>
        </div>

        <div className="border border-border p-4 bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs">Tổng sản phẩm trong kho</span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-semibold">{totalStockUnits}</p>
        </div>

        <button
          type="button"
          onClick={() => setStockFilter(stockFilter === "low" ? "all" : "low")}
          className={`border p-4 text-left transition-all ${
            stockFilter === "low"
              ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500"
              : "border-border bg-card hover:border-amber-500/50"
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-xs font-medium">Sắp hết hàng (≤ 10)</span>
            <AlertTriangle className="size-4" />
          </div>
          <p className="text-2xl font-semibold text-amber-700">{lowStockCount}</p>
        </button>

        <button
          type="button"
          onClick={() => setStockFilter(stockFilter === "out" ? "all" : "out")}
          className={`border p-4 text-left transition-all ${
            stockFilter === "out"
              ? "border-destructive bg-destructive/10 ring-1 ring-destructive"
              : "border-border bg-card hover:border-destructive/50"
          }`}
        >
          <div className="flex items-center justify-between text-destructive mb-1">
            <span className="text-xs font-medium">Hết hàng (0)</span>
            <PackageX className="size-4" />
          </div>
          <p className="text-2xl font-semibold text-destructive">{outOfStockCount}</p>
        </button>
      </div>

      {/* Thanh công cụ lọc */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground font-medium mr-1">Bộ lọc:</span>
          {[
            { id: "all", label: `Tất cả (${products.length})` },
            { id: "low", label: `Sắp hết (${lowStockCount})` },
            { id: "out", label: `Hết hàng (${outOfStockCount})` },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStockFilter(f.id as typeof stockFilter)}
              className={`px-3 py-1.5 rounded-sm border transition-colors ${
                stockFilter === f.id
                  ? "bg-foreground text-background border-foreground font-semibold"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="ml-2">
            <Select label="Thời gian" value={days} onChange={setDays} options={timeOpts} />
          </div>
        </div>

        <span className="text-xs text-muted-foreground">
          {sel.length > 0 ? `Đã chọn ${sel.length}` : `Hiển thị ${rows.length} sản phẩm`}
        </span>
      </div>

      {/* Bảng danh sách tồn kho */}
      <Table>
        <thead>
          <tr>
            <th className={th}>
              <input
                type="checkbox"
                aria-label="Chọn tất cả"
                className="accent-accent size-4"
                checked={all}
                onChange={e => setSel(e.target.checked ? rows.map(p => p.id) : [])}
              />
            </th>
            <th className={th}>Sản phẩm</th>
            <th className={th}>Tồn kho</th>
            <th className={th}>Tình trạng</th>
            <th className={th}>Cập nhật gần nhất</th>
            <th className={th}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(p => {
            const s = stockState(p.stock);
            const isCritical = p.stock <= 5;
            const isZero = p.stock <= 0;

            return (
              <tr key={p.id} className={isZero ? "bg-destructive/5" : isCritical ? "bg-amber-500/5" : ""}>
                <td className={td}>
                  <input
                    type="checkbox"
                    aria-label={`Chọn ${p.name}`}
                    className="accent-accent size-4"
                    checked={sel.includes(p.id)}
                    onChange={e =>
                      setSel(e.target.checked ? [...sel, p.id] : sel.filter(x => x !== p.id))
                    }
                  />
                </td>
                <td className={td}>
                  <span className="font-medium text-foreground">{p.name}</span>
                  <span className="text-xs text-muted-foreground block">{p.category}</span>
                </td>
                <td className={td}>
                  <span
                    className={`font-semibold ${
                      isZero ? "text-destructive" : isCritical ? "text-amber-700" : "text-foreground"
                    }`}
                  >
                    {p.stock}
                  </span>
                </td>
                <td className={td}>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </td>
                <td className={td}>{lastChange(p.id)}</td>
                <td className={td}>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Xem chi tiết lịch sử kho"
                      onClick={() => setDetail(p)}
                    >
                      <Eye className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs flex items-center gap-1"
                      onClick={() => {
                        setRestockProduct(p);
                        setAddQty("10");
                        setNote("Nhập hàng bổ sung từ xưởng");
                        setErr("");
                      }}
                    >
                      <PlusCircle className="size-3.5 text-accent" /> Nhập kho
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      {/* Modal Lịch sử nhập xuất kho */}
      <Modal
        open={detail !== null}
        onOpenChange={o => {
          if (!o) setDetail(null);
        }}
        title={detail?.name ?? ""}
        desc={detail ? `Tồn hiện tại: ${detail.stock} sản phẩm` : undefined}
      >
        <div className="text-sm space-y-2 mt-2">
          {detail &&
            stockLog
              .filter(l => l.productId === detail.id)
              .map(l => (
                <div key={l.id} className="flex justify-between items-center border-b pb-2 text-xs">
                  <div>
                    <span className="font-mono text-muted-foreground mr-2">{l.date}</span>
                    <span>{l.note}</span>
                  </div>
                  <span
                    className={`font-semibold ${
                      l.delta >= 0 ? "text-emerald-700" : "text-destructive"
                    }`}
                  >
                    {l.delta > 0 ? `+${l.delta}` : l.delta}
                  </span>
                </div>
              ))}
          {detail && stockLog.every(l => l.productId !== detail.id) && (
            <p className="text-muted-foreground text-xs py-4 text-center">Chưa có lịch sử thay đổi tồn kho.</p>
          )}
        </div>
      </Modal>

      {/* Modal Nhập thêm hàng */}
      <Modal
        open={restockProduct !== null}
        onOpenChange={o => {
          if (!o) setRestockProduct(null);
        }}
        title="Nhập thêm tồn kho"
        desc={restockProduct ? `${restockProduct.name} — Tồn hiện tại: ${restockProduct.stock}` : undefined}
      >
        <div className="space-y-4 mt-2">
          <Field label="Số lượng nhập thêm">
            <Input
              type="number"
              min="1"
              value={addQty}
              onChange={e => setAddQty(e.target.value)}
              className="h-11"
              placeholder="Nhập số lượng..."
            />
          </Field>

          {/* Nút chọn nhanh số lượng */}
          <div className="flex gap-2">
            {[5, 10, 20, 50, 100].map(val => (
              <Button
                key={val}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setAddQty(String(val))}
              >
                +{val}
              </Button>
            ))}
          </div>

          {restockProduct && Number(addQty) > 0 && (
            <div className="p-3 bg-secondary/60 text-xs border border-border/60 flex justify-between">
              <span className="text-muted-foreground">Tồn kho dự kiến sau khi nhập:</span>
              <span className="font-semibold text-emerald-700">
                {restockProduct.stock + Number(addQty)} sản phẩm
              </span>
            </div>
          )}

          <Field label="Ghi chú nhập hàng">
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              className="h-11"
              placeholder="Nhập từ xưởng, chuyển kho, hoàn hàng..."
            />
          </Field>

          {err && <p className="text-destructive text-xs">{err}</p>}

          <Button className="w-full h-11" disabled={isSubmitting} onClick={handleRestock}>
            {isSubmitting ? "Đang xử lý..." : "Xác nhận nhập kho"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
