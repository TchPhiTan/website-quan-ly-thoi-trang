import { createFileRoute } from "@tanstack/react-router";
import { AdminProvider } from "@/lib/admin-data";
import { AdminLayout } from "@/components/admin/admin-layout";
export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Quản trị — MỘC" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminProvider><AdminLayout /></AdminProvider>,
});
