import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tag, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money, useStore } from "@/lib/store";
import { usePromos } from "@/services/hooks";
export const Route = createFileRoute("/account/vouchers")({ head: () => ({ meta: [{ title: "Ví voucher — MỘC" }, { name: "description", content: "Xem các ưu đãi và mã giảm giá tại MỘC." }, { property: "og:title", content: "Ví voucher — MỘC" }, { property: "og:description", content: "Khám phá các voucher dành riêng cho bạn." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Vouchers });
const fmt = (d: string) => d.split("-").reverse().join("/");
function Vouchers() {
  const store = useStore(); const [open, setOpen] = useState(""); const vouchers = usePromos().filter(p => p.active);
  return <><h2 className="text-2xl font-medium mb-2">Ví voucher</h2><p className="text-sm text-muted-foreground mb-8">Một chút ưu đãi dành riêng cho bạn.</p>
    {vouchers.length === 0 && <p className="text-sm text-muted-foreground border border-dashed border-border py-12 text-center">Hiện chưa có voucher nào.</p>}
    <div className="grid lg:grid-cols-2 gap-5">{vouchers.map(v => <article key={v.code} className="border border-border flex min-h-46"><div className="bg-primary text-primary-foreground w-24 md:w-30 shrink-0 flex flex-col items-center justify-center text-center px-2"><Tag className="size-6 text-accent mb-3"/><span className="text-[10px] tracking-widest">MỘC<br/>VOUCHER</span></div><div className="p-5 flex-1 min-w-0"><p className="font-semibold text-lg">{v.title}</p><p className="text-sm text-muted-foreground mt-1">Cho đơn hàng từ {money(v.minOrder)}</p><p className="text-xs text-muted-foreground mt-3">Hạn dùng: {fmt(v.expires)}</p><div className="flex items-center justify-between gap-2 mt-4"><Button variant="link" className="p-0 text-xs" onClick={() => setOpen(open === v.code ? "" : v.code)}>Điều kiện <ChevronDown className="size-3"/></Button><Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(v.code); store.notify(`Đã sao chép mã ${v.code}`); }}>{v.code}</Button></div>{open === v.code && <p className="text-xs leading-5 text-muted-foreground mt-4 border-t pt-3">Áp dụng cho đơn hàng từ {money(v.minOrder)}, dùng đến hết ngày {fmt(v.expires)}. Không cộng dồn với các chương trình khuyến mãi khác.</p>}</div></article>)}</div></>;
}
