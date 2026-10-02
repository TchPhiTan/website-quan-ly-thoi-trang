import { createFileRoute, Link } from "@tanstack/react-router";
import { money } from "@/lib/store";
import { useOrders, useProducts } from "@/services/hooks";
import { Check, Circle } from "lucide-react";
export const Route = createFileRoute("/account/orders")({ head: () => ({ meta: [{ title: "Lịch sử đơn hàng — MỘC" }, { name: "description", content: "Theo dõi các đơn hàng của bạn tại MỘC." }, { property: "og:title", content: "Lịch sử đơn hàng — MỘC" }, { property: "og:description", content: "Theo dõi các đơn hàng thời trang đã đặt." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Orders });
const CUSTOMER = "Nguyễn Thị Minh Anh";
function Orders() {
  const orders = useOrders().filter(o => o.customer === CUSTOMER); const products = useProducts();
  return <><h2 className="text-2xl font-medium mb-2">Lịch sử đơn hàng</h2><p className="text-sm text-muted-foreground mb-8">Theo dõi hành trình đơn hàng của bạn.</p>
    {orders.length === 0 && <p className="text-sm text-muted-foreground border border-dashed border-border py-12 text-center">Bạn chưa có đơn hàng nào.</p>}
    <div className="space-y-6">{orders.map(order => { const product = products.find(p => p.id === order.lines[0]?.productId); const step = order.status === "Đã duyệt" ? 1 : 0; const cancelled = order.status === "Đã hủy";
      return <article key={order.id} className="border border-border p-5 md:p-7"><div className="flex flex-wrap justify-between gap-3 border-b pb-4 text-sm"><div><span className="font-semibold">#{order.id}</span><span className="text-muted-foreground ml-3">Đặt ngày {order.date.split("-").reverse().join("/")}</span></div><span className={`font-medium ${cancelled ? "text-destructive" : "text-accent"}`}>{order.status === "Chờ duyệt" ? "Chờ xác nhận" : order.status === "Đã duyệt" ? "Đã xác nhận" : "Đã hủy"}</span></div>
        <div className="flex gap-4 py-5">{product && <Link to="/products/$productId" params={{ productId: product.id }}><img src={product.image} alt={product.name} className="w-20 h-25 object-cover"/></Link>}<div className="text-sm"><p className="font-medium leading-6">{order.items}</p><p className="text-muted-foreground mt-2">Giao tới: {order.address}</p><p className="font-semibold mt-3">{money(order.total)}</p></div></div>
        {!cancelled && <div className="grid grid-cols-4 gap-1 pt-5 border-t">{["Đã đặt", "Đã xác nhận", "Đang giao", "Đã giao"].map((s, index) => <div key={s} className="relative text-center text-[10px] md:text-xs"><div className={`h-1 mb-4 ${index <= step ? "bg-accent" : "bg-border"}`}/>{index <= step ? <Check className="size-4 mx-auto text-accent"/> : <Circle className="size-4 mx-auto text-muted-foreground"/>}<span className={`block mt-2 ${index <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span></div>)}</div>}
      </article>; })}</div></>;
}
