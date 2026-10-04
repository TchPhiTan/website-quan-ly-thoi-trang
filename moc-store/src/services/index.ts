import { getDb, writeDb } from "./mock-db";
import { imageKey, imageSrc, swatchFor } from "./images";
import { request } from "./http";
import type { Order, OrderLine, OrderStatus, Product, ProductStatus, ProductVariant, Promo, Review, ReviewableItem, Session, StockLog, User } from "./types";

// Mọi hàm đều async để khi nối API chỉ cần thay thân hàm bằng request(...) trong ./http, giao diện không phải sửa.
const today = () => new Date().toISOString().slice(0, 10);
const upsert = <T extends { id: string }>(list: T[], item: T): T[] => (list.some(x => x.id === item.id) ? list.map(x => (x.id === item.id ? item : x)) : [item, ...list]);
type ApiVariant = { id: string; color?: string | null; size: string; stock: number; images?: string; colors?: { name: string } | null };
type ApiProduct = { id: string; title: string; description?: string | null; price: number | string; discount?: number | string; category_id?: string | null; thumbnail?: string | null; status: string; created_at: string; slug: string; categories?: { title: string } | null; product_variants?: ApiVariant[] };
type ApiCategory = { id: string; title: string };
type ApiInventoryVariant = { id: string; product_id: string; stock: number; size?: string | null; color?: string | null; products?: { id?: string; title?: string | null; thumbnail?: string | null; slug?: string | null } | null; colors?: { name?: string | null } | null };
type ApiInventoryMovement = { id: string; product_id: string; variant_id: string; delta: number; reason: string; note?: string | null; created_at: string; products?: { title?: string | null } | null; product_variants?: { size?: string | null; color?: string | null } | null };
type ApiUser = { id: string; full_name?: string | null; email?: string | null; phone?: string | null; status: string; created_at: string; roles?: { name?: string | null } | null };
type ApiReview = { id: string; order_item_id: string; rating: number; content?: string | null; created_at: string; users?: { full_name?: string | null } | null; order_items?: { id?: string; products?: { title?: string | null; slug?: string | null; thumbnail?: string | null } | null } | null; review_replies?: { content?: string | null; created_at?: string }[] };
type ApiCompletedOrder = { order_items?: { id: string; product_id: string; products?: { title?: string | null; slug?: string | null; thumbnail?: string | null } | null }[] };
const parseImages = (value?: string): string[] => { try { const images = JSON.parse(value || "[]"); return Array.isArray(images) ? images.filter((x): x is string => typeof x === "string") : []; } catch { return []; } };
const imageUrl = (value?: string | null) => {
  if (!value) return "";
  const resolved = imageSrc(value);
  if (typeof window !== "undefined" && resolved.startsWith("http://localhost:8080/")) {
    return resolved.replace("http://localhost:8080", window.location.protocol + "//" + window.location.host.replace(/:\d+$/, ":8080"));
  }
  return resolved;
};

const SIZE_ORDER: Record<string, number> = {
  "XXS": 1,
  "XS": 2,
  "S": 3,
  "M": 4,
  "L": 5,
  "XL": 6,
  "XXL": 7,
  "2XL": 8,
  "3XL": 9,
  "4XL": 10,
  "5XL": 11,
  "FREESIZE": 99,
  "FS": 99,
  "ONE SIZE": 99,
};

export const sortSizes = (sizes: string[]): string[] => {
  return [...sizes].sort((a, b) => {
    const cleanA = a.trim().toUpperCase();
    const cleanB = b.trim().toUpperCase();

    const orderA = SIZE_ORDER[cleanA];
    const orderB = SIZE_ORDER[cleanB];
    if (orderA !== undefined && orderB !== undefined) {
      return orderA - orderB;
    }
    if (orderA !== undefined) return -1;
    if (orderB !== undefined) return 1;

    const numA = Number(cleanA);
    const numB = Number(cleanB);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }

    return cleanA.localeCompare(cleanB);
  });
};

