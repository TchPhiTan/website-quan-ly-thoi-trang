import type { Order, Product, Promo, Review, Session, StockLog, User } from "./types";

export type Db = { products: Product[]; orders: Order[]; promos: Promo[]; reviews: Review[]; users: User[]; sessions: Session[]; stockLog: StockLog[] };
const KEY = "moc-db-v2";

const p = (id: string, name: string, category: string, price: number, image: string, colors: [string, string][], sizes: string[], description: string, stock: number, createdAt: string, label?: string): Product =>
  ({ id, name, category, price, image, colors: colors.map(([n, c]) => ({ name: n, className: c })), sizes, description, stock, status: "Đang bán", createdAt, ...(label ? { label } : {}) });
const products: Product[] = [
  p("ao-so-mi-ella", "Áo sơ mi cotton Ella", "Áo nữ", 489000, "white-shirt", [["Trắng", "swatch-ivory"], ["Đen", "swatch-dark"], ["Xám", "swatch-gray"]], ["S", "M", "L"], "Thiết kế dáng rộng thanh lịch từ chất cotton thoáng mát. Dễ dàng kết hợp cùng quần âu hoặc denim cho mọi ngày.", 42, "2026-08-12", "BÁN CHẠY"),
  p("blazer-noah", "Áo blazer dáng rộng Noah", "Áo nam", 1290000, "blazer", [["Than chì", "swatch-dark"], ["Xám", "swatch-gray"]], ["M", "L", "XL"], "Phom dáng hiện đại với phần vai mềm và chất vải đứng dáng. Một lựa chọn linh hoạt từ công sở đến cuối tuần.", 8, "2026-09-22", "MỚI"),
  p("dam-midi-lina", "Đầm midi Lina", "Đầm nữ", 790000, "dress", [["Xanh sage", "swatch-sage"], ["Đen", "swatch-dark"]], ["S", "M", "L"], "Đầm midi tối giản với đường cắt tinh tế, chất liệu nhẹ nhàng và phom dáng tôn vẻ tự nhiên.", 25, "2026-09-25", "MỚI"),
  p("quan-jeans-ryan", "Quần jeans ống rộng Ryan", "Quần nam", 690000, "denim", [["Đen wash", "swatch-denim"], ["Xanh đậm", "swatch-blue"]], ["28", "29", "30", "31", "32"], "Chất denim bền đẹp, phom ống rộng thoải mái và dễ phối cùng mọi chiếc áo trong tủ đồ.", 3, "2026-07-30"),
  p("ao-thun-ryan", "Áo thun cotton Ryan", "Áo nam", 350000, "denim", [["Trắng kem", "swatch-ivory"], ["Đen", "swatch-dark"]], ["S", "M", "L", "XL"], "Chiếc áo thun cơ bản với chất cotton dày dặn, bề mặt mềm mịn và kiểu dáng thoải mái.", 60, "2026-09-05"),
  p("quan-au-ella", "Quần âu suông Ella", "Quần nữ", 650000, "white-shirt", [["Xám", "swatch-gray"], ["Đen", "swatch-dark"]], ["S", "M", "L"], "Quần âu ống suông với cạp cao và chất vải rủ vừa phải, tạo cảm giác thoải mái suốt ngày dài.", 20, "2026-09-01"),
  p("dam-midi-lina-den", "Set Fina dáng dài", "Đầm nữ", 790000, "fina-set", [["Trắng kem", "swatch-ivory"]], ["S", "M", "L"], "Thiết kế đầm midi thanh lịch, phù hợp cho những dịp đặc biệt hoặc những ngày muốn mặc đẹp giản đơn.", 5, "2026-09-27"),
  p("blazer-noah-xam", "Quần Noah dáng rộng", "Quần nam", 1290000, "noah-trouser", [["Xám", "swatch-gray"], ["Than chì", "swatch-dark"]], ["M", "L", "XL"], "Quần Noah dáng rộng với phom suông thoải mái, sắc xám trung tính dễ phối cho phong cách hiện đại.", 12, "2026-08-30"),
];

const o = (id: string, customer: string, phone: string, address: string, date: string, items: string, lines: [string, number][], total: number, status: Order["status"]): Order =>
  ({ id, customer, phone, address, date, items, lines: lines.map(([productId, quantity]) => ({ productId, quantity })), total, status });
