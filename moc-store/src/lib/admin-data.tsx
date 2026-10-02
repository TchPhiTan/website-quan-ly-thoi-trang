import { createContext, useContext, useState, type ReactNode } from "react";

export { LOW_STOCK } from "@/lib/admin-helpers";
export { stockState, withinDays, downloadCsv } from "@/lib/admin-helpers";
export type { Product as AProduct, Order as AOrder, OrderStatus, ProductStatus, Promo, PromoKind, Review, User as AUser, Line, Session, StockLog } from "@/services/types";

// Chỉ giữ trạng thái giao diện quản trị (đăng nhập, thông báo). Dữ liệu nằm ở src/services.
type Admin = { signedIn: boolean; signIn: () => void; signOut: () => void; toast: string; notify: (m: string) => void; run: (p: Promise<unknown>, okMessage: string) => Promise<boolean> };
const Ctx = createContext<Admin | null>(null);
export function AdminProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [toast, setToast] = useState("");
  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };
  const run = async (p: Promise<unknown>, okMessage: string) => { try { await p; notify(okMessage); return true; } catch (e) { console.error(e); notify("Có lỗi xảy ra, vui lòng thử lại"); return false; } };
  return <Ctx.Provider value={{ signedIn, signIn: () => { setSignedIn(true); notify("Đăng nhập quản trị thành công"); }, signOut: () => setSignedIn(false), toast, notify, run }}>{children}</Ctx.Provider>;
}
export function useAdmin() { const c = useContext(Ctx); if (!c) throw new Error("AdminProvider missing"); return c; }