const fromApiProduct = (raw: ApiProduct): Product => {
  const variants = raw.product_variants ?? [];
  const colors = [...new Map(variants.map(v => { const name = v.color || v.colors?.name || "Mặc định"; return [name, swatchFor(name)]; })).values()];
  const sizes = sortSizes([...new Set(variants.map(v => v.size).filter(Boolean))]);
  const productVariants: ProductVariant[] = variants.map(v => ({ id: v.id, size: v.size, color: v.color || v.colors?.name || "Mặc định", stock: Number(v.stock || 0) }));
  const variantImages = variants.flatMap(v => parseImages(v.images));
  const rawList = [...new Set([raw.thumbnail, ...variantImages].filter(Boolean) as string[])];
  const images = rawList.map(imageUrl);
  const mainImage = images[0] || imageUrl(raw.thumbnail) || "";
  return { id: raw.slug, apiId: raw.id, categoryId: raw.category_id || undefined, discount: Number(raw.discount || 0), name: raw.title, category: raw.categories?.title || "Sản phẩm", price: Number(raw.price), image: mainImage, images: images.length > 0 ? images : [mainImage], colors, sizes, variants: productVariants, description: raw.description || "", stock: variants.reduce((total, v) => total + Number(v.stock || 0), 0), status: raw.status === "active" ? "Đang bán" : "Ngừng bán", createdAt: raw.created_at };
};

export const productService = {
  async list(): Promise<Product[]> { const response = await request<{ data: ApiProduct[] }>("GET", "/public/products?limit=100"); return response.data.map(fromApiProduct); },
  async listAdmin(): Promise<Product[]> { const response = await request<{ data: ApiProduct[] }>("GET", "/admin/products?limit=100"); return response.data.map(fromApiProduct); },
  async get(id: string): Promise<Product | undefined> { try { const response = await request<{ data: ApiProduct }>("GET", `/public/products/${encodeURIComponent(id)}`); return fromApiProduct(response.data); } catch (error) { if ((error as Error).message.includes("404")) return undefined; throw error; } },
  async save(p: Product, authenticatedAdmin = false): Promise<void> {
    const body = { title: p.name, description: p.description, price: p.price, discount: p.discount || 0, category_id: p.categoryId, size: JSON.stringify(p.sizes), thumbnail: p.image, status: p.status === "Đang bán" ? "active" : "inactive", slug: p.id };
    if (authenticatedAdmin || p.apiId) { if (!body.category_id) throw new Error("Sản phẩm cần có danh mục hợp lệ"); await request(p.apiId ? "PUT" : "POST", p.apiId ? `/admin/products/${encodeURIComponent(p.apiId)}` : "/admin/products", body); return; }
    const stored = { ...p, image: imageKey(p.image) }; writeDb(d => ({ ...d, products: upsert(d.products, stored) }));
  },
  async setStatus(ids: string[], status: ProductStatus, authenticatedAdmin = false, knownProducts: Product[] = []): Promise<void> {
    const apiIds = ids.map(id => knownProducts.find(p => p.id === id)?.apiId || getDb().products.find(p => p.id === id)?.apiId).filter((id): id is string => Boolean(id));
    if (authenticatedAdmin || apiIds.length) { await Promise.all(apiIds.map(apiId => request("PATCH", `/admin/products/${encodeURIComponent(apiId)}`, { status: status === "Đang bán" ? "active" : "inactive" }))); return; }
    writeDb(d => ({ ...d, products: d.products.map(p => (ids.includes(p.id) ? { ...p, status } : p)) }));
  },
  async remove(p: Product, authenticatedAdmin = false): Promise<void> {
    if (authenticatedAdmin || p.apiId) { if (!p.apiId) throw new Error("Sản phẩm chưa có mã backend"); await request("DELETE", `/admin/products/${encodeURIComponent(p.apiId)}`); return; }
    writeDb(d => ({ ...d, products: d.products.filter(item => item.id !== p.id) }));
  },
  async setStock(id: string, qty: number, note: string): Promise<void> {
    writeDb(d => { const old = d.products.find(p => p.id === id)?.stock ?? 0; return { ...d, products: d.products.map(p => (p.id === id ? { ...p, stock: qty } : p)), stockLog: [{ id: Date.now() + Math.random(), productId: id, date: today(), delta: qty - old, note }, ...d.stockLog] }; });
  },
};

const inventoryProduct = (variant: ApiInventoryVariant): Product => ({
  id: variant.product_id,
  apiId: variant.product_id,
  name: variant.products?.title || variant.product_id,
  category: "Sản phẩm",
  price: 0,
  image: imageUrl(variant.products?.thumbnail),
  colors: [],
  sizes: variant.size ? [variant.size] : [],
  variants: [{ id: variant.id, size: variant.size || "Mặc định", color: variant.color || variant.colors?.name || "Mặc định", stock: Number(variant.stock || 0) }],
  description: "",
  stock: Number(variant.stock || 0),
  status: "Đang bán",
  createdAt: "",
});

