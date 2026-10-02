import { createContext, useContext, useState, type ReactNode } from "react";

export type { Product } from "@/services/types";
export const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value) + "₫";
export type CartItem = { key: string; productId: string; color: string; size: string; quantity: number; selected: boolean };
type Store = { cart: CartItem[]; add: (productId: string, color: string, size: string, quantity: number) => void; update: (key: string, fields: Partial<CartItem>) => void; remove: (key: string) => void; removeSelected: () => void; clear: () => void; signedIn: boolean; signIn: () => void; signOut: () => void; cartOpen: boolean; setCartOpen: (open: boolean) => void; authOpen: boolean; setAuthOpen: (open: boolean) => void; authMode: "login" | "register" | "forgot"; setAuthMode: (mode: "login" | "register" | "forgot") => void; toast: string; notify: (message: string) => void };
const StoreContext = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  const [toast, setToast] = useState("");
  const notify = (message: string) => { setToast(message); setTimeout(() => setToast(""), 3500); };
  const add = (productId: string, color: string, size: string, quantity: number) => {
    const key = `${productId}-${color}-${size}`;
    setCart(current => { const exists = current.find(item => item.key === key); return exists ? current.map(item => item.key === key ? { ...item, quantity: item.quantity + quantity } : item) : [...current, { key, productId, color, size, quantity, selected: true }]; });
    notify("Đã thêm sản phẩm vào giỏ hàng"); setCartOpen(true);
  };
  const update = (key: string, fields: Partial<CartItem>) => setCart(current => current.map(item => item.key === key ? { ...item, ...fields } : item));
  const remove = (key: string) => { setCart(current => current.filter(item => item.key !== key)); notify("Đã xóa sản phẩm khỏi giỏ hàng"); };
  return <StoreContext.Provider value={{ cart, add, update, remove, removeSelected: () => setCart(current => current.filter(item => !item.selected)), clear: () => setCart([]), signedIn, signIn: () => { setSignedIn(true); setAuthOpen(false); notify("Đăng nhập thành công"); }, signOut: () => { setSignedIn(false); setAuthMode("login"); setAuthOpen(true); notify("Đã đăng xuất"); }, cartOpen, setCartOpen, authOpen, setAuthOpen, authMode, setAuthMode, toast, notify }}>{children}</StoreContext.Provider>;
}
export function useStore() { const context = useContext(StoreContext); if (!context) throw new Error("StoreProvider missing"); return context; }
