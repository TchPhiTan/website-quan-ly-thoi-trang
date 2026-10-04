import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/lib/admin-data";
import { authService } from "@/services";
export const Route = createFileRoute("/admin/login")({ head: () => ({ meta: [{ title: "Đăng nhập quản trị — MỘC" }] }), component: AdminLogin });
function AdminLogin() {
  const a = useAdmin(); const nav = useNavigate(); const [show, setShow] = useState(false); const [err, setErr] = useState(""); const [submitting, setSubmitting] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const d = new FormData(e.currentTarget); const email = String(d.get("identifier") || "").trim(); const pw = String(d.get("password") || ""); if (!email) { setErr("Vui lòng nhập email."); return; } if (pw.length < 6) { setErr("Mật khẩu cần có ít nhất 6 ký tự."); return; } setErr(""); setSubmitting(true); try { const user = await authService.login({ email, password: pw }); if (user.role !== "admin") { await authService.logout().catch(() => {}); setErr("Tài khoản này không có quyền quản trị."); return; } a.signIn(user); await nav({ to: "/admin" }); } catch (error) { setErr((error as Error).message || "Đăng nhập thất bại."); } finally { setSubmitting(false); } };
  return <div className="min-h-screen flex items-center justify-center bg-secondary px-4"><form onSubmit={submit} noValidate className="w-full max-w-[420px] bg-card border border-border p-8 sm:p-10 space-y-5">
    <div className="text-center"><span className="brand text-2xl">MỘC<span className="text-accent">.</span></span><p className="text-[11px] tracking-widest uppercase text-accent mt-5">Khu vực quản trị</p><h1 className="editorial-title text-4xl mt-2">Đăng nhập</h1></div>
    <label className="block text-xs font-medium">Email<Input name="identifier" type="email" className="mt-2 h-11" placeholder="admin@moc.vn" /></label>
    <label className="block text-xs font-medium">Mật khẩu<span className="relative block mt-2"><Input name="password" type={show ? "text" : "password"} className="h-11 pr-11" placeholder="Nhập mật khẩu" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1" onClick={() => setShow(!show)} aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{show ? <EyeOff /> : <Eye />}</Button></span></label>
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="remember" className="accent-accent size-4" /> Ghi nhớ đăng nhập</label>
    {err && <p className="text-destructive text-xs">{err}</p>}
    <Button type="submit" className="w-full h-11" disabled={submitting}>{submitting ? "Đang đăng nhập..." : "Đăng nhập"}</Button>
    <p className="text-[11px] text-muted-foreground text-center">Sử dụng tài khoản có quyền quản trị.</p>
  </form></div>;
}
