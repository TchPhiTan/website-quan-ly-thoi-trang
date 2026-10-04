import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { money, useStore } from "@/lib/store";
import { useOrders, useProducts } from "@/services/hooks";
import { orderService } from "@/services";
import type { Order } from "@/services/types";
import { Check, Circle, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/account/orders")({ head: () => ({ meta: [{ title: "Lịch sử đơn hàng — MỘC" }, { name: "description", content: "Theo dõi các đơn hàng của bạn tại MỘC." }, { property: "og:title", content: "Lịch sử đơn hàng — MỘC" }, { property: "og:description", content: "Theo dõi các đơn hàng thời trang đã đặt." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Orders });

function Orders() {
  const store = useStore();
  const [refreshToken, setRefreshToken] = useState(0);
  const orders = useOrders(false, refreshToken);
  const products = useProducts();
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmCancel = async () => {
    if (!cancellingOrder) return;
    setIsSubmitting(true);
    try {
      await orderService.cancel(cancellingOrder.id);
      store.notify(`Đã hủy đơn hàng #${cancellingOrder.id}. Tồn kho đã được hoàn trả.`);
      setCancellingOrder(null);
      setRefreshToken(prev => prev + 1);
    } catch (error) {
      store.notify((error as Error).message || "Không thể hủy đơn hàng.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReorder = async (order: Order) => {
    try {
      for (const line of order.lines) {
        const prod = products.find(p => p.id === line.productId || p.apiId === line.productId);
        if (prod) {
          const firstVariant = prod.variants?.find(v => v.stock > 0) || prod.variants?.[0];
          await store.add(
            prod.id,
            firstVariant?.color || "Mặc định",
            firstVariant?.size || "M",
            line.quantity,
            firstVariant?.id,
          );
        }
      }
      store.notify("Đã thêm lại các sản phẩm vào giỏ hàng!");
      store.setCartOpen(true);
    } catch {
      store.notify("Không thể thêm một số sản phẩm vào giỏ hàng.");
    }
  };

  return (
    <>
      <h2 className="text-2xl font-medium mb-2">Lịch sử đơn hàng</h2>
      <p className="text-sm text-muted-foreground mb-8">Theo dõi hành trình đơn hàng của bạn.</p>
      {orders.length === 0 && (
        <p className="text-sm text-muted-foreground border border-dashed border-border py-12 text-center">Bạn chưa có đơn hàng nào.</p>
      )}
      <div className="space-y-6">
        {orders.map(order => {
          const product = products.find(p => p.id === order.lines[0]?.productId || p.apiId === order.lines[0]?.productId);
          const step = order.status === "Đã duyệt" ? 1 : order.status === "Đang giao" ? 2 : order.status === "Hoàn tất" ? 3 : 0;
          const cancelled = order.status === "Đã hủy";
          const canCancel = order.status === "Chờ duyệt";

          return (
            <article key={order.id} className="border border-border p-5 md:p-7">
              <div className="flex flex-wrap justify-between items-center gap-3 border-b pb-4 text-sm">
                <div>
                  <span className="font-semibold">#{order.id}</span>
                  <span className="text-muted-foreground ml-3">
                    Đặt ngày {order.date ? order.date.split("-").reverse().join("/") : "Mới đây"}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className={`font-medium ${cancelled ? "text-destructive" : "text-accent"}`}>
                    {order.status === "Chờ duyệt" ? "Chờ xác nhận" : order.status === "Đã duyệt" ? "Đã xác nhận" : order.status === "Đang giao" ? "Đang giao" : order.status === "Hoàn tất" ? "Hoàn tất" : "Đã hủy"}
                  </span>
                  {canCancel ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                      onClick={() => setCancellingOrder(order)}
                    >
                      Hủy đơn
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => handleReorder(order)}
                    >
                      <RotateCcw className="size-3 mr-1" /> Mua lại
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-4 py-5">
                {product && (
                  <Link to="/products/$productId" params={{ productId: product.id }}>
                    <img src={product.image} alt={product.name} className="w-20 h-25 object-cover" />
                  </Link>
                )}
                <div className="text-sm flex-1 min-w-0">
                  <p className="font-medium leading-6">{order.items}</p>
                  <p className="text-muted-foreground mt-1 text-xs">Giao tới: {order.address}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Phương thức: {order.paymentMethod === "BANKING" ? "Chuyển khoản ngân hàng" : "Thanh toán khi nhận hàng (COD)"}
                  </p>
                  <div className="mt-3 pt-3 border-t border-dashed flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 text-muted-foreground">
                      <p>Tạm tính: <span>{money(order.subtotal || order.total)}</span></p>
                      {Boolean(order.discountTotal && order.discountTotal > 0) && (
                        <p className="text-accent font-medium">
                          Giảm giá voucher {order.couponCode ? `(${order.couponCode})` : ""}: -{money(order.discountTotal || 0)}
                        </p>
                      )}
                      <p className="text-emerald-600 font-medium">Vận chuyển: Miễn phí toàn quốc</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Tổng thanh toán</span>
                      <span className="text-base font-semibold text-foreground">{money(order.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
              {!cancelled && (
                <div className="grid grid-cols-4 gap-1 pt-5 border-t">
                  {["Đã đặt", "Đã xác nhận", "Đang giao", "Đã giao"].map((s, index) => (
                    <div key={s} className="relative text-center text-[10px] md:text-xs">
                      <div className={`h-1 mb-4 ${index <= step ? "bg-accent" : "bg-border"}`} />
                      {index <= step ? (
                        <Check className="size-4 mx-auto text-accent" />
                      ) : (
                        <Circle className="size-4 mx-auto text-muted-foreground" />
                      )}
                      <span className={`block mt-2 ${index <= step ? "text-foreground" : "text-muted-foreground"}`}>
                        {s}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <Dialog open={!!cancellingOrder} onOpenChange={open => !open && setCancellingOrder(null)}>
        <DialogContent className="max-w-md p-6">
          <div className="flex items-center gap-3 text-destructive mb-2">
            <AlertCircle className="size-5" />
            <DialogTitle className="text-lg">Xác nhận hủy đơn hàng</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            Bạn có chắc chắn muốn hủy đơn hàng #{cancellingOrder?.id}? Hệ thống sẽ tự động hoàn lại số lượng sản phẩm vào kho hàng và khôi phục mã giảm giá (nếu có).
          </DialogDescription>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setCancellingOrder(null)}
            >
              Giữ lại đơn
            </Button>
            <Button
              variant="destructive"
              disabled={isSubmitting}
              onClick={handleConfirmCancel}
            >
              {isSubmitting ? "Đang xử lý..." : "Xác nhận hủy đơn"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
