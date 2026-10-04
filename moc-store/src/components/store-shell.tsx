import { Link, Outlet } from "@tanstack/react-router";
import { Search, UserRound, ShoppingBag, Menu, X, Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { StoreProvider, useStore, money } from "@/lib/store";
import { useProducts } from "@/services/hooks";
import { authService } from "@/services";

export function StoreShell() { return <ShellContent />; }
function ShellContent() {
  const store = useStore(); const products = useProducts(); const [mobileMenu, setMobileMenu] = useState(false); const [showPassword, setShowPassword] = useState(false); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const count = store.cart.reduce((sum, item) => sum + item.quantity, 0);
  const openAuth = () => { store.setAuthMode("login"); store.setAuthOpen(true); };
  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("identifier") || "").trim();
    const password = String(data.get("password") || "");
    const fullName = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").replace(/\s/g, "");
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError("Vui lòng nhập email hợp lệ."); return; }
    if (store.authMode !== "forgot" && password.length < 6) { setError("Mật khẩu cần có ít nhất 6 ký tự."); return; }
    if (store.authMode === "register") {
      if (!fullName) { setError("Vui lòng nhập họ và tên."); return; }
      if (!phone || !/^0\d{9}$/.test(phone)) { setError("Số điện thoại không hợp lệ (cần 10 chữ số, bắt đầu bằng 0)."); return; }
    }
    setError(""); setLoading(true);
    try {
      if (store.authMode === "forgot") {
        store.notify("Tính năng đặt lại mật khẩu chưa được kết nối");
        store.setAuthOpen(false);
      } else {
        if (store.authMode === "register") await authService.register({ email, password, full_name: fullName, phone });
        await authService.login({ email, password });
        store.signIn();
      }
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setLoading(false);
    }
  };
  return <>
    <div className="bg-primary text-primary-foreground text-center text-[10px] md:text-xs tracking-wide py-2.5">Miễn phí vận chuyển cho đơn hàng từ 799.000₫ <span className="mx-3 opacity-50">|</span> Khám phá phong cách của riêng bạn</div>
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border"><div className="site-container h-[70px] flex items-center justify-between gap-5">
      <div className="flex items-center gap-8"><Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Mở danh mục">{mobileMenu ? <X/> : <Menu/>}</Button><Link to="/" search={{ category: "" }} className="brand text-2xl md:text-[29px] shrink-0">MỘC<span className="text-accent">.</span></Link></div>
      <nav className="hidden md:flex items-center gap-8 text-[12px] font-medium uppercase tracking-widest"><Link className="nav-link" to="/" search={{ category: "" }}>Tất cả</Link><Link className="nav-link" to="/" search={{ category: "Nữ" }}>Nữ</Link><Link className="nav-link" to="/" search={{ category: "Nam" }}>Nam</Link><Link className="nav-link" to="/promotions">Ưu đãi</Link></nav>
      <div className="flex items-center gap-1 md:gap-3"><Link to="/" search={{ category: "" }} aria-label="Tìm kiếm sản phẩm"><Button variant="ghost" size="icon"><Search className="size-5"/></Button></Link>{store.signedIn ? <Link to="/account"><Button variant="ghost" size="icon" aria-label="Tài khoản"><UserRound className="size-5"/></Button></Link> : <Button variant="ghost" size="icon" onClick={openAuth} aria-label="Đăng nhập"><UserRound className="size-5"/></Button>}<Button variant="ghost" size="icon" onClick={() => store.setCartOpen(true)} aria-label="Giỏ hàng" className="relative"><ShoppingBag className="size-5"/>{count > 0 && <span className="absolute top-0 right-0 size-4 rounded-full bg-accent text-primary-foreground text-[10px] flex items-center justify-center">{count}</span>}</Button></div>
    </div>{mobileMenu && <nav className="md:hidden flex flex-col px-5 pb-5 gap-3 text-sm" onClick={() => setMobileMenu(false)}><Link to="/" search={{ category: "" }}>Tất cả sản phẩm</Link><Link to="/" search={{ category: "Nữ" }}>Thời trang nữ</Link><Link to="/" search={{ category: "Nam" }}>Thời trang nam</Link><Link to="/promotions">Ưu đãi & Khuyến mãi</Link><Link to="/account">Tài khoản</Link></nav>}</header>
    <main><Outlet /></main>
    <footer className="border-t border-border mt-24 bg-secondary"><div className="site-container py-14 grid gap-10 md:grid-cols-4 text-sm"><div className="md:col-span-2"><p className="brand text-2xl mb-4">MỘC<span className="text-accent">.</span></p><p className="text-muted-foreground max-w-sm leading-7">Trang phục giản đơn, tinh tế cho những khoảnh khắc thường ngày.</p></div><div><p className="font-semibold mb-4">KHÁM PHÁ</p><div className="grid gap-3 text-muted-foreground"><Link to="/" search={{ category: "" }}>Sản phẩm</Link><Link to="/promotions">Ưu đãi</Link><Link to="/account/orders">Đơn hàng của tôi</Link><Link to="/admin">Quản trị</Link></div></div><div><p className="font-semibold mb-4">HỖ TRỢ</p><p className="text-muted-foreground leading-7">Thông tin liên hệ và chính sách mua hàng sẽ được cập nhật khi cửa hàng hoạt động.</p></div></div><div className="site-container border-t border-border py-5 text-xs text-muted-foreground flex justify-between"><span>© 2026 MỘC. Bản thiết kế giao diện mẫu.</span><span>Thời trang dành cho bạn</span></div></footer>
    <Sheet open={store.cartOpen} onOpenChange={store.setCartOpen}><SheetContent className="w-full sm:max-w-md p-0 flex flex-col"><div className="p-6 border-b"><SheetTitle className="text-xl">Giỏ hàng của bạn ({count})</SheetTitle></div><div className="flex-1 overflow-y-auto p-6">{store.cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-center gap-4 text-muted-foreground"><ShoppingBag className="size-12 stroke-1"/><p>Giỏ hàng của bạn đang trống</p><Button variant="outline" onClick={() => store.setCartOpen(false)}>Tiếp tục mua sắm</Button></div> : <div className="space-y-6">{store.cart.map(item => { const product = products.find(p => p.id === item.productId); if (!product) return null; return <div key={item.key} className="flex gap-4"><Link to="/products/$productId" params={{ productId: product.id }} onClick={() => store.setCartOpen(false)}><img src={product.image} alt={product.name} className="w-20 h-25 object-cover"/></Link><div className="flex-1 text-sm"><Link to="/products/$productId" params={{ productId: product.id }} onClick={() => store.setCartOpen(false)} className="font-medium hover:underline">{product.name}</Link><p className="text-muted-foreground mt-1">{item.color} / {item.size} / SL: {item.quantity}</p><p className="mt-2 font-semibold">{money(product.price * item.quantity)}</p></div><Button variant="ghost" size="icon" onClick={() => store.remove(item.key)} aria-label="Xóa sản phẩm"><X/></Button></div>; })}</div>}</div>{store.cart.length > 0 && <div className="p-6 border-t space-y-4"><div className="flex justify-between font-medium"><span>Tạm tính</span><span>{money(store.cart.reduce((total, item) => total + (products.find(p => p.id === item.productId)?.price || 0) * item.quantity, 0))}</span></div><Link to="/cart" onClick={() => store.setCartOpen(false)}><Button className="w-full h-12">Xem giỏ hàng <ArrowRight/></Button></Link></div>}</SheetContent></Sheet>
    <Dialog open={store.authOpen} onOpenChange={(open) => { store.setAuthOpen(open); setError(""); }}><DialogContent className="max-w-[440px] p-8 sm:p-10 max-h-[90vh] overflow-y-auto"><div className="text-center space-y-2 mb-4"><span className="brand text-xl">MỘC<span className="text-accent">.</span></span><DialogTitle className="text-2xl font-medium mt-5">{store.authMode === "login" ? "Chào mừng trở lại" : store.authMode === "register" ? "Tạo tài khoản" : "Quên mật khẩu"}</DialogTitle><DialogDescription>{store.authMode === "forgot" ? "Nhập email hoặc số điện thoại để nhận hướng dẫn" : "Trải nghiệm mua sắm dành riêng cho bạn"}</DialogDescription></div><form onSubmit={submitAuth} className="space-y-4" noValidate>{store.authMode === "register" && <><label className="block text-xs font-medium">Họ và tên<Input name="name" required maxLength={100} placeholder="Nguyễn Thị Minh Anh" className="mt-2 h-11"/></label><label className="block text-xs font-medium">Số điện thoại<Input name="phone" required pattern="0[0-9]{9}" placeholder="090 123 4567" className="mt-2 h-11"/></label></>}<label className="block text-xs font-medium">Email hoặc số điện thoại<Input name="identifier" required placeholder="email@example.com hoặc 0901234567" className="mt-2 h-11"/></label>{store.authMode !== "forgot" && <label className="block text-xs font-medium">Mật khẩu<span className="relative block mt-2"><Input name="password" type={showPassword ? "text" : "password"} required minLength={6} placeholder="Nhập mật khẩu" className="h-11 pr-11"/><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{showPassword ? <EyeOff/> : <Eye/>}</Button></span></label>}{error && <p className="text-destructive text-xs">{error}</p>}{store.authMode === "login" && <div className="text-right"><Button type="button" variant="link" className="p-0 h-auto text-xs" onClick={() => { store.setAuthMode("forgot"); setError(""); }}>Quên mật khẩu?</Button></div>}<Button type="submit" disabled={loading} className="w-full h-11">{loading ? "Đang xử lý..." : store.authMode === "login" ? "Đăng nhập" : store.authMode === "register" ? "Đăng ký" : "Gửi hướng dẫn"}</Button></form><div className="text-center text-xs text-muted-foreground">{store.authMode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"} <Button variant="link" className="p-0 h-auto text-xs text-foreground" onClick={() => { store.setAuthMode(store.authMode === "login" ? "register" : "login"); setError(""); }}>{store.authMode === "login" ? "Đăng ký ngay" : "Đăng nhập"}</Button>{store.authMode === "register" && <Button variant="link" className="block mx-auto text-xs" onClick={() => store.setAuthMode("forgot")}>Quên mật khẩu?</Button>}</div></DialogContent></Dialog>
    {store.toast && <div role="status" className="fixed z-[100] bottom-6 right-6 bg-primary text-primary-foreground shadow-lg px-5 py-3 text-sm flex items-center gap-3"><Check className="size-4 text-accent"/>{store.toast}</div>}
  </>;
}
