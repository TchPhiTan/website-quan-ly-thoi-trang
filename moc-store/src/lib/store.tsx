import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authService, cartService, productService } from "@/services";

export type { Product } from "@/services/types";
export const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value) + "₫";
export type CartItem = { key: string; apiId?: string; variantId?: string; productId: string; color: string; size: string; quantity: number; selected: boolean };
type Store = { cart: CartItem[]; add: (productId: string, color: string, size: string, quantity: number, variantId?: string, priceUnit?: number) => Promise<void>; update: (key: string, fields: Partial<CartItem>) => Promise<void>; remove: (key: string) => Promise<void>; removeSelected: () => void; clear: () => void; signedIn: boolean; signIn: () => void; signOut: () => void; cartOpen: boolean; setCartOpen: (open: boolean) => void; authOpen: boolean; setAuthOpen: (open: boolean) => void; authMode: "login" | "register" | "forgot"; setAuthMode: (mode: "login" | "register" | "forgot") => void; toast: string; notify: (message: string) => void };
const StoreContext = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  const [toast, setToast] = useState("");
  const loadRemoteCart = async () => { try { const items = await cartService.list(); setCart(items.map(item => ({ key: item.id, apiId: item.id, variantId: item.variantId, productId: item.productId, color: item.color, size: item.size, quantity: item.quantity, selected: true }))); } catch (error) { notify((error as Error).message); } };
  useEffect(() => { void authService.me().then(() => { setSignedIn(true); return loadRemoteCart(); }).catch(() => setSignedIn(false)); }, []);
  const notify = (message: string) => { setToast(message); setTimeout(() => setToast(""), 3500); };
  const add = async (productId: string, color: string, size: string, quantity: number, variantId?: string, priceUnit?: number) => {
    if (signedIn) { try { const product = await productService.get(productId); const variant = variantId ? product?.variants?.find(item => item.id === variantId) : product?.variants?.find(item => item.color === color && item.size === size); if (!variant || !product?.apiId) { notify("Không xác định được phiên bản sản phẩm"); return; } await cartService.add({ productId: product.apiId, variantId: variant.id, size, color, quantity, priceUnit: priceUnit ?? product.price }); await loadRemoteCart(); notify("Đã thêm sản phẩm vào giỏ hàng"); setCartOpen(true); } catch (error) { notify((error as Error).message); } return; }
    const key = `${productId}-${color}-${size}`;
    setCart(current => { const exists = current.find(item => item.key === key); return exists ? current.map(item => item.key === key ? { ...item, quantity: item.quantity + quantity } : item) : [...current, { key, productId, color, size, quantity, selected: true }]; });
    notify("Đã thêm sản phẩm vào giỏ hàng"); setCartOpen(true);
  };
  const update = async (key: string, fields: Partial<CartItem>) => { const item = cart.find(candidate => candidate.key === key); if (signedIn && item?.apiId && fields.quantity !== undefined) { try { await cartService.update(item.apiId, fields.quantity); } catch (error) { notify((error as Error).message); return; } } setCart(current => current.map(candidate => candidate.key === key ? { ...candidate, ...fields } : candidate)); };
  const remove = async (key: string) => { const item = cart.find(candidate => candidate.key === key); if (signedIn && item?.apiId) { try { await cartService.remove(item.apiId); } catch (error) { notify((error as Error).message); return; } } setCart(current => current.filter(candidate => candidate.key !== key)); notify("Đã xóa sản phẩm khỏi giỏ hàng"); };
  return <StoreContext.Provider value={{ cart, add, update, remove, removeSelected: () => setCart(current => current.filter(item => !item.selected)), clear: () => setCart([]), signedIn, signIn: () => { setSignedIn(true); setAuthOpen(false); void loadRemoteCart(); notify("Đăng nhập thành công"); }, signOut: async () => { try { await authService.logout(); setSignedIn(false); setCart([]); setAuthMode("login"); setAuthOpen(true); notify("Đã đăng xuất"); } catch (error) { notify((error as Error).message); } }, cartOpen, setCartOpen, authOpen, setAuthOpen, authMode, setAuthMode, toast, notify }}>{children}</StoreContext.Provider>;
}
export function useStore() { const context = useContext(StoreContext); if (!context) throw new Error("StoreProvider missing"); return context; }
