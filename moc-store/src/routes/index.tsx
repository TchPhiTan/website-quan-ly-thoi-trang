import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ArrowRight, ArrowUpRight, Plus, Heart, X, SlidersHorizontal, ArrowUpDown, RotateCcw, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money, useStore, type Product } from "@/lib/store";
import { useProducts } from "@/services/hooks";
import { sortSizes } from "@/services";
import hero from "@/assets/look-white-shirt.jpg";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => (typeof search["category"] === "string" ? { category: search["category"] as string } : { category: undefined as string | undefined }),
  head: () => ({ meta: [{ title: "MỘC — Thời trang tối giản cho mỗi ngày" }, { name: "description", content: "Khám phá áo, quần, đầm thiết kế tối giản cho nam và nữ tại MỘC." }, { property: "og:title", content: "MỘC — Thời trang tối giản cho mỗi ngày" }, { property: "og:description", content: "Khám phá bộ sưu tập trang phục tinh tế dành cho mỗi ngày." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Home,
});
const categories = ["Tất cả", "Nữ", "Nam", "Đầm nữ", "Áo nữ", "Quần nữ", "Áo nam", "Quần nam"];
const matchCategory = (prodCategory: string, activeCategory: string) => {
  if (!activeCategory || activeCategory === "Tất cả") return true;
  if (activeCategory === "Nữ") {
    const c = prodCategory.toLowerCase();
    return c.includes("nữ") || c.includes("đầm");
  }
  if (activeCategory === "Nam") {
    const c = prodCategory.toLowerCase();
    return c.includes("nam");
  }
  return prodCategory.toLowerCase() === activeCategory.toLowerCase();
};
function ProductCard({ product }: { product: Product }) {
  const store = useStore(); const [color, setColor] = useState(""); const [size, setSize] = useState(""); const [showQuick, setShowQuick] = useState(false);
  return <article className="group min-w-0"><div className="relative overflow-hidden bg-secondary"><Link to="/products/$productId" params={{ productId: product.id }} aria-label={`Xem ${product.name}`}><img className="product-image transition-transform duration-500 group-hover:scale-[1.035]" src={product.image} alt={product.name} width={800} height={1000} loading="lazy"/></Link>{product.label && <span className="absolute left-3 top-3 bg-background text-foreground px-2 py-1 text-[9px] font-semibold tracking-widest">{product.label}</span>}<Button variant="ghost" size="icon" className="absolute right-2 top-2 bg-background/90 hover:bg-background" onClick={() => store.notify("Đã lưu vào danh sách yêu thích (bản xem trước)")} aria-label="Yêu thích"><Heart className="size-4"/></Button><Button variant="secondary" className="absolute bottom-3 left-3 right-3 hidden md:flex opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all" onClick={() => setShowQuick(!showQuick)}>{showQuick ? "Đóng lựa chọn" : "Chọn màu & kích cỡ"} <Plus className="size-4"/></Button></div><div className="pt-4"><p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{product.category}</p><Link to="/products/$productId" params={{ productId: product.id }} className="text-sm font-medium hover:text-accent line-clamp-1">{product.name}</Link><p className="text-sm font-semibold mt-1.5">{money(product.price)}</p><Button variant="link" className="md:hidden p-0 mt-1 text-xs" onClick={() => setShowQuick(!showQuick)}>Chọn màu & kích cỡ</Button>{showQuick && <div className="border-t mt-3 pt-3 space-y-3"><div className="flex items-center gap-3">{product.colors.map(c => <Button key={c.name} title={c.name} aria-label={c.name} variant="ghost" size="icon" className={`size-7 p-1 ${color === c.name ? "ring-1 ring-foreground" : ""}`} onClick={() => { setColor(c.name); setSize(""); }}><span className={`swatch ${c.className}`}/></Button>)}<span className="text-xs text-muted-foreground">{color || "Chọn màu"}</span></div>{color && <div className="flex gap-2">{sortSizes(product.sizes).map(s => <Button key={s} variant={size === s ? "default" : "outline"} size="sm" className="size-8 p-0" onClick={() => setSize(s)}>{s}</Button>)}</div>}{size && <Button className="w-full" onClick={() => { store.add(product.id, color, size, 1); setShowQuick(false); }}>Thêm vào giỏ <ArrowRight/></Button>}</div>}</div></article>;
}

const sortOptions = [
  { id: "default", label: "Mới nhất" },
  { id: "price-asc", label: "Giá: Thấp → Cao" },
  { id: "price-desc", label: "Giá: Cao → Thấp" },
  { id: "name-asc", label: "Tên: A → Z" },
] as const;

function Home() {
  const { category } = Route.useSearch();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc" | "name-asc">("default");
  const [sortOpen, setSortOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<"all" | "under-500" | "500-1000" | "over-1000">("all");

  const active = category && categories.includes(category) ? category : "Tất cả";
  const allProducts = useProducts();

  const filtered = allProducts
    .filter(p => {
      if (p.status !== "Đang bán") return false;
      if (!matchCategory(p.category, active)) return false;
      if (search && !p.name.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))) return false;
      if (priceRange === "under-500" && p.price >= 500000) return false;
      if (priceRange === "500-1000" && (p.price < 500000 || p.price > 1000000)) return false;
      if (priceRange === "over-1000" && p.price <= 1000000) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "name-asc") return a.name.localeCompare(b.name, "vi");
      return 0;
    });

  const hasActiveFilters = priceRange !== "all" || sortBy !== "default" || Boolean(search);
  const resetFilters = () => {
    setPriceRange("all");
    setSortBy("default");
    setSearch("");
  };

  return (
    <>
      <section className="site-container pt-5">
        <div className="relative min-h-[520px] md:min-h-[600px] overflow-hidden bg-secondary">
          <img
            src={hero}
            alt="Bộ trang phục áo sơ mi trắng và quần suông thanh lịch"
            className="absolute inset-0 w-full h-full object-cover object-[70%_38%] md:object-[center_43%]"
            width={800}
            height={1000}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/35 to-transparent" />
          <div className="relative z-10 min-h-[520px] md:min-h-[600px] flex flex-col justify-center items-start px-8 md:px-18 text-primary-foreground max-w-2xl">
            <p className="text-[11px] md:text-xs uppercase tracking-[.25em] mb-6">BỘ SƯU TẬP THU / ĐÔNG 2026</p>
            <h1 className="editorial-title text-[64px] sm:text-[80px] md:text-[110px]">
              Thời trang<br /><em>tối giản.</em>
            </h1>
            <p className="mt-7 text-sm md:text-base leading-7 max-w-sm text-primary-foreground/85">
              Những thiết kế tinh giản để bạn tự tin là chính mình, mỗi ngày.
            </p>
            <a
              href="#san-pham"
              className="mt-9 inline-flex items-center gap-3 bg-background text-foreground px-6 py-4 text-xs font-semibold uppercase tracking-widest hover:bg-secondary transition-colors"
            >
              Khám phá bộ sưu tập <ArrowUpRight className="size-4" />
            </a>
          </div>
          <span className="absolute bottom-6 right-7 text-primary-foreground text-[10px] tracking-widest hidden md:block">
            MỘC / TRANG PHỤC MỖI NGÀY
          </span>
        </div>
      </section>

      <section id="san-pham" className="site-container pt-15 md:pt-22">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-7 mb-8">
          <div>
            <p className="text-accent uppercase text-[11px] tracking-[.2em] font-semibold mb-3">CHỌN ĐIỀU BẠN YÊU</p>
            <h2 className="editorial-title text-5xl md:text-6xl">Dành cho bạn</h2>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm sản phẩm..."
              aria-label="Tìm kiếm sản phẩm"
              className="w-full bg-transparent border-b border-border pl-7 pr-7 py-3 text-sm outline-none focus:border-accent"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 size-7"
                onClick={() => setSearch("")}
                aria-label="Xóa tìm kiếm"
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Danh mục */}
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-4 border-b mb-5 scrollbar-none">
          {categories.map(c => (
            <Link
              key={c}
              to="/"
              search={{ category: c === "Tất cả" ? "" : c }}
              className={`whitespace-nowrap px-4 py-2 text-xs font-medium transition-colors ${
                active === c ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-border"
              }`}
            >
              {c}
            </Link>
          ))}
        </div>

        {/* Bộ lọc khoảng giá & Sắp xếp */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-8 border-b border-border/60 text-xs">
          {/* Mức giá */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1 font-medium hidden sm:inline-block">
              Mức giá:
            </span>
            {[
              { id: "all", label: "Tất cả" },
              { id: "under-500", label: "Dưới 500k" },
              { id: "500-1000", label: "500k – 1tr" },
              { id: "over-1000", label: "Trên 1tr" },
            ].map(tier => (
              <button
                key={tier.id}
                type="button"
                onClick={() => setPriceRange(tier.id as typeof priceRange)}
                className={`px-3 py-1.5 text-[11px] uppercase tracking-wider transition-all duration-200 border ${
                  priceRange === tier.id
                    ? "bg-foreground text-background border-foreground font-semibold shadow-sm"
                    : "border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground bg-background"
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>

          {/* Sắp xếp & Đặt lại */}
          <div className="flex items-center gap-3 relative">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1 hover:underline underline-offset-4 mr-1 transition-colors"
              >
                <RotateCcw className="size-3" /> Đặt lại
              </button>
            )}

            {/* Custom dropdown sắp xếp */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-2 px-3.5 py-1.5 border border-border/80 hover:border-foreground bg-background text-[11px] uppercase tracking-wider font-medium transition-all"
                aria-expanded={sortOpen}
                aria-haspopup="listbox"
              >
                <span className="text-muted-foreground font-normal">Sắp xếp:</span>
                <span className="font-semibold text-foreground">
                  {sortOptions.find(o => o.id === sortBy)?.label || "Mới nhất"}
                </span>
                <ChevronDown className={`size-3 text-muted-foreground transition-transform duration-200 ${sortOpen ? "rotate-180" : ""}`} />
              </button>

              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-background border border-border shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                    {sortOptions.map(option => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setSortBy(option.id);
                          setSortOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                          sortBy === option.id
                            ? "bg-secondary font-medium text-foreground"
                            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                        }`}
                      >
                        <span>{option.label}</span>
                        {sortBy === option.id && <Check className="size-3.5 text-accent" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground mb-5">
          <span>{filtered.length} sản phẩm</span>
          <span>Được chọn lọc dành cho bạn</span>
        </div>

        {filtered.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6">
            {filtered.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <Search className="size-8 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">Không tìm thấy sản phẩm phù hợp.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Hãy thử một từ khóa, khoảng giá hoặc danh mục khác.
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" className="mt-4" onClick={resetFilters}>
                Xóa tất cả bộ lọc
              </Button>
            )}
          </div>
        )}
      </section>

      <section className="site-container mt-20">
        <div className="sale-panel min-h-56 py-12 px-7 md:px-16 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <p className="text-accent text-[11px] tracking-widest uppercase mb-3">ĐẶC QUYỀN DÀNH CHO BẠN</p>
            <h2 className="editorial-title text-5xl md:text-6xl">
              Một chút ưu đãi,<br /><em>thêm nhiều niềm vui.</em>
            </h2>
          </div>
          <Link
            to="/account/vouchers"
            className="inline-flex items-center gap-3 text-xs uppercase tracking-widest border-b border-primary-foreground pb-2 self-start md:self-end"
          >
            Khám phá voucher <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