const mergeInventoryProducts = (variants: ApiInventoryVariant[]): Product[] => {
  const grouped = new Map<string, Product>();
  for (const variant of variants) {
    const current = grouped.get(variant.product_id);
    if (!current) { grouped.set(variant.product_id, inventoryProduct(variant)); continue; }
    current.variants = [...(current.variants || []), ...(inventoryProduct(variant).variants || [])];
    current.sizes = [...new Set([...(current.sizes || []), ...(variant.size ? [variant.size] : [])])];
    current.stock += Number(variant.stock || 0);
  }
  return [...grouped.values()];
};

export const inventoryService = {
  async list(): Promise<Product[]> {
    const response = await request<{ data: ApiInventoryVariant[] }>("GET", "/staff/inventory?limit=1000");
    return mergeInventoryProducts(response.data);
  },
  async movements(): Promise<StockLog[]> {
    const response = await request<{ data: ApiInventoryMovement[] }>("GET", "/staff/inventory/movements?limit=1000");
    return response.data.map(movement => ({ id: new Date(movement.created_at).getTime(), productId: movement.product_id, date: movement.created_at.slice(0, 10), delta: Number(movement.delta), note: movement.note || movement.reason }));
  },
  async restock(product: Product, quantity: number, note: string): Promise<void> {
    const variants = product.variants || [];
    if (!variants.length || !variants[0]) { await productService.setStock(product.id, quantity, note); return; }
    const delta = quantity - product.stock;
    if (delta < 0) throw new Error("Backend chỉ hỗ trợ nhập thêm tồn kho, không hỗ trợ giảm tồn trực tiếp");
    if (delta === 0) return;
    await request("POST", "/staff/inventory/restock", { variant_id: variants[0].id, quantity: delta, note });
  },
};

export const categoryService = {
  async listAdmin(): Promise<ApiCategory[]> { const response = await request<{ data: ApiCategory[] }>("GET", "/admin/categories"); return response.data; },
};

export type ReportOverview = { total_orders: number; total_users: number; total_products: number; month_revenue: number; month_orders: number; pending_orders: number; low_stock_variants: number };
export type RevenueReport = { month: number; revenue: number; orders: number };
export type TopProductReport = { id: string; title: string; thumbnail?: string | null; slug: string; sold_count: number; rating_avg: number | string; rating_count: number; price: number | string };
export const reportService = {
  async overview(): Promise<ReportOverview> {
    const response = await request<{ data: ReportOverview }>("GET", "/admin/reports/overview");
    return response.data;
  },
  async revenue(year: number): Promise<{ data: RevenueReport[]; year: number }> {
    return request<{ data: RevenueReport[]; year: number }>("GET", `/admin/reports/revenue?year=${year}`);
  },
  async topProducts(limit = 10): Promise<TopProductReport[]> {
    const response = await request<{ data: TopProductReport[] }>("GET", `/admin/reports/top-products?limit=${limit}`);
    return response.data;
  },
};

export const sessionService = {
  async save(s: Session): Promise<void> { writeDb(d => ({ ...d, sessions: upsert(d.sessions, s) })); },
  async remove(id: string): Promise<void> { writeDb(d => ({ ...d, sessions: d.sessions.filter(s => s.id !== id) })); },
};

export type AuthUser = { id: string; email: string; full_name: string; role: string; avatar?: string | null };
export const authService = {
  async register(input: { email: string; password: string; full_name: string; phone: string }): Promise<void> {
    await request<{ message: string }>("POST", "/auth/register", input);
  },
  async login(input: { email: string; password: string }): Promise<AuthUser> {
    const response = await request<{ user: AuthUser }>("POST", "/auth/login", input);
    return response.user;
  },
  async logout(): Promise<void> { await request<{ message: string }>("POST", "/auth/logout"); },
  async me(): Promise<AuthUser> {
    const response = await request<{ authenticated: boolean; user: AuthUser }>("GET", "/auth/me");
    return response.user;
  },
};

export type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  gender?: string | null;
  dob?: string | null;
  avatar?: string | null;
  created_at?: string;
};

