import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Minus, Plus, ShoppingBag, Truck, RotateCcw, ShieldCheck, Ruler, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money, useStore } from "@/lib/store";
import { useProducts } from "@/services/hooks";
import { productService, sortSizes } from "@/services";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/products/$productId")({
  ssr: false,
  loader: async ({ params }) => {
    const product = await productService.get(params.productId);
    if (!product) throw notFound();
    return product;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name || "Sản phẩm"} — MỘC` },
      { name: "description", content: loaderData?.description || "Khám phá sản phẩm thời trang MỘC." },
      { property: "og:title", content: `${loaderData?.name || "Sản phẩm"} — MỘC` },
      { property: "og:description", content: loaderData?.description || "Khám phá sản phẩm thời trang MỘC." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  const loaded = Route.useLoaderData();
  const product = useProducts().find(p => p.id === loaded.id) ?? loaded;
  const store = useStore();
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [error, setError] = useState("");
  const [descriptionOpen, setDescriptionOpen] = useState(true);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const gallery = product.images && product.images.length > 0 ? product.images : [product.image];
  const activeImage = gallery[imageIndex] || product.image;

  // Tìm biến thể theo màu & size đang chọn
  const selectedVariant = product.variants?.find(
    v => (v.color === color || (!color && v.color === "Mặc định")) && v.size === size,
  );

  const isOutOfStock = Boolean(selectedVariant && selectedVariant.stock <= 0);
  const isLowStock = Boolean(selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 3);
  const availableStock = selectedVariant ? selectedVariant.stock : product.stock;

  return (
    <div className="site-container pt-7 pb-16">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-7">
        <Link to="/" search={{ category: "" }} className="hover:text-foreground">
          Trang chủ
        </Link>
        <ChevronRight className="size-3" />
        <Link to="/" search={{ category: product.category }} className="hover:text-foreground">
          {product.category}
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground">{product.name}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-9 lg:gap-16">
        {/* Hình ảnh sản phẩm */}
        <div className="flex flex-col-reverse md:flex-row gap-3">
          <div className="flex md:flex-col gap-3">
            {gallery.map((imgUrl, i) => (
              <Button
                key={i}
                variant="ghost"
                className={`p-0 h-auto w-17 md:w-20 overflow-hidden rounded-none transition-all ${
                  imageIndex === i ? "ring-2 ring-foreground ring-offset-2" : "opacity-60 hover:opacity-100"
                }`}
                onClick={() => setImageIndex(i)}
                aria-label={`Xem ảnh ${i + 1}`}
              >
                <img
                  src={imgUrl}
                  alt={`${product.name} ảnh ${i + 1}`}
                  className="w-full aspect-[4/5] object-cover"
                />
              </Button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden bg-secondary">
            <img
              src={activeImage}
              alt={product.name}
              className="product-image w-full aspect-[4/5] object-cover"
            />
          </div>
        </div>

        {/* Thông tin & Tùy chọn mua hàng */}
        <div className="max-w-lg py-2">
          <p className="text-[11px] tracking-widest uppercase text-muted-foreground mb-4">
            MỘC / {product.category}
          </p>
          <h1 className="text-3xl md:text-4xl font-medium leading-tight">{product.name}</h1>
          <p className="text-2xl font-semibold mt-5 mb-8">{money(product.price)}</p>

          {/* Chọn Màu */}
          <div className="border-t py-6">
            <p className="text-xs font-semibold mb-4">
              MÀU SẮC{" "}
              <span className="font-normal text-muted-foreground ml-2">
                {color || "Vui lòng chọn màu"}
              </span>
            </p>
            <div className="flex gap-3">
              {product.colors.map(c => (
                <Button
                  key={c.name}
                  variant="ghost"
                  size="icon"
                  title={c.name}
                  aria-label={c.name}
                  onClick={() => setColor(c.name)}
                  className={`size-9 ${color === c.name ? "ring-1 ring-foreground" : ""}`}
                >
                  <span className={`swatch size-5 ${c.className}`} />
                </Button>
              ))}
            </div>
          </div>

          {/* Chọn Size & Nút Bảng Size */}
          <div className="border-t py-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold">
                KÍCH CỠ{" "}
                <span className="font-normal text-muted-foreground ml-2">
                  {size || "Vui lòng chọn size"}
                </span>
              </p>
              <button
                type="button"
                onClick={() => setSizeGuideOpen(true)}
                className="text-xs text-accent hover:underline flex items-center gap-1 font-medium"
              >
                <Ruler className="size-3.5" /> Bảng quy đổi kích cỡ
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {sortSizes(product.sizes).map(s => {
                const variantForSize = product.variants?.find(
                  v => (color ? v.color === color : true) && v.size === s,
                );
                const isVariantSoldOut = variantForSize ? variantForSize.stock <= 0 : false;

                return (
                  <Button
                    key={s}
                    variant={size === s ? "default" : "outline"}
                    className={`min-w-11 h-11 px-3 relative ${
                      isVariantSoldOut && size !== s
                        ? "opacity-50 text-muted-foreground border-dashed"
                        : ""
                    }`}
                    onClick={() => setSize(s)}
                  >
                    <span>{s}</span>
                    {isVariantSoldOut && (
                      <span className="absolute -top-1.5 -right-1 text-[8px] bg-muted px-1 rounded-sm border border-border text-muted-foreground font-normal">
                        Hết
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Chọn Số lượng */}
          <div className="border-t py-6">
            <p className="text-xs font-semibold mb-4">SỐ LƯỢNG</p>
            <div className="flex border border-border w-34 h-11">
              <Button
                variant="ghost"
                size="icon"
                className="h-full"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1 || isOutOfStock}
                aria-label="Giảm số lượng"
              >
                <Minus className="size-3" />
              </Button>
              <input
                aria-label="Số lượng"
                type="number"
                min="1"
                max={availableStock > 0 ? Math.min(99, availableStock) : 1}
                disabled={isOutOfStock}
                className="w-10 text-center outline-none text-sm [appearance:textfield]"
                value={isOutOfStock ? 0 : quantity}
                onChange={e =>
                  setQuantity(
                    Math.min(
                      availableStock > 0 ? availableStock : 1,
                      Math.max(1, Number(e.target.value) || 1),
                    ),
                  )
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-full"
                onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                disabled={quantity >= availableStock || isOutOfStock}
                aria-label="Tăng số lượng"
              >
                <Plus className="size-3" />
              </Button>
            </div>
          </div>

          {/* Trạng thái tồn kho Real-time */}
          {selectedVariant && (
            <div className="mb-5 text-xs">
              {isOutOfStock ? (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>Biến thể này hiện tạm hết hàng. Quý khách vui lòng chọn màu hoặc kích cỡ khác.</span>
                </div>
              ) : isLowStock ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center gap-2 font-medium">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                  <span>Chỉ còn {selectedVariant.stock} sản phẩm cuối cùng trong kho!</span>
                </div>
              ) : (
                <div className="text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-accent" />
                  <span>Còn hàng ({selectedVariant.stock} sản phẩm có sẵn)</span>
                </div>
              )}
            </div>
          )}

          {product.status !== "Đang bán" ? (
            <p className="text-sm text-destructive mb-3">Sản phẩm hiện đã ngừng bán.</p>
          ) : product.stock <= 0 ? (
            <p className="text-sm text-destructive mb-3">Toàn bộ phiên bản của sản phẩm này đã hết hàng.</p>
          ) : null}

          {error && <p className="text-destructive text-sm mb-3">{error}</p>}

          <Button
            className="w-full h-13 text-sm font-medium"
            disabled={product.status !== "Đang bán" || product.stock <= 0 || isOutOfStock}
            onClick={() => {
              if (!color || !size) {
                setError("Vui lòng chọn màu sắc và kích cỡ.");
                return;
              }
              if (isOutOfStock) {
                setError("Sản phẩm phiên bản này hiện đã hết hàng.");
                return;
              }
              setError("");
              store.add(product.id, color, size, quantity, selectedVariant?.id);
            }}
          >
            <ShoppingBag className="size-4" />
            {isOutOfStock ? "Tạm hết hàng" : "Thêm vào giỏ hàng"}
          </Button>

          <div className="grid grid-cols-3 gap-3 text-center text-[11px] text-muted-foreground mt-7">
            <span>
              <Truck className="mx-auto mb-2 size-5" />
              Giao hàng toàn quốc
            </span>
            <span>
              <RotateCcw className="mx-auto mb-2 size-5" />
              Đổi trả dễ dàng 15 ngày
            </span>
            <span>
              <ShieldCheck className="mx-auto mb-2 size-5" />
              Chất liệu tự nhiên 100%
            </span>
          </div>

          <div className="border-t mt-9">
            <Button
              variant="ghost"
              className="w-full justify-between px-0 h-14 font-semibold"
              onClick={() => setDescriptionOpen(!descriptionOpen)}
            >
              CHI TIẾT SẢN PHẨM {descriptionOpen ? <Minus /> : <Plus />}
            </Button>
            {descriptionOpen && (
              <p className="text-sm text-muted-foreground leading-7 pb-6">
                {product.description}
                <br />
                Hướng dẫn bảo quản: Giặt nhẹ với nước lạnh, tránh dùng chất tẩy mạnh và phơi nơi thoáng mát.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal Bảng Quy đổi Size */}
      <Dialog open={sizeGuideOpen} onOpenChange={setSizeGuideOpen}>
        <DialogContent className="max-w-xl p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-2">
            <Ruler className="size-5 text-accent" />
            <DialogTitle className="text-xl font-medium">Bảng quy đổi kích cỡ chuẩn</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Thông số kích cỡ tham khảo của MỘC. Form dáng thiết kế theo tỷ lệ người Việt Nam.
          </DialogDescription>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/60 text-foreground font-semibold">
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Chiều cao (cm)</th>
                  <th className="py-2.5 px-3">Cân nặng (kg)</th>
                  <th className="py-2.5 px-3">Vòng ngực (cm)</th>
                  <th className="py-2.5 px-3">Vòng eo (cm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr className="hover:bg-secondary/30">
                  <td className="py-2.5 px-3 font-semibold">S</td>
                  <td className="py-2.5 px-3">150 – 162</td>
                  <td className="py-2.5 px-3">42 – 50</td>
                  <td className="py-2.5 px-3">80 – 84</td>
                  <td className="py-2.5 px-3">62 – 66</td>
                </tr>
                <tr className="hover:bg-secondary/30">
                  <td className="py-2.5 px-3 font-semibold">M</td>
                  <td className="py-2.5 px-3">158 – 168</td>
                  <td className="py-2.5 px-3">50 – 58</td>
                  <td className="py-2.5 px-3">85 – 89</td>
                  <td className="py-2.5 px-3">67 – 72</td>
                </tr>
                <tr className="hover:bg-secondary/30">
                  <td className="py-2.5 px-3 font-semibold">L</td>
                  <td className="py-2.5 px-3">165 – 175</td>
                  <td className="py-2.5 px-3">58 – 66</td>
                  <td className="py-2.5 px-3">90 – 95</td>
                  <td className="py-2.5 px-3">73 – 77</td>
                </tr>
                <tr className="hover:bg-secondary/30">
                  <td className="py-2.5 px-3 font-semibold">XL</td>
                  <td className="py-2.5 px-3">170 – 182</td>
                  <td className="py-2.5 px-3">66 – 76</td>
                  <td className="py-2.5 px-3">96 – 102</td>
                  <td className="py-2.5 px-3">78 – 84</td>
                </tr>
                <tr className="hover:bg-secondary/30">
                  <td className="py-2.5 px-3 font-semibold">2XL</td>
                  <td className="py-2.5 px-3">175 – 188</td>
                  <td className="py-2.5 px-3">75 – 86</td>
                  <td className="py-2.5 px-3">103 – 110</td>
                  <td className="py-2.5 px-3">85 – 92</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-5 p-3.5 bg-secondary/50 border border-border/60 text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">💡 Lời khuyên từ stylist:</span> Nếu số đo của bạn nằm giữa 2 size hoặc bạn thích phong cách mặc thoải mái (relaxed fit), MỘC khuyên bạn nên chọn tăng lên 1 size.
          </div>

          <div className="flex justify-end mt-6">
            <Button variant="outline" size="sm" onClick={() => setSizeGuideOpen(false)}>
              Đã hiểu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
