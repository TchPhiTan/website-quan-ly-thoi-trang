import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authService, type AuthUser } from "@/services";

export { LOW_STOCK } from "@/lib/admin-helpers";
export { stockState, withinDays, downloadCsv } from "@/lib/admin-helpers";
export type { Product as AProduct, Order as AOrder, OrderStatus, ProductStatus, Promo, PromoKind, Review, User as AUser, Line, Session, StockLog } from "@/services/types";

// Chỉ giữ trạng thái giao diện quản trị (đăng nhập, thông báo). Dữ liệu nằm ở src/services.
type Admin = { signedIn: boolean; initializing: boolean; user: AuthUser | null; signIn: (user: AuthUser) => void; signOut: () => Promise<void>; toast: string; notify: (m: string) => void; run: (p: Promise<unknown>, okMessage: string) => Promise<boolean> };
const Ctx = createContext<Admin | null>(null);
export function AdminProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [toast, setToast] = useState("");
  useEffect(() => {
    void authService.me().then(currentUser => {
      if (currentUser.role === "admin" || currentUser.role === "staff") { setUser(currentUser); setSignedIn(true); }
    }).catch(() => {}).finally(() => setInitializing(false));
  }, []);
  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };
  const run = async (p: Promise<unknown>, okMessage: string) => { try { await p; notify(okMessage); return true; } catch (e) { console.error(e); notify("Có lỗi xảy ra, vui lòng thử lại"); return false; } };
  const signIn = (currentUser: AuthUser) => { setUser(currentUser); setSignedIn(currentUser.role === "admin" || currentUser.role === "staff"); notify("Đăng nhập quản trị thành công"); };
  const signOut = async () => { try { await authService.logout(); } finally { setUser(null); setSignedIn(false); } };
  return <Ctx.Provider value={{ signedIn, initializing, user, signIn, signOut, toast, notify, run }}>{children}</Ctx.Provider>;
}
export function useAdmin() { const c = useContext(Ctx); if (!c) throw new Error("AdminProvider missing"); return c; }
