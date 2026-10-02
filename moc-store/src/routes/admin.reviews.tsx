import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHead, Badge, Modal, Table, th, td } from "@/components/admin/admin-ui";
import { useAdmin, type Review } from "@/lib/admin-data";
import { useReviews } from "@/services/hooks";
import { reviewService } from "@/services";
export const Route = createFileRoute("/admin/reviews")({ head: () => ({ meta: [{ title: "Quản lý đánh giá — MỘC" }] }), component: Reviews });
const Stars = ({ n }: { n: number }) => <span className="inline-flex">{[1, 2, 3, 4, 5].map(i => <Star key={i} className={`size-4 ${i <= n ? "fill-accent text-accent" : "text-muted-foreground"}`} />)}</span>;
function Reviews() {
  const a = useAdmin(); const reviews = useReviews(); const [open, setOpen] = useState<Review | null>(null); const [text, setText] = useState(""); const [err, setErr] = useState("");
  const send = () => { if (!open) return; if (text.trim().length < 5) { setErr("Phản hồi cần có ít nhất 5 ký tự."); return; } void a.run(reviewService.reply(open.id, text.trim()), "Đã gửi phản hồi"); setOpen(null); };
  return <><PageHead eyebrow="Khách hàng" title="Quản lý đánh giá" />
    <Table><thead><tr><th className={th}>Sản phẩm</th><th className={th}>Khách hàng</th><th className={th}>Đánh giá</th><th className={th}>Nội dung</th><th className={th}>Ngày</th><th className={th}>Phản hồi</th><th className={th}>Thao tác</th></tr></thead>
      <tbody>{reviews.map(r => <tr key={r.id}><td className={td}>{r.productName}</td><td className={td}>{r.customer}</td><td className={td}><Stars n={r.rating} /></td><td className={`${td} max-w-xs truncate`}>{r.text}</td><td className={td}>{r.date}</td><td className={td}><Badge tone={r.reply ? "ok" : "warn"}>{r.reply ? "Đã phản hồi" : "Chưa phản hồi"}</Badge></td>
        <td className={td}><Button variant="ghost" size="icon" aria-label="Xem và trả lời" onClick={() => { setOpen(r); setText(r.reply); setErr(""); }}><Eye /></Button></td></tr>)}</tbody></Table>
    <Modal open={open !== null} onOpenChange={o => { if (!o) setOpen(null); }} title={open?.productName ?? ""} desc={open ? `${open.customer} — ${open.date}` : undefined}>{open && <div className="space-y-4 mt-2"><Stars n={open.rating} /><p className="text-sm leading-6">{open.text}</p><textarea value={text} onChange={e => setText(e.target.value)} maxLength={1000} placeholder="Nhập phản hồi cho khách hàng..." className="w-full border border-border bg-card p-3 text-sm min-h-28 outline-none focus:border-accent" />{err && <p className="text-destructive text-xs">{err}</p>}<Button className="w-full h-11" onClick={send}>{open.reply ? "Cập nhật phản hồi" : "Gửi phản hồi"}</Button></div>}</Modal></>;
}
