import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Tag, ChevronDown, Copy, Check, ShoppingBag, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money, useStore } from "@/lib/store";
import { usePromos } from "@/services/hooks";

export const Route = createFileRoute("/promotions")({
  head: () => ({
    meta: [
      { title: "Ưu đãi & Mã giảm giá — MỘC" },
      { name: "description", content: "Khám phá các chương trình khuyến mãi và mã giảm giá mới nhất tại MỘC." },
    ],
  }),
  component: PromotionsPage,
});

const fmt = (d: string) => {
  if (!d) return "";
  return d.split("-").reverse().join("/");
};

function PromotionsPage() {
  const store = useStore();
  const [open, setOpen] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const vouchers = usePromos().filter(p => p.active);

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    store.notify(`Đã sao chép mã ${code}`);
    setTimeout(() => {
      setCopied(prev => (prev === code ? null : prev));
    }, 2000);
  };

  return (
    <div className="site-container py-10 md:py-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
        <Link to="/" search={{ category: "" }} className="hover:text-foreground">
          Trang chủ
        </Link>
        <span>/</span>
        <span className="text-foreground">Ưu đãi</span>
      </div>

      {/* Hero Header */}
      <div className="max-w-2xl mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary text-accent text-xs font-semibold uppercase tracking-wider rounded-full mb-4">
          <Sparkles className="size-3.5" />
          Đặc quyền mua sắm
        </div>
        <h1 className="editorial-title text-4xl md:text-5xl mb-4 font-normal">
          Ưu đãi & Mã giảm giá
        </h1>
        <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
          Tận hưởng những ưu đãi đặc biệt từ MỘC. Thu thập mã voucher bên dưới và nhập tại trang giỏ hàng khi thanh toán.
        </p>
      </div>

      {/* Policy highlight cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <div className="p-5 border border-border bg-card rounded-sm flex items-start gap-4">
          <div className="size-10 rounded-full bg-secondary flex items-center justify-center shrink-0 text-accent font-semibold text-sm">
            01
          </div>
          <div>
            <h2 className="font-semibold text-sm mb-1">Freeship đơn từ 799k</h2>
            <p className="text-xs text-muted-foreground leading-5">Miễn phí giao hàng tiêu chuẩn toàn quốc cho đơn hàng đạt giá trị tối thiểu.</p>
          </div>
        </div>

        <div className="p-5 border border-border bg-card rounded-sm flex items-start gap-4">
          <div className="size-10 rounded-full bg-secondary flex items-center justify-center shrink-0 text-accent font-semibold text-sm">
            02
          </div>
          <div>
            <h2 className="font-semibold text-sm mb-1">Mã chào bạn mới</h2>
            <p className="text-xs text-muted-foreground leading-5">Sử dụng mã <strong>CHAOBAN</strong> để nhận ngay ưu đãi 30.000₫ cho mọi đơn hàng.</p>
          </div>
        </div>

        <div className="p-5 border border-border bg-card rounded-sm flex items-start gap-4">
          <div className="size-10 rounded-full bg-secondary flex items-center justify-center shrink-0 text-accent font-semibold text-sm">
            03
          </div>
          <div>
            <h2 className="font-semibold text-sm mb-1">Đổi trả linh hoạt</h2>
            <p className="text-xs text-muted-foreground leading-5">Hỗ trợ đổi size hoặc mẫu trong vòng 7 ngày nếu không vừa vặn.</p>
          </div>
        </div>
      </div>

      {/* Vouchers list */}
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-xl font-medium tracking-tight">Danh sách voucher khả dụng</h2>
        <span className="text-xs text-muted-foreground">{vouchers.length} mã đang hoạt động</span>
      </div>

      {vouchers.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-sm">
          <Tag className="size-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground mb-4">Hiện tại các mã ưu đãi đã được sử dụng hết hoặc đang cập nhật.</p>
          <Link to="/" search={{ category: "" }}>
            <Button variant="outline">Tiếp tục mua sắm</Button>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {vouchers.map(v => (
            <article
              key={v.code}
              className="border border-border bg-card flex min-h-48 rounded-sm overflow-hidden shadow-xs hover:border-accent/50 transition-colors"
            >
              <div className="bg-primary text-primary-foreground w-28 md:w-36 shrink-0 flex flex-col items-center justify-center text-center p-3 border-r border-dashed border-primary-foreground/20">
                <Tag className="size-7 text-accent mb-2" />
                <span className="text-[11px] font-semibold tracking-widest leading-tight">
                  MỘC<br />VOUCHER
                </span>
                <span className="mt-2 text-[10px] opacity-70">
                  {v.kind === "Giảm %" ? `${v.value}%` : money(v.value)}
                </span>
              </div>

              <div className="p-5 flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-lg leading-snug">{v.title}</p>
                    <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-secondary text-accent rounded-xs shrink-0">
                      {v.kind}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {v.minOrder > 0 ? `Đơn tối thiểu: ${money(v.minOrder)}` : "Áp dụng cho mọi giá trị đơn hàng"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Hạn sử dụng: {fmt(v.expires)}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                  <Button
                    variant="link"
                    className="p-0 text-xs text-muted-foreground hover:text-foreground h-auto flex items-center gap-1"
                    onClick={() => setOpen(open === v.code ? "" : v.code)}
                  >
                    Điều kiện <ChevronDown className={`size-3 transition-transform ${open === v.code ? "rotate-180" : ""}`} />
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={copied === v.code ? "secondary" : "outline"}
                      size="sm"
                      className="font-mono text-xs tracking-wider"
                      onClick={() => handleCopy(v.code)}
                    >
                      {copied === v.code ? (
                        <>
                          <Check className="size-3.5 text-accent mr-1" />
                          Đã chép
                        </>
                      ) : (
                        <>
                          <Copy className="size-3 mr-1" />
                          {v.code}
                        </>
                      )}
                    </Button>

                    <Link to="/" search={{ category: "" }}>
                      <Button size="sm" variant="default" className="text-xs">
                        Dùng ngay
                      </Button>
                    </Link>
                  </div>
                </div>

                {open === v.code && (
                  <div className="text-xs leading-5 text-muted-foreground mt-3 pt-3 border-t border-border/60 bg-secondary/30 -mx-5 -mb-5 p-4">
                    <p>
                      • Mã code: <span className="font-mono font-medium text-foreground">{v.code}</span>
                    </p>
                    <p>• Giá trị giảm: {v.kind === "Giảm %" ? `${v.value}%` : money(v.value)}</p>
                    <p>• Áp dụng cho đơn hàng từ: {money(v.minOrder)}</p>
                    <p>• Hạn sử dụng: đến hết ngày {fmt(v.expires)}.</p>
                    <p>• Nhập mã tại bước xem Giỏ hàng hoặc Thanh toán để áp dụng giảm trừ.</p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="mt-16 p-8 border border-border bg-secondary/50 rounded-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-1">Bạn đã chọn được sản phẩm ưng ý?</h2>
          <p className="text-xs text-muted-foreground">Khám phá các bộ sưu tập mới nhất từ MỘC và áp dụng mã giảm giá ngay hôm nay.</p>
        </div>
        <Link to="/" search={{ category: "" }}>
          <Button className="shrink-0 flex items-center gap-2">
            <ShoppingBag className="size-4" />
            Khám phá sản phẩm
            <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
