import { getDb, writeDb } from "./mock-db";
import { imageKey, imageSrc } from "./images";
import type { Order, OrderLine, OrderStatus, Product, ProductStatus, Promo, Review, Session, User } from "./types";

// Mọi hàm đều async để khi nối API chỉ cần thay thân hàm bằng request(...) trong ./http, giao diện không phải sửa.
const today = () => new Date().toISOString().slice(0, 10);
const upsert = <T extends { id: string }>(list: T[], item: T): T[] => (list.some(x => x.id === item.id) ? list.map(x => (x.id === item.id ? item : x)) : [item, ...list]);

export const productService = {
  async list(): Promise<Product[]> { return getDb().products.map(p => ({ ...p, image: imageSrc(p.image) })); },
  async get(id: string): Promise<Product | undefined> { const p = getDb().products.find(x => x.id === id); return p ? { ...p, image: imageSrc(p.image) } : undefined; },
  async save(p: Product): Promise<void> { const stored = { ...p, image: imageKey(p.image) }; writeDb(d => ({ ...d, products: upsert(d.products, stored) })); },
  async setStatus(ids: string[], status: ProductStatus): Promise<void> { writeDb(d => ({ ...d, products: d.products.map(p => (ids.includes(p.id) ? { ...p, status } : p)) })); },
  async setStock(id: string, qty: number, note: string): Promise<void> {
    writeDb(d => { const old = d.products.find(p => p.id === id)?.stock ?? 0; return { ...d, products: d.products.map(p => (p.id === id ? { ...p, stock: qty } : p)), stockLog: [{ id: Date.now() + Math.random(), productId: id, date: today(), delta: qty - old, note }, ...d.stockLog] }; });
  },
};

export const sessionService = {
  async save(s: Session): Promise<void> { writeDb(d => ({ ...d, sessions: upsert(d.sessions, s) })); },
  async remove(id: string): Promise<void> { writeDb(d => ({ ...d, sessions: d.sessions.filter(s => s.id !== id) })); },
};

export const orderService = {
  async list(): Promise<Order[]> { return getDb().orders; },
  async setStatus(id: string, status: OrderStatus): Promise<void> { writeDb(d => ({ ...d, orders: d.orders.map(o => (o.id === id ? { ...o, status } : o)) })); },
  async create(input: { customer: string; phone: string; address: string; items: string; lines: OrderLine[]; total: number }): Promise<Order> {
    const date = today(); const seq = getDb().orders.filter(o => o.date === date).length + 1;
    const order: Order = { ...input, id: `MOC${date.replace(/-/g, "").slice(2)}${String(seq).padStart(2, "0")}`, date, status: "Chờ duyệt" };
    writeDb(d => ({ ...d, orders: [order, ...d.orders] })); return order;
  },
};

export const discountOf = (promo: Promo, subtotal: number) => promo.kind === "Giảm tiền" ? Math.min(promo.value, subtotal) : promo.kind === "Giảm %" ? Math.floor((subtotal * promo.value) / 100) : 0;
export const promoService = {
  async save(p: Promo): Promise<void> { writeDb(d => ({ ...d, promos: upsert(d.promos, p) })); },
  async setActive(id: string, active: boolean): Promise<void> { writeDb(d => ({ ...d, promos: d.promos.map(p => (p.id === id ? { ...p, active } : p)) })); },
  async validate(code: string, subtotal: number): Promise<{ ok: true; promo: Promo } | { ok: false; message: string }> {
    const promo = getDb().promos.find(p => p.code === code.trim().toUpperCase());
    if (!promo || !promo.active) return { ok: false, message: "Mã giảm giá không hợp lệ hoặc đã ngừng hoạt động." };
    if (promo.expires < today()) return { ok: false, message: "Mã giảm giá đã hết hạn." };
    if (subtotal < promo.minOrder) return { ok: false, message: `Đơn hàng cần từ ${new Intl.NumberFormat("vi-VN").format(promo.minOrder)}₫ để dùng mã này.` };
    return { ok: true, promo };
  },
};

export const reviewService = {
  async reply(id: string, reply: string): Promise<void> { writeDb(d => ({ ...d, reviews: d.reviews.map(r => (r.id === id ? { ...r, reply } : r)) })); },
  async create(input: { productName: string; customer: string; rating: number; text: string }): Promise<void> {
    const r: Review = { ...input, id: `r${Date.now()}`, date: today(), reply: "" }; writeDb(d => ({ ...d, reviews: [r, ...d.reviews] }));
  },
};

export const userService = {
  async save(u: User): Promise<void> { writeDb(d => ({ ...d, users: upsert(d.users, u) })); },
  async setActive(id: string, active: boolean): Promise<void> { writeDb(d => ({ ...d, users: d.users.map(u => (u.id === id ? { ...u, active } : u)) })); },
  async registerCustomer(input: { name: string; phone: string; contact: string }): Promise<void> {
    const u: User = { id: `u${Date.now()}`, name: input.name, email: input.contact.includes("@") ? input.contact : "", phone: input.phone || (input.contact.includes("@") ? "" : input.contact), role: "Khách hàng", active: true, createdAt: today() };
    writeDb(d => ({ ...d, users: [u, ...d.users] }));
  },
};
