import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Minus, Plus, Trash2, ShoppingBag, Tag, MapPin, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money, useStore } from "@/lib/store";
import { useProducts, usePromos, useAddresses } from "@/services/hooks";
import { promoService, orderService, profileService, discountOf } from "@/services";
import type { Promo } from "@/services/types";

export const Route = createFileRoute("/cart")({
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
  const [code, setCode] = useState("");
  const [selectedPromo, setSelectedPromo] = useState<Promo | null>(null);
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

  const promo = selectedPromo;
  const discount = promo && subtotal >= promo.minOrder ? discountOf(promo, subtotal) : 0;
  const quick = promos.find(p => p.active && subtotal >= p.minOrder);

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
        coupon_id: selectedPromo?.id || null,
      });

      store.removeSelected();
      setSelectedPromo(null);
      setCode("");
      store.notify(`Đặt hàng thành công! Mã đơn: #${order.id}`);
      void navigate({ to: "/account/orders" });
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
              <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Mã ưu đãi</p>
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={e => {
                    setCode(e.target.value);
                    setSelectedPromo(null);
                    setError("");
                  }}
                  placeholder="Nhập mã giảm giá..."
                  className="bg-background h-10 text-xs"
                />
                <Button
                  variant="outline"
                  className="h-10 text-xs"
                  onClick={() => {
                    void promoService.validate(code, subtotal, store.signedIn).then(r => {
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
                        setSelectedPromo(null);
                        setError(r.message);
                      }
                    });
                  }}
                >
                  Áp dụng
                </Button>
              </div>

              {quick && (
                <Button
                  variant="ghost"
                  className="text-accent px-0 text-xs justify-start h-auto py-1"
                  onClick={() => {
                    setCode(quick.code);
                    setSelectedPromo(quick);
                    store.notify(`Đã áp dụng voucher ${quick.code}`);
                  }}
                >
                  <Tag className="size-3.5 mr-1" /> Gợi ý: {quick.code} ({quick.title})
                </Button>
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
                <span>{promo?.kind === "Miễn phí vận chuyển" ? "Miễn phí" : "Tính khi giao"}</span>
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
    </div>
  );
}
