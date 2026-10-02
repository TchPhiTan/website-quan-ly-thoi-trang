import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/lib/admin-data";
export const Route = createFileRoute("/admin/login")({ head: () => ({ meta: [{ title: "Đăng nhập quản trị — MỘC" }] }), component: AdminLogin });
function AdminLogin() {
  const a = useAdmin(); const nav = useNavigate(); const [show, setShow] = useState(false); const [err, setErr] = useState("");
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const d = new FormData(e.currentTarget); const id = String(d.get("identifier") || "").trim(); const pw = String(d.get("password") || ""); if (!id) { setErr("Vui lòng nhập email hoặc tên đăng nhập."); return; } if (pw.length < 6) { setErr("Mật khẩu cần có ít nhất 6 ký tự."); return; } setErr(""); a.signIn(); void nav({ to: "/admin" }); };
  return <div className="min-h-screen flex items-center justify-center bg-secondary px-4"><form onSubmit={submit} noValidate className="w-full max-w-[420px] bg-card border border-border p-8 sm:p-10 space-y-5">
    <div className="text-center"><span className="brand text-2xl">MỘC<span className="text-accent">.</span></span><p className="text-[11px] tracking-widest uppercase text-accent mt-5">Khu vực quản trị</p><h1 className="editorial-title text-4xl mt-2">Đăng nhập</h1></div>
    <label className="block text-xs font-medium">Email hoặc tên đăng nhập<Input name="identifier" className="mt-2 h-11" placeholder="admin@moc.vn" /></label>
    <label className="block text-xs font-medium">Mật khẩu<span className="relative block mt-2"><Input name="password" type={show ? "text" : "password"} className="h-11 pr-11" placeholder="Nhập mật khẩu" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1" onClick={() => setShow(!show)} aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{show ? <EyeOff /> : <Eye />}</Button></span></label>
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="remember" className="accent-accent size-4" /> Ghi nhớ đăng nhập</label>
    {err && <p className="text-destructive text-xs">{err}</p>}
    <Button type="submit" className="w-full h-11">Đăng nhập</Button>
    <p className="text-[11px] text-muted-foreground text-center">Bản giao diện mẫu: nhập bất kỳ tài khoản và mật khẩu từ 6 ký tự.</p>
  </form></div>;
}