export const profileService = {
  async get(): Promise<UserProfile> {
    const response = await request<{ data: UserProfile }>("GET", "/user/profile");
    return response.data;
  },
  async update(input: { full_name?: string; phone?: string; dob?: string }): Promise<void> {
    await request("PUT", "/user/profile", input);
  },
  async changePassword(input: { old_password: string; new_password: string }): Promise<void> {
    await request("PUT", "/user/profile/password", input);
  },
};

export type UserAddress = {
  id: string;
  token_user?: string;
  full_name: string;
  phone: string;
  city: string;
  district?: string | null;
  ward?: string | null;
  line1: string;
  is_default: boolean;
  created_at?: string;
};

export const addressService = {
  async list(): Promise<UserAddress[]> {
    const response = await request<{ data: UserAddress[] }>("GET", "/user/addresses");
    return response.data;
  },
  async create(input: { full_name: string; phone: string; city: string; district?: string; ward?: string; line1: string; is_default?: boolean }): Promise<void> {
    await request("POST", "/user/addresses", input);
  },
  async update(id: string, input: { full_name?: string; phone?: string; city?: string; district?: string; ward?: string; line1?: string; is_default?: boolean }): Promise<void> {
    await request("PUT", `/user/addresses/${encodeURIComponent(id)}`, input);
  },
  async remove(id: string): Promise<void> {
    await request("DELETE", `/user/addresses/${encodeURIComponent(id)}`);
  },
};

type ApiCartItem = { id: string; product_id: string; variant_id: string; size?: string | null; color?: string | null; quantity: number; price_unit: number | string; products?: { slug?: string | null } | null };
type ApiCart = { cart_items?: ApiCartItem[] };
export type CartApiItem = { id: string; productId: string; variantId: string; color: string; size: string; quantity: number; priceUnit: number };
const fromApiCartItem = (item: ApiCartItem): CartApiItem => ({ id: item.id, productId: item.products?.slug || item.product_id, variantId: item.variant_id, color: item.color || "Mặc định", size: item.size || "Mặc định", quantity: Number(item.quantity), priceUnit: Number(item.price_unit) });
export const cartService = {
  async list(): Promise<CartApiItem[]> { const response = await request<{ data: ApiCart }>("GET", "/user/cart"); return (response.data.cart_items || []).map(fromApiCartItem); },
  async add(input: { productId: string; variantId: string; size: string; color: string; quantity: number; priceUnit: number }): Promise<void> { await request("POST", "/user/cart/items", { product_id: input.productId, variant_id: input.variantId, size: input.size, color: input.color, quantity: input.quantity, price_unit: input.priceUnit }); },
  async update(id: string, quantity: number): Promise<void> { await request("PUT", `/user/cart/items/${encodeURIComponent(id)}`, { quantity }); },
  async remove(id: string): Promise<void> { await request("DELETE", `/user/cart/items/${encodeURIComponent(id)}`); },
};

type ApiOrderItem = { product_id: string; quantity: number; price: number | string; size?: string | null; color?: string | null; products?: { title?: string | null; slug?: string | null; thumbnail?: string | null } | null };
type ApiOrder = { id: string; created_at: string; status: string; subtotal: number | string; discount_total: number | string; shipping_fee: number | string; shipping_full_name: string; shipping_phone: string; shipping_city: string; shipping_line1: string; order_items?: ApiOrderItem[] };
const orderStatusMap: Record<string, OrderStatus> = { pending: "Chờ duyệt", processing: "Đã duyệt", shipping: "Đang giao", completed: "Hoàn tất", cancelled: "Đã hủy", returned: "Đã trả hàng" };
const orderStatus = (status: string): OrderStatus => orderStatusMap[status] || "Chờ duyệt";
const apiOrderStatus: Record<OrderStatus, string> = { "Chờ duyệt": "pending", "Đã duyệt": "processing", "Đang giao": "shipping", "Hoàn tất": "completed", "Đã hủy": "cancelled", "Đã trả hàng": "returned" };
const fromApiOrder = (raw: ApiOrder): Order => {
  const lines = raw.order_items || [];
  const address = [raw.shipping_line1, raw.shipping_city].filter(Boolean).join(", ");
  return {
    id: raw.id,
    customer: raw.shipping_full_name,
    phone: raw.shipping_phone,
    address,
    date: raw.created_at.slice(0, 10),
    items: lines.map(item => `${item.products?.title || item.product_id} (${item.color || "Mặc định"}/${item.size || "Mặc định"}) x${item.quantity}`).join(", "),
    lines: lines.map(item => ({ productId: item.products?.slug || item.product_id, quantity: Number(item.quantity) })),
    total: Number(raw.subtotal) - Number(raw.discount_total) + Number(raw.shipping_fee),
    status: orderStatus(raw.status),
  };
};

