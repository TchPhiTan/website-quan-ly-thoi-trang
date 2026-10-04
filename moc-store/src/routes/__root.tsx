import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { StoreShell } from "@/components/store-shell";
import { StoreProvider } from "@/lib/store";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[75vh] items-center justify-center bg-background px-6 py-20">
      <div className="max-w-lg text-center">
        <p className="text-accent text-[11px] uppercase tracking-[0.25em] font-semibold mb-2">
          MỤC NÀY KHÔNG TÌM THẤY / 404
        </p>
        <h1 className="editorial-title text-6xl md:text-8xl my-4 text-foreground">
          Trang không<br /><em>tồn tại.</em>
        </h1>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          Liên kết bạn vừa truy cập có thể đã hết hạn, bị thay đổi đường dẫn hoặc sản phẩm tạm thời không còn khả dụng tại MỘC.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to="/"
            search={{ category: "" }}
            className="inline-flex items-center justify-center bg-primary text-primary-foreground px-6 py-3.5 text-xs font-semibold uppercase tracking-widest hover:bg-primary/90 transition-colors"
          >
            Quay lại trang chủ →
          </Link>
          <Link
            to="/"
            search={{ category: "Nữ" }}
            className="inline-flex items-center justify-center border border-border bg-background text-foreground px-6 py-3.5 text-xs font-semibold uppercase tracking-widest hover:bg-secondary transition-colors"
          >
            Khám phá bộ sưu tập
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-6 py-20">
      <div className="max-w-md text-center">
        <p className="text-destructive text-[11px] uppercase tracking-[0.25em] font-semibold mb-2">
          HỆ THỐNG / GIÁN ĐOẠN
        </p>
        <h1 className="editorial-title text-4xl sm:text-5xl font-medium my-3 text-foreground">
          Trang chưa tải được
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Đã có gián đoạn trong quá trình xử lý yêu cầu. Bạn có thể thử tải lại hoặc quay về trang chủ.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center bg-primary text-primary-foreground px-5 py-3 text-xs font-semibold uppercase tracking-widest hover:bg-primary/90 transition-colors"
          >
            Thử tải lại
          </button>
          <Link
            to="/"
            search={{ category: "" }}
            className="inline-flex items-center justify-center border border-border bg-background text-foreground px-5 py-3 text-xs font-semibold uppercase tracking-widest hover:bg-secondary transition-colors"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MỘC — Thời trang tối giản" },
      { name: "description", content: "Khám phá thời trang tối giản dành cho bạn tại MỘC." },
      { property: "og:title", content: "MỘC — Thời trang tối giản" },
      { property: "og:description", content: "Khám phá thời trang tối giản dành cho bạn tại MỘC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Cormorant+Garamond:wght@400;500;600&display=swap" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const isAdmin = useRouterState({ select: (s) => s.location.pathname.startsWith("/admin") });

  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        {isAdmin ? <Outlet /> : <StoreShell />}
      </StoreProvider>
    </QueryClientProvider>
  );
}
