import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Eye, Printer, X, Truck, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHead, Badge, Select, Modal, Table, th, td } from "@/components/admin/admin-ui";
import { useAdmin, type AOrder, type OrderStatus } from "@/lib/admin-data";
import { useOrders } from "@/services/hooks";
import { orderService } from "@/services";
import { money } from "@/lib/store";
import { InvoiceModal } from "@/components/invoice-modal";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({ meta: [{ title: "Quản lý đơn hàng — MỘC" }] }),
  component: Orders,
});

const tone = (s: OrderStatus) =>
  ["Đã duyệt", "Đang giao", "Hoàn tất"].includes(s)
    ? "ok"
    : s === "Đã hủy" || s === "Đã trả hàng"
    ? "bad"
    : "warn";

function Orders() {
  const a = useAdmin();
  const [refreshToken, setRefreshToken] = useState(0);
  const orders = useOrders(true, refreshToken);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<AOrder | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<AOrder | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<AOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rows = orders.filter(o => filter === "all" || o.status === filter);

  const setStatus = async (id: string, status: OrderStatus, message: string) => {
    const success = await a.run(orderService.setStatus(id, status), message);
    if (success) {
      setRefreshToken(value => value + 1);
      if (view?.id === id) {
        setView(prev => (prev ? { ...prev, status } : null));
      }
    }
  };

  const confirmCancel = async () => {
    if (!cancellingOrder) return;
    setIsSubmitting(true);
    await setStatus(cancellingOrder.id, "Đã hủy", `Đã hủy đơn hàng #${cancellingOrder.id} và hoàn trả kho hàng.`);
    setIsSubmitting(false);
    setCancellingOrder(null);
  };

  return (
    <>
      <PageHead
        eyebrow="Bán hàng"
        title="Quản lý đơn hàng"
        desc="Theo dõi tiến độ, duyệt đơn, xuất hóa đơn và điều phối giao hàng."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <Select
            label="Lọc theo trạng thái"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              { value: "Chờ duyệt", label: "Chờ duyệt" },
              { value: "Đã duyệt", label: "Đã duyệt" },
              { value: "Đang giao", label: "Đang giao" },
              { value: "Hoàn tất", label: "Hoàn tất" },
              { value: "Đã hủy", label: "Đã hủy" },
              { value: "Đã trả hàng", label: "Đã trả hàng" },
            ]}
          />
        </div>
        <span className="text-xs text-muted-foreground">{rows.length} đơn hàng</span>
      </div>

      <Table>
        <thead>
          <tr>
            <th className={th}>Mã đơn</th>
            <th className={th}>Khách hàng</th>
            <th className={th}>Ngày đặt</th>
            <th className={th}>Tổng tiền</th>
            <th className={th}>Trạng thái</th>
            <th className={th}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(o => (
            <tr key={o.id}>
              <td className={td}>
                <span className="font-mono text-xs font-semibold">#{o.id.slice(0, 8)}...</span>
              </td>
              <td className={td}>
                <div>
                  <p className="font-medium text-foreground">{o.customer}</p>
                  <p className="text-xs text-muted-foreground">{o.phone}</p>
                </div>
              </td>
              <td className={td}>{o.date.split("-").reverse().join("/")}</td>
              <td className={td}>
                <span className="font-semibold">{money(o.total)}</span>
                {Boolean(o.discountTotal && o.discountTotal > 0) && (
                  <p className="text-[11px] text-accent">Voucher: -{money(o.discountTotal || 0)}</p>
                )}
              </td>
              <td className={td}>
                <Badge tone={tone(o.status)}>{o.status}</Badge>
              </td>
              <td className={td}>
                <div className="flex items-center gap-1">
                  {/* Chờ duyệt -> Duyệt đơn */}
                  {o.status === "Chờ duyệt" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Duyệt đơn hàng"
                      aria-label="Duyệt đơn"
                      onClick={() => setStatus(o.id, "Đã duyệt", "Đã duyệt đơn hàng")}
                    >
                      <Check className="size-4 text-emerald-600" />
                    </Button>
                  )}

                  {/* Đã duyệt -> Chuyển Đang giao */}
                  {o.status === "Đã duyệt" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Chuyển sang Đang giao"
                      aria-label="Đang giao"
                      onClick={() => setStatus(o.id, "Đang giao", "Đã chuyển sang trạng thái Đang giao")}
                    >
                      <Truck className="size-4 text-sky-600" />
                    </Button>
                  )}

                  {/* Đang giao -> Hoàn tất */}
                  {o.status === "Đang giao" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Xác nhận hoàn tất đơn hàng"
                      aria-label="Hoàn tất"
                      onClick={() => setStatus(o.id, "Hoàn tất", "Đơn hàng đã hoàn tất")}
                    >
                      <CheckCircle2 className="size-4 text-accent" />
                    </Button>
                  )}

                  {/* Hủy đơn (khi Chờ duyệt hoặc Đã duyệt) */}
                  {(o.status === "Chờ duyệt" || o.status === "Đã duyệt") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Hủy đơn hàng"
                      aria-label="Hủy đơn"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setCancellingOrder(o)}
                    >
                      <X className="size-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    title="Xem chi tiết"
                    aria-label="Xem chi tiết"
                    onClick={() => setView(o)}
                  >
                    <Eye className="size-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    title="In / Xuất hóa đơn"
                    aria-label="In hóa đơn"
                    onClick={() => setInvoiceOrder(o)}
                  >
                    <Printer className="size-4 text-accent" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Modal Chi tiết đơn hàng */}
      <Modal
        open={view !== null}
        onOpenChange={o => {
          if (!o) setView(null);
        }}
        title={view ? `Chi tiết đơn #${view.id}` : ""}
        desc={view?.date ? `Đặt ngày ${view.date.split("-").reverse().join("/")}` : undefined}
      >
        {view && (
          <div className="text-sm space-y-3.5 mt-2">
            <div className="p-3 bg-secondary/50 border border-border/60 text-xs space-y-1">
              <p>
                <b className="text-foreground">Người nhận:</b> {view.customer} — {view.phone}
              </p>
              <p>
                <b className="text-foreground">Địa chỉ giao:</b> {view.address}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Sản phẩm trong đơn:
              </p>
              <p className="leading-relaxed bg-background p-3 border border-border text-xs">{view.items}</p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-muted-foreground">Trạng thái hiện tại:</span>
              <Badge tone={tone(view.status)}>{view.status}</Badge>
            </div>

            <div className="p-3 bg-background border border-border text-xs space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Tạm tính:</span>
                <span>{money(view.subtotal || view.total)}</span>
              </div>
              {Boolean(view.discountTotal && view.discountTotal > 0) && (
                <div className="flex justify-between text-accent font-medium">
                  <span>Giảm giá voucher ({view.couponCode || "VOUCHER"}):</span>
                  <span>-{money(view.discountTotal || 0)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Phí vận chuyển:</span>
                <span className="text-emerald-600 font-medium">Miễn phí toàn quốc</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Phương thức:</span>
                <span>{view.paymentMethod === "BANKING" ? "Chuyển khoản ngân hàng" : "Thanh toán khi nhận hàng (COD)"}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-base font-semibold pt-1 border-t">
              <span>Tổng thanh toán:</span>
              <span className="text-accent">{money(view.total)}</span>
            </div>

            <div className="pt-4 border-t flex flex-wrap justify-end gap-2">
              {(view.status === "Chờ duyệt" || view.status === "Đã duyệt") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => {
                    setCancellingOrder(view);
                    setView(null);
                  }}
                >
                  <X className="size-3.5 mr-1" /> Hủy đơn
                </Button>
              )}

              {view.status === "Chờ duyệt" && (
                <Button
                  size="sm"
                  onClick={() => setStatus(view.id, "Đã duyệt", "Đã duyệt đơn hàng")}
                >
                  <Check className="size-3.5 mr-1" /> Duyệt đơn
                </Button>
              )}

              {view.status === "Đã duyệt" && (
                <Button
                  size="sm"
                  onClick={() => setStatus(view.id, "Đang giao", "Đã chuyển sang trạng thái Đang giao")}
                >
                  <Truck className="size-3.5 mr-1" /> Bắt đầu giao
                </Button>
              )}

              {view.status === "Đang giao" && (
                <Button
                  size="sm"
                  onClick={() => setStatus(view.id, "Hoàn tất", "Đơn hàng đã hoàn tất")}
                >
                  <CheckCircle2 className="size-3.5 mr-1" /> Hoàn tất đơn
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  setInvoiceOrder(view);
                  setView(null);
                }}
              >
                <Printer className="size-4" /> In hóa đơn
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Xác nhận hủy đơn hàng Admin */}
      <Modal
        open={cancellingOrder !== null}
        onOpenChange={o => {
          if (!o) setCancellingOrder(null);
        }}
        title="Xác nhận hủy đơn hàng"
        desc={cancellingOrder ? `Đơn hàng #${cancellingOrder.id}` : undefined}
      >
        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-2.5 text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <p className="text-xs font-medium">Hành động này sẽ hủy đơn và hoàn trả tồn kho tự động.</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Hệ thống sẽ chạy transaction hoàn lại toàn bộ số lượng sản phẩm của đơn hàng #{cancellingOrder?.id} vào kho hàng và ghi log lịch sử tồn kho với lý do <code>cancelled</code>.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setCancellingOrder(null)}
            >
              Giữ lại
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isSubmitting}
              onClick={confirmCancel}
            >
              {isSubmitting ? "Đang xử lý..." : "Xác nhận hủy đơn"}
            </Button>
          </div>
        </div>
      </Modal>

      <InvoiceModal
        order={invoiceOrder}
        open={invoiceOrder !== null}
        onOpenChange={open => {
          if (!open) setInvoiceOrder(null);
        }}
      />
    </>
  );
}