export const orderService = {
  async checkout(input: { payment_method: string; shipping_full_name: string; shipping_phone: string; shipping_city: string; shipping_line1: string; coupon_id: string | null }): Promise<{ id: string }> {
    const response = await request<{ order_id: string }>("POST", "/user/checkout", input);
    return { id: response.order_id };
  },
  async list(admin = false): Promise<Order[]> { const response = await request<{ data: ApiOrder[] }>("GET", admin ? "/staff/orders?limit=1000" : "/user/orders"); return response.data.map(fromApiOrder); },
  async cancel(id: string): Promise<void> { await request("POST", `/user/orders/${encodeURIComponent(id)}/cancel`); },
  async setStatus(id: string, status: OrderStatus): Promise<void> { await request("PATCH", `/staff/orders/${encodeURIComponent(id)}/status`, { status: apiOrderStatus[status] }); },
};

export const discountOf = (promo: Promo, subtotal: number) => promo.kind === "Giảm tiền" ? Math.min(promo.value, subtotal) : promo.kind === "Giảm %" ? Math.floor((subtotal * promo.value) / 100) : 0;
type ApiCoupon = { coupon_id: string; code?: string; title?: string; type?: string; discount_value?: number | string; min_order_value?: number | string; end_date?: string; status?: string };
const fromApiCoupon = (coupon: ApiCoupon): Promo => ({
  id: coupon.coupon_id,
  code: coupon.code || "",
  title: coupon.title || coupon.code || "Mã giảm giá",
  kind: coupon.type === "PERCENT" ? "Giảm %" : coupon.type === "FREESHIP" ? "Miễn phí vận chuyển" : "Giảm tiền",
  value: Number(coupon.discount_value || 0),
  minOrder: Number(coupon.min_order_value || 0),
  expires: coupon.end_date ? coupon.end_date.slice(0, 10) : "9999-12-31",
  active: coupon.status ? coupon.status === "ACTIVE" : true,
});
export const promoService = {
  async listAdmin(): Promise<Promo[]> {
    const response = await request<{ data: ApiCoupon[] }>("GET", "/admin/coupons?limit=100");
    return response.data.map(fromApiCoupon);
  },
  async save(p: Promo, existing = false): Promise<void> {
    if (existing) {
      await request("PATCH", `/admin/coupons/${encodeURIComponent(p.id)}`, { title: p.title, status: p.active ? "ACTIVE" : "INACTIVE", end_date: p.expires });
      return;
    }
    await request("POST", "/admin/coupons", {
      code: p.code,
      title: p.title,
      type: p.kind === "Giảm %" ? "PERCENT" : p.kind === "Miễn phí vận chuyển" ? "FREESHIP" : "AMOUNT",
      discount_value: p.value,
      start_date: today(),
      end_date: p.expires,
      usage_limit: null,
      min_order_value: p.minOrder,
      max_discount: null,
      status: p.active ? "ACTIVE" : "INACTIVE",
    });
  },
  async setActive(id: string, active: boolean): Promise<void> {
    await request("PATCH", `/admin/coupons/${encodeURIComponent(id)}`, { status: active ? "ACTIVE" : "INACTIVE" });
  },
  async validate(code: string, subtotal: number, authenticated = false): Promise<{ ok: true; promo: Promo } | { ok: false; message: string }> {
    if (authenticated) {
      try {
        const response = await request<{ coupon: ApiCoupon }>("POST", "/user/cart/coupon", { code: code.trim().toUpperCase() });
        return { ok: true, promo: fromApiCoupon(response.coupon) };
      } catch (error) {
        return { ok: false, message: (error as Error).message };
      }
    }
    const promo = getDb().promos.find(p => p.code === code.trim().toUpperCase());
    if (!promo || !promo.active) return { ok: false, message: "Mã giảm giá không hợp lệ hoặc đã ngừng hoạt động." };
    if (promo.expires < today()) return { ok: false, message: "Mã giảm giá đã hết hạn." };
    if (subtotal < promo.minOrder) return { ok: false, message: `Đơn hàng cần từ ${new Intl.NumberFormat("vi-VN").format(promo.minOrder)}₫ để dùng mã này.` };
    return { ok: true, promo };
  },
};

