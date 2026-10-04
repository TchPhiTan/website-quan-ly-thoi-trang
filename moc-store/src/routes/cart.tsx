import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Minus, Plus, Trash2, ShoppingBag, Tag, MapPin, CreditCard, TicketPercent, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { money, useStore } from "@/lib/store";
import { useProducts, usePromos, useAddresses } from "@/services/hooks";
import { promoService, orderService, profileService, discountOf, resolveCouponUuid } from "@/services";
import type { Promo } from "@/services/types";

type CartSearch = {
  coupon?: string;
};

export const Route = createFileRoute("/cart")({
  validateSearch: (search: Record<string, unknown>): CartSearch => ({
    coupon: typeof search.coupon === "string" ? search.coupon : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Giỏ hàng — MỘC" },
      { name: "description", content: "Xem và cập nhật giỏ hàng thời trang MỘC." },
      { property: "og:title", content: "Giỏ hàng — MỘC" },
      { property: "og:description", content: "Xem và cập nhật giỏ hàng thời trang MỘC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const store = useStore();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [code, setCode] = useState("");
  const [selectedPromo, setSelectedPromo] = useState<Promo | null>(null);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [bankingOrder, setBankingOrder] = useState<{ id: string; amount: number } | null>(null);
  const products = useProducts();
  const promos = usePromos();
  const { addresses } = useAddresses();

  // Shipping form state
  const [selectedAddressId, setSelectedAddressId] = useState<string>("custom");
  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingLine1, setShippingLine1] = useState("");
  const [shippingCity, setShippingCity] = useState("TP. Hồ Chí Minh");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "BANKING">("COD");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize shipping info from default address or user profile
  useEffect(() => {
    if (addresses.length > 0) {
      const def = addresses.find(a => a.is_default) || addresses[0];
      if (def) {
        setSelectedAddressId(def.id);
        setShippingName(def.full_name);
        setShippingPhone(def.phone);
        setShippingLine1([def.line1, def.ward].filter(Boolean).join(", "));
        setShippingCity(def.city);
        return;
      }
    }

    if (store.signedIn) {
      void profileService.get().then(profile => {
        if (profile.full_name && !shippingName) setShippingName(profile.full_name);
        if (profile.phone && !shippingPhone) setShippingPhone(profile.phone);
      }).catch(() => {});
    }
  }, [addresses, store.signedIn]);

  const handleAddressSelectChange = (addressId: string) => {
    setSelectedAddressId(addressId);
    if (addressId === "custom") {
      setShippingName("");
      setShippingPhone("");
      setShippingLine1("");
      setShippingCity("TP. Hồ Chí Minh");
      return;
    }
    const found = addresses.find(a => a.id === addressId);
    if (found) {
      setShippingName(found.full_name);
      setShippingPhone(found.phone);
      setShippingLine1([found.line1, found.ward].filter(Boolean).join(", "));
      setShippingCity(found.city);
    }
  };

  const subtotal = store.cart
    .filter(i => i.selected)
    .reduce((sum, i) => sum + (products.find(p => p.id === i.productId)?.price || 0) * i.quantity, 0);

  const activeVouchers = promos.filter(p => p.active);
  const promo = selectedPromo;
  const discount = promo && subtotal >= promo.minOrder ? discountOf(promo, subtotal) : 0;

  // Auto-apply pending voucher if coming from /promotions or URL
  useEffect(() => {
    const pendingCode = search.coupon || (typeof window !== "undefined" ? sessionStorage.getItem("pending_coupon") : null);
    if (pendingCode && subtotal > 0 && !selectedPromo) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("pending_coupon");
      }
      const clean = pendingCode.trim().toUpperCase();
      setCode(clean);
      void promoService.validate(clean, subtotal, store.signedIn).then(r => {
        if (r.ok) {
          setSelectedPromo(r.promo);
          setCode(r.promo.code);
          setError("");
          store.notify(
            r.promo.kind === "Miễn phí vận chuyển"
              ? `Đã tự động áp dụng miễn phí vận chuyển (${r.promo.code})`
              : `Đã tự động áp dụng mã ưu đãi ${r.promo.code}`,
          );
        }
      });
    }
  }, [search.coupon, subtotal, store.signedIn, selectedPromo]);

  const handleApplyCode = (codeToApply: string) => {
    const clean = codeToApply.trim().toUpperCase();
    if (!clean) {
      setError("Vui lòng nhập mã giảm giá.");
      return;
    }
    void promoService.validate(clean, subtotal, store.signedIn).then(r => {
      if (r.ok) {
        setSelectedPromo(r.promo);
        setCode(r.promo.code);
        setError("");
        store.notify(
          r.promo.kind === "Miễn phí vận chuyển"
            ? "Đã áp dụng miễn phí vận chuyển"
            : "Áp dụng mã giảm giá thành công",
        );
      } else {
        setError(r.message);
      }
    });
  };

  const handleApplyPromoObject = (p: Promo) => {
    if (subtotal < p.minOrder) {
      setError(`Đơn hàng cần từ ${money(p.minOrder)} để dùng mã này.`);
      return;
    }
    setSelectedPromo(p);
    setCode(p.code);
    setError("");
    store.notify(
      p.kind === "Miễn phí vận chuyển"
        ? "Đã áp dụng miễn phí vận chuyển"
        : `Áp dụng voucher ${p.code} thành công`,
    );
  };

  const checkout = async () => {
    const chosen = store.cart.filter(i => i.selected);
    if (!chosen.length) {
      setError("Vui lòng chọn ít nhất một sản phẩm để thanh toán.");
      return;
    }
    if (!store.signedIn) {
      store.notify("Vui lòng đăng nhập để tiến hành đặt hàng.");
      store.setAuthOpen(true);
      return;
    }

    const cleanPhone = shippingPhone.replace(/\s/g, "");
    if (!shippingName.trim()) {
      setError("Vui lòng nhập họ và tên người nhận.");
      return;
    }
    if (!/^0\d{9}$/.test(cleanPhone)) {
      setError("Số điện thoại không hợp lệ (cần 10 chữ số, bắt đầu bằng 0).");
      return;
    }
    if (!shippingLine1.trim()) {
      setError("Vui lòng nhập địa chỉ nhận hàng.");
      return;
    }
    if (!shippingCity.trim()) {
      setError("Vui lòng nhập Tỉnh / Thành phố.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const order = await orderService.checkout({
        payment_method: paymentMethod,
        shipping_full_name: shippingName.trim(),
        shipping_phone: cleanPhone,
        shipping_city: shippingCity.trim(),
        shipping_line1: shippingLine1.trim(),
        coupon_id: resolveCouponUuid(selectedPromo),
      });

      const createdOrderId = order.id;
      const finalAmount = Math.max(0, subtotal - discount);
      store.removeSelected();
      setSelectedPromo(null);
      setCode("");

      if (paymentMethod === "BANKING") {
        setBankingOrder({
          id: createdOrderId,
          amount: finalAmount,
        });
        store.notify(`Đã tạo đơn #${createdOrderId.slice(0, 8)}! Vui lòng quét mã QR thanh toán.`);
      } else {
        store.notify(`Đặt hàng thành công! Mã đơn: #${createdOrderId}`);
        void navigate({ to: "/account/orders" });
      }
    } catch (reason) {
      setError((reason as Error).message || "Có lỗi xảy ra khi tạo đơn hàng.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="site-container pt-12 pb-20">
      <p className="text-accent text-[11px] tracking-widest uppercase mb-3">ĐƠN HÀNG CỦA BẠN</p>
      <h1 className="editorial-title text-5xl md:text-6xl mb-10">Giỏ hàng</h1>

      {store.cart.length === 0 ? (
        <div className="py-20 border-t flex flex-col items-center text-center">
          <ShoppingBag className="size-14 stroke-1 text-muted-foreground mb-5" />
          <h2 className="text-xl">Giỏ hàng của bạn đang trống</h2>
          <p className="text-muted-foreground text-sm mt-2 mb-7">Hãy khám phá những món đồ yêu thích nhé.</p>
          <Link to="/" search={{ category: "" }}>
            <Button>
              Tiếp tục mua sắm <ArrowRight />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_420px] gap-12 items-start">
          {/* Cột trái: Danh sách sản phẩm */}
          <div>
            <div className="hidden md:grid grid-cols-[1fr_110px_90px_35px] gap-4 pb-4 border-b text-xs uppercase tracking-widest text-muted-foreground">
              <span>Sản phẩm</span>
              <span>Số lượng</span>
              <span>Thành tiền</span>
              <span />
            </div>

            {store.cart.map(i => {
              const p = products.find(product => product.id === i.productId);
              if (!p) return null;
              return (
                <div
                  key={i.key}
                  className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_110px_90px_35px] gap-4 items-center py-5 border-b"
                >
                  <div className="flex items-center gap-3 md:gap-5 min-w-0">
                    <input
                      type="checkbox"
                      checked={i.selected}
                      onChange={e => store.update(i.key, { selected: e.target.checked })}
                      aria-label={`Chọn ${p.name}`}
                      className="accent-accent size-4 shrink-0"
                    />
                    <Link to="/products/$productId" params={{ productId: p.id }}>
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-17 md:w-22 h-23 md:h-28 object-cover shrink-0"
                      />
                    </Link>
                    <div className="min-w-0">
                      <Link
                        to="/products/$productId"
                        params={{ productId: p.id }}
                        className="font-medium text-sm hover:underline"
                      >
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-2">
                        {i.color} / {i.size}
                      </p>
                      <Link
                        to="/products/$productId"
                        params={{ productId: p.id }}
                        className="text-xs text-accent mt-2 block"
                      >
                        Chỉnh màu / size
                      </Link>
                      <p className="text-sm mt-2 md:hidden">{money(p.price * i.quantity)}</p>
                    </div>
                  </div>

                  <div className="flex border border-border h-9 w-26">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-full w-8"
                      disabled={i.quantity <= 1}
                      onClick={() => store.update(i.key, { quantity: Math.max(1, i.quantity - 1) })}
                      aria-label="Giảm số lượng"
                    >
                      <Minus className="size-3" />
                    </Button>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      aria-label="Số lượng"
                      value={i.quantity}
                      onChange={e =>
                        store.update(i.key, {
                          quantity: Math.min(99, Math.max(1, Number(e.target.value) || 1)),
                        })
                      }
                      className="w-9 text-center text-xs outline-none [appearance:textfield]"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-full w-8"
                      onClick={() => store.update(i.key, { quantity: Math.min(99, i.quantity + 1) })}
                      aria-label="Tăng số lượng"
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>

                  <span className="hidden md:block text-sm font-medium">
                    {money(p.price * i.quantity)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden md:flex"
                    onClick={() => store.remove(i.key)}
                    aria-label="Xóa sản phẩm"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  <Button
                    variant="link"
                    className="md:hidden col-span-2 justify-self-end text-xs"
                    onClick={() => store.remove(i.key)}
                  >
                    Xóa sản phẩm
                  </Button>
                </div>
              );
            })}

            <Link
              to="/"
              search={{ category: "" }}
              className="inline-flex items-center gap-2 mt-7 text-sm hover:text-accent"
            >
              <ArrowLeft className="size-4" /> Tiếp tục mua sắm
            </Link>
          </div>

          {/* Cột phải: Thông tin giao hàng & Tóm tắt */}
          <aside className="bg-secondary p-6 sm:p-7 border border-border/60">
            <h2 className="text-lg font-semibold pb-4 border-b">Thông tin nhận hàng</h2>

            <div className="py-4 space-y-3.5">
              {addresses.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Chọn từ sổ địa chỉ đã lưu
                  </label>
                  <select
                    value={selectedAddressId}
                    onChange={e => handleAddressSelectChange(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-background border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {addresses.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.is_default ? "★ [Mặc định] " : ""}{a.full_name} — {a.line1}, {a.city}
                      </option>
                    ))}
                    <option value="custom">+ Nhập địa chỉ mới khác</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium">
                  Họ tên người nhận *
                  <Input
                    value={shippingName}
                    onChange={e => setShippingName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="mt-1 h-10 bg-background text-xs"
                  />
                </label>
                <label className="block text-xs font-medium">
                  Số điện thoại *
                  <Input
                    value={shippingPhone}
                    onChange={e => setShippingPhone(e.target.value)}
                    placeholder="0901234567"
                    className="mt-1 h-10 bg-background text-xs"
                  />
                </label>
              </div>

              <label className="block text-xs font-medium">
                Địa chỉ chi tiết (Số nhà, tên đường, phường/xã) *
                <Input
                  value={shippingLine1}
                  onChange={e => setShippingLine1(e.target.value)}
                  placeholder="Ví dụ: 125 Nguyễn Đình Chiểu, Phường Xuân Hòa"
                  className="mt-1 h-10 bg-background text-xs"
                />
              </label>

              <label className="block text-xs font-medium">
                Tỉnh / Thành phố *
                <Input
                  value={shippingCity}
                  onChange={e => setShippingCity(e.target.value)}
                  placeholder="Ví dụ: TP. Hồ Chí Minh"
                  className="mt-1 h-10 bg-background text-xs"
                />
              </label>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  Phương thức thanh toán
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("COD")}
                    className={`p-2.5 border text-left flex items-center gap-2 transition-all ${
                      paymentMethod === "COD"
                        ? "border-foreground bg-background font-semibold"
                        : "border-border bg-background/50 hover:bg-background"
                    }`}
                  >
                    <MapPin className="size-3.5 shrink-0 text-accent" />
                    <span>COD (Khi nhận)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("BANKING")}
                    className={`p-2.5 border text-left flex items-center gap-2 transition-all ${
                      paymentMethod === "BANKING"
                        ? "border-foreground bg-background font-semibold"
                        : "border-border bg-background/50 hover:bg-background"
                    }`}
                  >
                    <CreditCard className="size-3.5 shrink-0 text-accent" />
                    <span>Chuyển khoản</span>
                  </button>
                </div>
              </div>
            </div>



            {/* Mã giảm giá */}
            <div className="py-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Tag className="size-3.5 text-accent" />
                  Mã ưu đãi
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-xs text-accent hover:underline flex items-center gap-1 font-medium"
                  onClick={() => setVoucherModalOpen(true)}
                >
                  <TicketPercent className="size-3.5" />
                  Chọn voucher ({activeVouchers.length})
                </Button>
              </div>

              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={e => {
                    setCode(e.target.value);
                    setError("");
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplyCode(code);
                    }
                  }}
                  placeholder="Nhập mã giảm giá..."
                  className="bg-background h-10 text-xs font-mono uppercase"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 text-xs shrink-0"
                  onClick={() => handleApplyCode(code)}
                >
                  Áp dụng
                </Button>
              </div>

              {/* Hiển thị voucher đang áp dụng */}
              {selectedPromo && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-sm flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-emerald-950 dark:text-emerald-200">
                        {selectedPromo.code}: {selectedPromo.title}
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                        Tiết kiệm: -{money(discount)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setSelectedPromo(null);
                      setCode("");
                      setError("");
                      store.notify("Đã gỡ mã giảm giá");
                    }}
                  >
                    Gỡ bỏ
                  </Button>
                </div>
              )}
            </div>

            {/* Tổng cộng */}
            <div className="border-t pt-4 space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Tạm tính</span>
                <span>{money(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-accent text-xs">
                  <span>Giảm giá ({promo?.code})</span>
                  <span>-{money(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Phí vận chuyển</span>
                <span className="text-emerald-600 font-medium">Miễn phí toàn quốc</span>
              </div>
              <div className="flex justify-between border-t pt-3 font-semibold text-lg">
                <span>Tổng thanh toán</span>
                <span>{money(Math.max(0, subtotal - discount))}</span>
              </div>
            </div>

            {error && <p className="text-xs text-destructive mt-3">{error}</p>}

            <Button
              className="w-full mt-6 h-12 text-sm font-medium"
              disabled={subtotal === 0 || isSubmitting}
              onClick={checkout}
            >
              {isSubmitting ? "Đang xử lý đơn..." : "Xác nhận đặt hàng"} <ArrowRight className="size-4 ml-1" />
            </Button>
          </aside>
        </div>
      )}

      {/* Modal chọn Voucher MỘC */}
      <Dialog open={voucherModalOpen} onOpenChange={setVoucherModalOpen}>
        <DialogContent className="max-w-md p-6 max-h-[85vh] flex flex-col">
          <DialogTitle className="flex items-center gap-2 text-base font-medium">
            <TicketPercent className="size-5 text-accent" />
            Chọn Voucher MỘC
          </DialogTitle>
          <DialogDescription className="text-xs">
            Chọn mã ưu đãi khả dụng từ danh sách dưới đây để áp dụng trực tiếp vào đơn hàng.
          </DialogDescription>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-2">
            {activeVouchers.length === 0 ? (
              <p className="text-center py-8 text-xs text-muted-foreground">Hiện chưa có voucher nào khả dụng.</p>
            ) : (
              activeVouchers.map(v => {
                const isEligible = subtotal >= v.minOrder;
                const isCurrent = selectedPromo?.code === v.code;
                const missing = v.minOrder - subtotal;

                return (
                  <div
                    key={v.code}
                    className={cn(
                      "p-3.5 border rounded-sm transition-all flex flex-col justify-between gap-2.5",
                      isCurrent
                        ? "border-accent bg-accent/5 ring-1 ring-accent"
                        : isEligible
                        ? "border-border bg-card hover:border-accent/40"
                        : "border-border/60 bg-muted/30 opacity-75"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 bg-secondary text-foreground rounded-xs border border-border">
                            {v.code}
                          </span>
                          <span className="text-[11px] font-semibold text-accent uppercase">
                            {v.kind}
                          </span>
                        </div>
                        <p className="font-medium text-sm mt-1">{v.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {v.minOrder > 0 ? `Đơn tối thiểu: ${money(v.minOrder)}` : "Mọi giá trị đơn hàng"}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 text-xs text-accent font-semibold px-2 py-1 bg-accent/10 rounded-xs">
                            <Check className="size-3.5" /> Đang dùng
                          </span>
                        ) : isEligible ? (
                          <Button
                            size="sm"
                            className="h-8 text-xs px-3"
                            onClick={() => {
                              handleApplyPromoObject(v);
                              setVoucherModalOpen(false);
                            }}
                          >
                            Áp dụng
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground px-2 py-1 bg-muted rounded-xs block">
                            Chưa đủ ĐK
                          </span>
                        )}
                      </div>
                    </div>

                    {!isEligible && (
                      <div className="pt-2 border-t border-dashed border-border/70 flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-300">
                        <span>Mua thêm {money(missing)} để sử dụng</span>
                        <Link
                          to="/"
                          search={{ category: "" }}
                          onClick={() => setVoucherModalOpen(false)}
                          className="hover:underline font-medium inline-flex items-center gap-0.5"
                        >
                          Mua thêm <ArrowRight className="size-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal Thanh toán VietQR (Hỗ trợ Test / Sandbox) */}
      <Dialog open={!!bankingOrder} onOpenChange={open => !open && setBankingOrder(null)}>
        <DialogContent className="max-w-md p-6 flex flex-col items-center text-center">
          <div className="size-12 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-1">
            <CreditCard className="size-6" />
          </div>
          <DialogTitle className="text-xl font-medium">Thanh toán Chuyển khoản (VietQR)</DialogTitle>
          <DialogDescription className="text-xs">
            Đơn hàng #{bankingOrder?.id} đã được tạo thành công. Quét mã QR dưới đây để thanh toán.
          </DialogDescription>

          {bankingOrder && (
            <div className="w-full my-3 space-y-3">
              <div className="bg-white p-3 rounded-lg border border-border shadow-xs inline-block mx-auto">
                <img
                  src={`https://img.vietqr.io/image/MB-0901234567-compact2.png?amount=${bankingOrder.amount}&addInfo=MOC%20${bankingOrder.id.slice(0, 8)}&accountName=MOC%20FASHION`}
                  alt="Mã VietQR Chuyển khoản"
                  className="w-56 h-auto mx-auto object-contain"
                />
              </div>

              <div className="p-3 bg-secondary/60 rounded-sm text-left text-xs space-y-1.5 border border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ngân hàng:</span>
                  <span className="font-semibold">MB Bank (Quân Đội)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tài khoản:</span>
                  <span className="font-mono font-bold">0901234567</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chủ tài khoản:</span>
                  <span className="font-semibold uppercase">MOC FASHION</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tiền:</span>
                  <span className="font-bold text-accent text-sm">{money(bankingOrder.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nội dung:</span>
                  <span className="font-mono font-bold text-foreground">MOC {bankingOrder.id.slice(0, 8)}</span>
                </div>
              </div>

              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-sm text-[11px] text-left">
                💡 <strong>Chế độ Kiểm thử / Demo:</strong> Bạn có thể dùng app ngân hàng quét thử để kiểm tra thông tin số tiền & nội dung, hoặc bấm nút xác nhận bên dưới để mô phỏng hoàn tất mà không cần chuyển tiền thật.
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  className="w-full h-11 text-xs font-medium"
                  onClick={() => {
                    store.notify("Xác nhận thanh toán chuyển khoản thành công!");
                    setBankingOrder(null);
                    void navigate({ to: "/account/orders" });
                  }}
                >
                  Xác nhận đã chuyển khoản (Mô phỏng Test)
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-9 text-xs"
                  onClick={() => {
                    setBankingOrder(null);
                    void navigate({ to: "/account/orders" });
                  }}
                >
                  Để sau / Xem đơn hàng của tôi
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