const orders: Order[] = [
  o("MOC26090201", "Trần Văn Bình", "0912345678", "45 Lê Lợi, Bến Nghé, TP. HCM", "2026-09-02", "Áo thun cotton Ryan x2", [["ao-thun-ryan", 2]], 700000, "Đã duyệt"),
  o("MOC26090701", "Lê Thu Hà", "0987654321", "28 Tràng Tiền, Hoàn Kiếm, Hà Nội", "2026-09-07", "Đầm midi Lina x1", [["dam-midi-lina", 1]], 790000, "Đã duyệt"),
  o("MOC26091001", "Phạm Quốc Huy", "0935111222", "12 Trần Phú, Hải Châu, Đà Nẵng", "2026-09-10", "Áo blazer dáng rộng Noah x1", [["blazer-noah", 1]], 1290000, "Đã hủy"),
  o("MOC26091401", "Nguyễn Thị Minh Anh", "0901234567", "125 Nguyễn Đình Chiểu, Xuân Hòa, TP. HCM", "2026-09-14", "Quần âu suông Ella x1, Áo sơ mi cotton Ella x1", [["quan-au-ella", 1], ["ao-so-mi-ella", 1]], 1139000, "Đã duyệt"),
  o("MOC26091801", "Nguyễn Thị Minh Anh", "0901234567", "125 Nguyễn Đình Chiểu, Xuân Hòa, TP. HCM", "2026-09-18", "Áo sơ mi cotton Ella x1", [["ao-so-mi-ella", 1]], 489000, "Đã duyệt"),
  o("MOC26092201", "Võ Hoàng Nam", "0977888999", "9 Nguyễn Huệ, Bến Nghé, TP. HCM", "2026-09-22", "Quần jeans ống rộng Ryan x2", [["quan-jeans-ryan", 2]], 1380000, "Đã duyệt"),
  o("MOC26092601", "Đặng Mai Linh", "0966333444", "77 Điện Biên Phủ, Bình Thạnh, TP. HCM", "2026-09-26", "Set Fina dáng dài x1", [["dam-midi-lina-den", 1]], 790000, "Chờ duyệt"),
  o("MOC26092801", "Bùi Anh Tuấn", "0944555666", "3 Phan Chu Trinh, Hoàn Kiếm, Hà Nội", "2026-09-28", "Quần Noah dáng rộng x1, Áo thun cotton Ryan x1", [["blazer-noah-xam", 1], ["ao-thun-ryan", 1]], 1640000, "Chờ duyệt"),
  o("MOC26092901", "Hoàng Yến Nhi", "0922777888", "56 Hai Bà Trưng, Quận 1, TP. HCM", "2026-09-29", "Áo sơ mi cotton Ella x2", [["ao-so-mi-ella", 2]], 978000, "Chờ duyệt"),
];

const SEED: Db = {
  products, orders,
  promos: [
    { id: "p1", code: "MOC100", title: "Giảm 100.000₫", kind: "Giảm tiền", value: 100000, minOrder: 799000, expires: "2026-11-30", active: true },
    { id: "p2", code: "FREESHIP", title: "Miễn phí vận chuyển", kind: "Miễn phí vận chuyển", value: 35000, minOrder: 499000, expires: "2026-12-31", active: true },
    { id: "p3", code: "MOI50", title: "Giảm 50.000₫ cho đơn đầu tiên", kind: "Giảm tiền", value: 50000, minOrder: 399000, expires: "2026-10-31", active: true },
  ],
  reviews: [
    { id: "r1", productName: "Đầm midi Lina", customer: "Lê Thu Hà", rating: 5, text: "Chất vải nhẹ, mặc rất thoải mái, đúng size như mô tả.", date: "2026-09-20", reply: "" },
    { id: "r2", productName: "Áo sơ mi cotton Ella", customer: "Nguyễn Thị Minh Anh", rating: 4, text: "Áo đẹp, hơi nhăn khi giặt máy. Sẽ mua thêm màu khác.", date: "2026-09-24", reply: "Cảm ơn bạn! MỘC khuyên nên giặt nhẹ và là ở nhiệt độ thấp nhé." },
    { id: "r3", productName: "Quần jeans ống rộng Ryan", customer: "Võ Hoàng Nam", rating: 3, text: "Phom đẹp nhưng dài hơn mình nghĩ, phải sửa lai.", date: "2026-09-27", reply: "" },
  ],
  users: [
    { id: "u1", name: "Nguyễn Thị Minh Anh", email: "minhanh.nguyen@example.com", phone: "0901234567", role: "Khách hàng", active: true, createdAt: "2026-06-15" },
    { id: "u2", name: "Trần Văn Bình", email: "binh.tran@example.com", phone: "0912345678", role: "Khách hàng", active: true, createdAt: "2026-08-02" },
    { id: "u3", name: "Phạm Thị Lan", email: "lan.pham@moc.vn", phone: "0933222111", role: "Nhân viên", active: true, createdAt: "2026-05-10" },
    { id: "u4", name: "Đỗ Minh Khang", email: "khang.do@moc.vn", phone: "0944333222", role: "Nhân viên", active: false, createdAt: "2026-03-01" },
  ],
  sessions: [],
  stockLog: [
    { id: 1, productId: "blazer-noah", date: "2026-09-22", delta: 20, note: "Nhập hàng đợt 3" },
    { id: 2, productId: "blazer-noah", date: "2026-09-25", delta: -12, note: "Bán online" },
    { id: 3, productId: "quan-jeans-ryan", date: "2026-09-20", delta: -7, note: "Bán online" },
  ],
};

// "Cơ sở dữ liệu giả": lưu ở localStorage nên trang khách và trang quản trị (cùng origin, kể cả nhiều tab) dùng chung dữ liệu.
// Khi có backend thật, chỉ cần sửa các service, không cần đụng tới file này.
let cache: Db | null = null;
const listeners = new Set<() => void>();
let bound = false;
const load = (): Db => {
  if (cache) return cache;
  try { const raw = localStorage.getItem(KEY); cache = raw ? { ...SEED, ...(JSON.parse(raw) as Partial<Db>) } : SEED; } catch { cache = SEED; }
  return cache;
};
export const getSeed = (): Db => SEED;
export const getDb = (): Db => (typeof window === "undefined" ? SEED : load());
export function writeDb(fn: (d: Db) => Db) {
  cache = fn(getDb());
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) { console.error("Không lưu được dữ liệu mẫu (localStorage đầy?)", e); }
  listeners.forEach(l => l());
}
export function resetDb() { cache = SEED; try { localStorage.removeItem(KEY); } catch { /* bỏ qua */ } listeners.forEach(l => l()); }
export function subscribe(cb: () => void) {
  listeners.add(cb);
  if (typeof window !== "undefined" && !bound) { bound = true; window.addEventListener("storage", e => { if (e.key === KEY || e.key === null) { cache = null; listeners.forEach(l => l()); } }); }
  return () => { listeners.delete(cb); };
}