export const reviewService = {
  async list(authenticated = false, admin = false): Promise<Review[]> {
    if (authenticated) {
      const response = await request<{ data: ApiReview[] }>("GET", admin ? "/staff/reviews" : "/user/reviews");
      return response.data.map(fromApiReview);
    }
    return getDb().reviews;
  },
  async reply(id: string, reply: string, authenticated = false): Promise<void> {
    if (authenticated) { await request("POST", `/staff/reviews/${encodeURIComponent(id)}/reply`, { content: reply }); return; }
    writeDb(d => ({ ...d, reviews: d.reviews.map(r => (r.id === id ? { ...r, reply } : r)) }));
  },
  async create(input: { orderItemId?: string | undefined; productName: string; customer: string; rating: number; text: string }, authenticated = false): Promise<void> {
    if (authenticated) {
      if (!input.orderItemId) throw new Error("Không xác định được sản phẩm trong đơn hàng");
      await request("POST", "/user/reviews", { order_item_id: input.orderItemId, rating: input.rating, content: input.text });
      return;
    }
    const r: Review = { ...input, id: `r${Date.now()}`, date: today(), reply: "" }; writeDb(d => ({ ...d, reviews: [r, ...d.reviews] }));
  },
  async reviewableItems(authenticated = false): Promise<ReviewableItem[]> {
    if (!authenticated) {
      const reviews = getDb().reviews;
      return getDb().products.filter(product => ["dam-midi-lina", "ao-so-mi-ella"].includes(product.id)).map(product => ({ id: product.id, productId: product.id, productName: product.name, image: product.image, review: reviews.find(review => review.productName === product.name) }));
    }
    const [ordersResponse, reviews] = await Promise.all([
      request<{ data: ApiCompletedOrder[] }>("GET", "/user/orders?status=completed&limit=1000"),
      this.list(true),
    ]);
    return ordersResponse.data.flatMap(order => (order.order_items || []).map(item => ({
      id: item.id,
      productId: item.products?.slug || item.product_id,
      productName: item.products?.title || item.product_id,
      image: imageUrl(item.products?.thumbnail),
      review: reviews.find(review => review.orderItemId === item.id),
    })));
  },
};

const fromApiReview = (raw: ApiReview): Review => {
  const replies = raw.review_replies || [];
  const latestReply = [...replies].sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || ""))).at(-1);
  return {
    id: raw.id,
    orderItemId: raw.order_item_id,
    productName: raw.order_items?.products?.title || "Sản phẩm",
    customer: raw.users?.full_name || "Khách hàng",
    rating: Number(raw.rating),
    text: raw.content || "",
    date: raw.created_at.slice(0, 10),
    reply: latestReply?.content || "",
  };
};

export const userService = {
  async list(): Promise<User[]> {
    const response = await request<{ data: ApiUser[] }>("GET", "/admin/users?limit=1000");
    return response.data.map(user => ({
      id: user.id,
      name: user.full_name || "Chưa cập nhật",
      email: user.email || "",
      phone: user.phone || "",
      role: user.roles?.name === "user" ? "Khách hàng" : "Nhân viên",
      active: user.status === "active",
      createdAt: user.created_at.slice(0, 10),
    }));
  },
  async save(_u: User): Promise<void> {
    throw new Error("Backend chưa hỗ trợ tạo hoặc chỉnh sửa thông tin người dùng");
  },
  async setActive(id: string, active: boolean): Promise<void> {
    await request("PATCH", `/admin/users/${encodeURIComponent(id)}/status`, { status: active ? "active" : "inactive" });
  },
  async setRole(id: string, role: User["role"]): Promise<void> {
    await request("PATCH", `/admin/users/${encodeURIComponent(id)}/role`, { role_name: role === "Khách hàng" ? "user" : "staff" });
  },
  async registerCustomer(input: { name: string; phone: string; contact: string }): Promise<void> {
    const u: User = { id: `u${Date.now()}`, name: input.name, email: input.contact.includes("@") ? input.contact : "", phone: input.phone || (input.contact.includes("@") ? "" : input.contact), role: "Khách hàng", active: true, createdAt: today() };
    writeDb(d => ({ ...d, users: [u, ...d.users] }));
  },
};
