import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHead, Badge, Select, Modal, Field, Table, th, td, opts } from "@/components/admin/admin-ui";
import { useAdmin, type AUser } from "@/lib/admin-data";
import { useUsers } from "@/services/hooks";
import { userService } from "@/services";
export const Route = createFileRoute("/admin/users")({ head: () => ({ meta: [{ title: "Quản lý người dùng — MỘC" }] }), component: Users });
function Users() {
  const a = useAdmin(); const users = useUsers(); const [open, setOpen] = useState(false); const [cur, setCur] = useState<AUser | null>(null); const [role, setRole] = useState("Nhân viên"); const [err, setErr] = useState("");
  const openForm = (u: AUser | null) => { setCur(u); setRole(u?.role ?? "Nhân viên"); setErr(""); setOpen(true); };
  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const d = new FormData(e.currentTarget); const name = String(d.get("name") || "").trim(); const email = String(d.get("email") || "").trim(); const phone = String(d.get("phone") || "").replace(/\s/g, ""); const pw = String(d.get("password") || "");
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) { setErr("Vui lòng nhập họ tên và email hợp lệ."); return; }
    if (!/^0\d{9}$/.test(phone)) { setErr("Số điện thoại cần có 10 chữ số và bắt đầu bằng 0."); return; }
    if (!cur && pw.length < 6) { setErr("Mật khẩu nhân viên mới cần có ít nhất 6 ký tự."); return; }
    const next: AUser = { id: cur?.id ?? `u${Date.now()}`, name, email, phone, role: cur ? (role as AUser["role"]) : "Nhân viên", active: cur?.active ?? true, createdAt: cur?.createdAt ?? new Date().toISOString().slice(0, 10) };
    void a.run(userService.save(next), cur ? "Đã cập nhật thông tin" : "Đã thêm nhân viên mới"); setOpen(false);
  };
  return <><PageHead eyebrow="Hệ thống" title="Quản lý người dùng" action={<Button onClick={() => openForm(null)}><Plus /> Thêm nhân viên mới</Button>} />
    <Table><thead><tr><th className={th}>Họ và tên</th><th className={th}>Email</th><th className={th}>Số điện thoại</th><th className={th}>Vai trò</th><th className={th}>Ngày tạo</th><th className={th}>Thao tác</th></tr></thead>
      <tbody>{users.map(u => <tr key={u.id}><td className={td}><b>{u.name}</b></td><td className={td}>{u.email}</td><td className={td}>{u.phone}</td><td className={td}>{u.active ? <Badge tone={u.role === "Nhân viên" ? "warn" : "ok"}>{u.role}</Badge> : <Badge tone="muted">Không hoạt động</Badge>}</td><td className={td}>{u.createdAt}</td>
        <td className={td}><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="Cập nhật" onClick={() => openForm(u)}><Pencil /></Button><Button variant="ghost" size="icon" aria-label="Chuyển không hoạt động" disabled={!u.active} onClick={() => { void a.run(userService.setActive(u.id, false), "Đã chuyển sang không hoạt động"); }}><Trash2 /></Button></div></td></tr>)}</tbody></Table>
    <Modal open={open} onOpenChange={setOpen} title={cur ? "Cập nhật thông tin" : "Thêm nhân viên mới"}><form key={cur?.id ?? "new"} onSubmit={save} noValidate className="space-y-4 mt-2">
      <Field label="Họ và tên"><Input name="name" defaultValue={cur?.name ?? ""} className="h-11" /></Field><Field label="Email"><Input name="email" type="email" defaultValue={cur?.email ?? ""} className="h-11" /></Field><Field label="Số điện thoại"><Input name="phone" defaultValue={cur?.phone ?? ""} className="h-11" /></Field>
      {cur ? <Field label="Vai trò"><Select value={role} onChange={setRole} options={opts(["Khách hàng", "Nhân viên"])} /></Field> : <Field label="Mật khẩu"><Input name="password" type="password" className="h-11" placeholder="Tối thiểu 6 ký tự" /></Field>}
      {err && <p className="text-destructive text-xs">{err}</p>}<Button type="submit" className="w-full h-11">Lưu</Button></form></Modal></>;
}
