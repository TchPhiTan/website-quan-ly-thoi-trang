import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useReviewableItems } from "@/services/hooks";
import { reviewService } from "@/services";

export const Route = createFileRoute("/account/reviews")({
  head: () => ({ meta: [{ title: "Đánh giá và phản hồi — MỘC" }, { name: "description", content: "Chia sẻ đánh giá về sản phẩm đã mua tại MỘC." }, { property: "og:title", content: "Đánh giá và phản hồi — MỘC" }, { property: "og:description", content: "Chia sẻ trải nghiệm về trang phục MỘC của bạn." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Reviews,
});

function Reviews() {
  const store = useStore();
  const items = useReviewableItems(store.signedIn);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [error, setError] = useState("");

  const submit = async (item: (typeof items)[number]) => {
    const rating = ratings[item.id] || 0;
    const text = (texts[item.id] || "").trim();
    if (!rating) { setError("Vui lòng chọn số sao."); return; }
    if (text.length < 5) { setError("Đánh giá cần có ít nhất 5 ký tự."); return; }
    try {
      await reviewService.create({ orderItemId: store.signedIn ? item.id : undefined, productName: item.productName, customer: "Bạn", rating, text }, store.signedIn);
      setSubmitted(current => [...current, item.id]);
      setError("");
    } catch (e) { setError((e as Error).message); }
  };

  return <>
    <h2 className="text-2xl font-medium mb-2">Đánh giá & phản hồi</h2>
    <p className="text-sm text-muted-foreground mb-8">Chia sẻ cảm nhận về những sản phẩm bạn đã mua.</p>
    <div className="space-y-6">
      {items.map(item => {
        const done = Boolean(item.review) || submitted.includes(item.id);
        return <article key={item.id} className="border border-border p-5 md:p-7">
          <div className="flex gap-5 border-b pb-5">
            <Link to="/products/$productId" params={{ productId: item.productId }}><img src={item.image} alt={item.productName} className="w-20 h-25 object-cover" /></Link>
            <div><Link to="/products/$productId" params={{ productId: item.productId }} className="font-medium hover:underline">{item.productName}</Link><p className="text-xs text-muted-foreground mt-2">Đơn hàng đã hoàn tất</p></div>
          </div>
          {done ? <p className="text-sm text-accent pt-5">Cảm ơn bạn đã gửi đánh giá!</p> : <div className="pt-5">
            <p className="text-sm font-medium mb-3">Bạn thấy sản phẩm thế nào?</p>
            <div className="flex gap-1 mb-5">{[1, 2, 3, 4, 5].map(star => <Button key={star} variant="ghost" size="icon" className="size-8 p-0" aria-label={`Đánh giá ${star} sao`} onClick={() => setRatings(current => ({ ...current, [item.id]: star }))}><Star className={`size-6 ${star <= (ratings[item.id] || 0) ? "fill-accent text-accent" : "text-muted-foreground"}`} /></Button>)}</div>
            <textarea value={texts[item.id] || ""} onChange={e => setTexts(current => ({ ...current, [item.id]: e.target.value }))} maxLength={1000} placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..." className="w-full border border-border p-3 text-sm min-h-28 outline-none focus:border-accent" />
            {error && <p className="text-destructive text-xs mt-2">{error}</p>}
            <Button className="mt-4" onClick={() => void submit(item)}>Gửi đánh giá</Button>
          </div>}
        </article>;
      })}
      {!items.length && <p className="text-sm text-muted-foreground">Chưa có sản phẩm nào đủ điều kiện đánh giá.</p>}
    </div>
  </>;
}
/* import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
// import { useProducts } from "@/services/hooks";
// import { reviewService } from "@/services";
// export const LegacyRoute = createFileRoute("/account/reviews")({ head: () => ({ meta: [{ title: "Đánh giá và phản hồi — MỘC" }, { name: "description", content: "Chia sẻ đánh giá về sản phẩm đã mua tại MỘC." }, { property: "og:title", content: "Đánh giá và phản hồi — MỘC" }, { property: "og:description", content: "Chia sẻ trải nghiệm về trang phục MỘC của bạn." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: LegacyReviews });
// legacy implementation intentionally disabled
*/
