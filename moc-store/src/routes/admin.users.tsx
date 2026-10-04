import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHead, Badge, Select, Modal, Field, Table, th, td, opts } from "@/components/admin/admin-ui";
import { useAdmin, type AUser } from "@/lib/admin-data";
import { useUsers } from "@/services/hooks";
import { userService } from "@/services";
export const Route = createFileRoute("/admin/users")({ head: () => ({ meta: [{ title: "Quản lý người dùng — MỘC" }] }), component: Users });
function Users() {
  const a = useAdmin(); const { users, reload } = useUsers(); const [open, setOpen] = useState(false); const [cur, setCur] = useState<AUser | null>(null); const [role, setRole] = useState("Nhân viên");
  const openForm = (u: AUser) => { setCur(u); setRole(u.role); setOpen(true); };
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!cur) return;
    const ok = await a.run(userService.setRole(cur.id, role as AUser["role"]), "Đã cập nhật vai trò");
    if (ok) { await reload(); setOpen(false); }
  };
  return <><PageHead eyebrow="Hệ thống" title="Quản lý người dùng" />
    <Table><thead><tr><th className={th}>Họ và tên</th><th className={th}>Email</th><th className={th}>Số điện thoại</th><th className={th}>Vai trò</th><th className={th}>Ngày tạo</th><th className={th}>Thao tác</th></tr></thead>
      <tbody>{users.map(u => <tr key={u.id}><td className={td}><b>{u.name}</b></td><td className={td}>{u.email}</td><td className={td}>{u.phone}</td><td className={td}>{u.active ? <Badge tone={u.role === "Nhân viên" ? "warn" : "ok"}>{u.role}</Badge> : <Badge tone="muted">Không hoạt động</Badge>}</td><td className={td}>{u.createdAt}</td>
        <td className={td}><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="Cập nhật vai trò" onClick={() => openForm(u)}><Pencil /></Button><Button variant="ghost" size="icon" aria-label="Chuyển không hoạt động" disabled={!u.active} onClick={() => { void a.run(userService.setActive(u.id, false), "Đã chuyển sang không hoạt động").then(ok => { if (ok) void reload(); }); }}><Trash2 /></Button></div></td></tr>)}</tbody></Table>
    <Modal open={open} onOpenChange={setOpen} title="Cập nhật vai trò"><form onSubmit={save} className="space-y-4 mt-2">
      <Field label="Vai trò"><Select value={role} onChange={setRole} options={opts(["Khách hàng", "Nhân viên"])} /></Field>
      <Button type="submit" className="w-full h-11">Lưu vai trò</Button></form></Modal></>;
}
