import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Star, MessageSquareQuote, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useReviewableItems } from "@/services/hooks";
import { reviewService } from "@/services";

export const Route = createFileRoute("/account/reviews")({
  head: () => ({
    meta: [
      { title: "Đánh giá và phản hồi — MỘC" },
      { name: "description", content: "Chia sẻ đánh giá về sản phẩm đã mua tại MỘC." },
      { property: "og:title", content: "Đánh giá và phản hồi — MỘC" },
      { property: "og:description", content: "Chia sẻ trải nghiệm về trang phục MỘC của bạn." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Reviews,
});

function Reviews() {
  const store = useStore();
  const items = useReviewableItems(store.signedIn);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [hoverRatings, setHoverRatings] = useState<Record<string, number>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, { rating: number; text: string; date: string; reply?: string }>>({});
  const [error, setError] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const submit = async (item: (typeof items)[number]) => {
    const rating = ratings[item.id] || 0;
    const text = (texts[item.id] || "").trim();
    if (!rating) {
      setError(prev => ({ ...prev, [item.id]: "Vui lòng chọn số sao đánh giá (1 – 5 sao)." }));
      return;
    }
    if (text.length < 5) {
      setError(prev => ({ ...prev, [item.id]: "Nội dung nhận xét cần ít nhất 5 ký tự." }));
      return;
    }

    setSubmittingId(item.id);
    setError(prev => ({ ...prev, [item.id]: "" }));

    try {
      await reviewService.create(
        {
          orderItemId: store.signedIn ? item.id : undefined,
          productName: item.productName,
          customer: "Bạn",
          rating,
          text,
        },
        store.signedIn,
      );

      setSubmitted(current => ({
        ...current,
        [item.id]: {
          rating,
          text,
          date: new Date().toISOString().slice(0, 10),
        },
      }));

      store.notify("Cảm ơn bạn đã gửi đánh giá cho sản phẩm!");
    } catch (e) {
      setError(prev => ({ ...prev, [item.id]: (e as Error).message || "Không thể gửi đánh giá." }));
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-medium mb-2">Đánh giá & phản hồi</h2>
      <p className="text-sm text-muted-foreground mb-8">
        Chia sẻ cảm nhận về những sản phẩm bạn đã mua để giúp MỘC hoàn thiện hơn mỗi ngày.
      </p>

      <div className="space-y-6">
        {items.map(item => {
          const currentReview = item.review || submitted[item.id];
          const itemRating = ratings[item.id] || 0;
          const activeStars = hoverRatings[item.id] || itemRating;

          return (
            <article key={item.id} className="border border-border p-5 md:p-7">
              <div className="flex gap-4 sm:gap-5 border-b pb-5 items-center justify-between">
                <div className="flex gap-4 items-center min-w-0">
                  <Link to="/products/$productId" params={{ productId: item.productId }}>
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-16 h-20 sm:w-20 sm:h-25 object-cover shrink-0"
                    />
                  </Link>
                  <div className="min-w-0">
                    <Link
                      to="/products/$productId"
                      params={{ productId: item.productId }}
                      className="font-medium text-base hover:underline line-clamp-1"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                      <Clock className="size-3" /> Đơn hàng hoàn tất
                    </p>
                  </div>
                </div>

                {currentReview && (
                  <span className="text-[10px] uppercase font-semibold tracking-wider bg-accent/10 text-accent px-2.5 py-1 shrink-0">
                    Đã đánh giá
                  </span>
                )}
              </div>

              {currentReview ? (
                /* Hiển thị đánh giá đã gửi */
                <div className="pt-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`size-4 ${
                            star <= currentReview.rating ? "fill-accent text-accent" : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">
                      Ngày {currentReview.date.split("-").reverse().join("/")}
                    </span>
                  </div>

                  <p className="text-sm text-foreground/90 leading-relaxed font-normal">
                    {currentReview.text}
                  </p>

                  {/* Phản hồi từ cửa hàng MỘC */}
                  {currentReview.reply ? (
                    <div className="mt-4 p-4 bg-secondary/70 border-l-2 border-accent text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-accent font-semibold">
                        <MessageSquareQuote className="size-4" />
                        <span>Phản hồi từ MỘC:</span>
                      </div>
                      <p className="text-foreground/80 leading-relaxed pl-5">
                        {currentReview.reply}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic pt-1">
                      Đang chờ phản hồi từ quản trị viên MỘC...
                    </p>
                  )}
                </div>
              ) : (
                /* Form gửi đánh giá */
                <div className="pt-5">
                  <p className="text-sm font-medium mb-3">Bạn cảm thấy sản phẩm này thế nào?</p>

                  <div className="flex items-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        className="p-1 hover:scale-110 transition-transform focus:outline-none"
                        onMouseEnter={() =>
                          setHoverRatings(prev => ({ ...prev, [item.id]: star }))
                        }
                        onMouseLeave={() =>
                          setHoverRatings(prev => ({ ...prev, [item.id]: 0 }))
                        }
                        onClick={() =>
                          setRatings(prev => ({ ...prev, [item.id]: star }))
                        }
                        aria-label={`Đánh giá ${star} sao`}
                      >
                        <Star
                          className={`size-6 transition-colors ${
                            star <= activeStars
                              ? "fill-accent text-accent"
                              : "text-muted-foreground/40"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs text-muted-foreground ml-3 font-medium">
                      {activeStars === 5
                        ? "Tuyệt vời"
                        : activeStars === 4
                        ? "Rất hài lòng"
                        : activeStars === 3
                        ? "Bình thường"
                        : activeStars === 2
                        ? "Chưa hài lòng"
                        : activeStars === 1
                        ? "Rất tệ"
                        : "Chọn số sao"}
                    </span>
                  </div>

                  <textarea
                    value={texts[item.id] || ""}
                    onChange={e =>
                      setTexts(current => ({ ...current, [item.id]: e.target.value }))
                    }
                    maxLength={1000}
                    placeholder="Chia sẻ về chất liệu vải, độ vừa vặn, form dáng hoặc độ bền của sản phẩm..."
                    className="w-full border border-border p-3.5 text-xs sm:text-sm min-h-24 outline-none focus:border-accent bg-background"
                  />

                  {error[item.id] && (
                    <p className="text-destructive text-xs mt-2">{error[item.id]}</p>
                  )}

                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[11px] text-muted-foreground">
                      {(texts[item.id] || "").length}/1000 ký tự
                    </span>
                    <Button
                      size="sm"
                      className="px-5 text-xs"
                      disabled={submittingId === item.id}
                      onClick={() => void submit(item)}
                    >
                      {submittingId === item.id ? "Đang gửi..." : "Gửi đánh giá"}
                    </Button>
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {!items.length && (
          <div className="py-16 text-center border border-dashed border-border p-6">
            <CheckCircle2 className="size-10 stroke-1 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium text-base mb-1">Chưa có sản phẩm cần đánh giá</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Khi các đơn hàng của bạn chuyển sang trạng thái <strong>Hoàn tất</strong>, các sản phẩm sẽ hiển thị tại đây để bạn chia sẻ cảm nhận.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
