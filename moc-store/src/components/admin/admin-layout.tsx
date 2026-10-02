import { Link, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { LayoutDashboard, Shirt, Boxes, ClipboardList, ShoppingBag, TicketPercent, Star, TrendingUp, Users, LogOut, Menu, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/lib/admin-data";

const nav = [
  { to: "/admin", label: "Bảng điều khiển", icon: LayoutDashboard }, { to: "/admin/products", label: "Quản lý sản phẩm", icon: Shirt },
  { to: "/admin/inventory", label: "Quản lý tồn kho", icon: Boxes }, { to: "/admin/inventory-tools", label: "Hỗ trợ tồn kho", icon: ClipboardList },
  { to: "/admin/orders", label: "Quản lý đơn hàng", icon: ShoppingBag }, { to: "/admin/promotions", label: "Quản lý khuyến mại", icon: TicketPercent },
  { to: "/admin/reviews", label: "Quản lý đánh giá", icon: Star }, { to: "/admin/reports", label: "Quản lý báo cáo", icon: TrendingUp },
  { to: "/admin/users", label: "Quản lý người dùng", icon: Users },
] as const;

export function AdminLayout() {
  const a = useAdmin(); const path = useRouterState({ select: s => s.location.pathname }); const [open, setOpen] = useState(false);
  const toast = a.toast && <div role="status" className="fixed z-[100] bottom-6 right-6 bg-primary text-primary-foreground shadow-lg px-5 py-3 text-sm flex items-center gap-3"><Check className="size-4 text-accent" />{a.toast}</div>;
  if (path === "/admin/login") return <><Outlet />{toast}</>;
  if (!a.signedIn) return <Navigate to="/admin/login" />;
  const active = (to: string) => to === "/admin" ? path === "/admin" || path === "/admin/" : path.startsWith(to);
  return <div className="min-h-screen bg-background md:grid md:grid-cols-[260px_1fr]">
    <aside className={`${open ? "block" : "hidden"} md:block bg-secondary border-r border-border md:sticky md:top-0 md:h-screen overflow-y-auto`}>
      <div className="px-6 h-[70px] flex items-center border-b border-border"><span className="brand text-2xl">MỘC<span className="text-accent">.</span></span><span className="ml-3 text-[10px] tracking-widest uppercase text-muted-foreground">Quản trị</span></div>
      <nav className="p-3 grid gap-1" onClick={() => setOpen(false)}>{nav.map(n => <Link key={n.to} to={n.to} className={`flex items-center gap-3 px-3 py-3 text-sm hover:bg-background ${active(n.to) ? "bg-background font-semibold border-l-2 border-accent" : "text-muted-foreground"}`}><n.icon className="size-4" />{n.label}</Link>)}</nav>
    </aside>
    <div className="min-w-0">
      <header className="h-[70px] border-b border-border px-5 md:px-10 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-30">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)} aria-label="Mở menu">{open ? <X /> : <Menu />}</Button>
        <p className="text-sm text-muted-foreground hidden md:block">Xin chào, Chủ cửa hàng</p>
        <div className="flex items-center gap-2"><Link to="/" search={{ category: "" }} className="text-xs uppercase tracking-widest nav-link mr-4">Xem cửa hàng</Link><Button variant="outline" size="sm" onClick={a.signOut}><LogOut /> Đăng xuất</Button></div>
      </header>
      <main className="px-5 md:px-10 py-8 md:py-10"><Outlet /></main>
    </div>
    {toast}
  </div>;
}
