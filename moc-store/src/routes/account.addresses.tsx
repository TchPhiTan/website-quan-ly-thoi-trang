import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { MapPin, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { useAddresses } from "@/services/hooks";
import { addressService, type UserAddress } from "@/services";

export const Route = createFileRoute("/account/addresses")({
  head: () => ({
    meta: [
      { title: "Sổ địa chỉ — MỘC" },
      { name: "description", content: "Quản lý địa chỉ giao hàng của bạn tại MỘC." },
      { property: "og:title", content: "Sổ địa chỉ — MỘC" },
      { property: "og:description", content: "Lưu và cập nhật địa chỉ giao hàng thuận tiện." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Addresses,
});

function Addresses() {
  const store = useStore();
  const [refreshToken, setRefreshToken] = useState(0);
  const { addresses, reload, loading } = useAddresses(refreshToken);

  const [editing, setEditing] = useState<UserAddress | null>(null);
  const [open, setOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAdd = () => {
    setEditing(null);
    setError("");
    setOpen(true);
  };

  const handleOpenEdit = (addr: UserAddress) => {
    setEditing(addr);
    setError("");
    setOpen(true);
  };

  const handleSetDefault = async (addr: UserAddress) => {
    try {
      await addressService.update(addr.id, { is_default: true });
      store.notify("Đã đặt làm địa chỉ mặc định");
      setRefreshToken(r => r + 1);
    } catch (err) {
      store.notify((err as Error).message || "Không thể cập nhật địa chỉ mặc định");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await addressService.remove(id);
      store.notify("Đã xóa địa chỉ thành công");
      setDeletingId(null);
      setRefreshToken(r => r + 1);
    } catch (err) {
      store.notify((err as Error).message || "Không thể xóa địa chỉ");
    }
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const phone = String(data.get("phone") || "").replace(/\s/g, "");
    if (!/^0\d{9}$/.test(phone)) {
      setError("Vui lòng nhập số điện thoại hợp lệ gồm 10 chữ số (bắt đầu bằng 0).");
      return;
    }

    const full_name = String(data.get("full_name") || "").trim();
    const line1 = String(data.get("line1") || "").trim();
    const ward = String(data.get("ward") || "").trim();
    const city = String(data.get("city") || "").trim();
    const is_default = Boolean(data.get("is_default"));

    if (!full_name || !line1 || !city) {
      setError("Vui lòng điền đủ họ tên, địa chỉ chi tiết và tỉnh / thành phố.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (editing) {
        await addressService.update(editing.id, {
          full_name,
          phone,
          line1,
          ward: ward || undefined,
          city,
          is_default,
        });
        store.notify("Đã cập nhật địa chỉ thành công");
      } else {
        await addressService.create({
          full_name,
          phone,
          line1,
          ward: ward || undefined,
          city,
          is_default,
        });
        store.notify("Đã thêm địa chỉ mới thành công");
      }

      setOpen(false);
      setRefreshToken(r => r + 1);
    } catch (err) {
      setError((err as Error).message || "Lỗi khi lưu địa chỉ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!store.signedIn) {
    return (
      <div className="text-center py-16 border border-dashed border-border p-8">
        <MapPin className="size-12 stroke-1 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Vui lòng đăng nhập</h3>
        <p className="text-sm text-muted-foreground mb-6">Đăng nhập tài khoản để quản lý và đồng bộ sổ địa chỉ nhận hàng của bạn.</p>
        <Button onClick={() => store.setAuthOpen(true)}>Đăng nhập ngay</Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-start gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-medium mb-2">Sổ địa chỉ</h2>
          <p className="text-sm text-muted-foreground">Quản lý và đồng bộ địa chỉ nhận hàng của bạn với hệ thống MỘC.</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Thêm địa chỉ mới</span>
          <span className="sm:hidden">Thêm mới</span>
        </Button>
      </div>

      {loading && addresses.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">Đang tải sổ địa chỉ...</div>
      )}

      {!loading && addresses.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border p-8">
          <MapPin className="size-12 stroke-1 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Chưa có địa chỉ nào</h3>
          <p className="text-sm text-muted-foreground mb-6">Thêm địa chỉ giao hàng để thanh toán nhanh hơn trong những lần mua sắm tiếp theo.</p>
          <Button onClick={handleOpenAdd}>
            <Plus className="size-4" /> Thêm địa chỉ đầu tiên
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {addresses.map(a => (
          <div
            key={a.id}
            className={`text-left border p-6 transition-all ${
              a.is_default ? "border-foreground bg-accent/5" : "border-border hover:border-muted-foreground"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className={`size-5 ${a.is_default ? "text-accent" : "text-muted-foreground"}`} />
                <span className="font-semibold text-base">{a.full_name}</span>
              </div>
              {a.is_default ? (
                <span className="text-[10px] uppercase font-semibold tracking-widest bg-accent text-accent-foreground px-2.5 py-1">
                  Mặc định
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => handleSetDefault(a)}
                >
                  <CheckCircle2 className="size-3.5 mr-1" /> Đặt làm mặc định
                </Button>
              )}
            </div>

            <p className="text-sm text-muted-foreground mt-3 font-mono">{a.phone}</p>
            <p className="text-sm leading-6 mt-2 text-foreground/90">
              {a.line1}{a.ward ? `, ${a.ward}` : ""}{a.city ? `, ${a.city}` : ""}
            </p>

            <div className="flex items-center justify-between pt-5 mt-5 border-t border-border/60 text-xs">
              <button
                type="button"
                onClick={() => handleOpenEdit(a)}
                className="text-accent hover:underline font-medium"
              >
                Chỉnh sửa →
              </button>
              <button
                type="button"
                onClick={() => setDeletingId(a.id)}
                className="text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                aria-label={`Xóa địa chỉ ${a.full_name}`}
              >
                <Trash2 className="size-3.5" /> Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Dialog Thêm/Sửa */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-7">
          <DialogTitle className="text-xl">
            {editing ? "Cập nhật địa chỉ" : "Thêm địa chỉ mới"}
          </DialogTitle>
          <DialogDescription>
            Điền thông tin nhận hàng của bạn để đơn hàng được giao chính xác.
          </DialogDescription>

          <form onSubmit={handleSave} className="space-y-4 mt-3">
            <label className="block text-xs font-medium">
              Họ và tên người nhận *
              <Input
                name="full_name"
                required
                maxLength={100}
                defaultValue={editing?.full_name || ""}
                placeholder="Ví dụ: Nguyễn Văn A"
                className="mt-2 h-11"
              />
            </label>

            <label className="block text-xs font-medium">
              Số điện thoại *
              <Input
                name="phone"
                required
                defaultValue={editing?.phone || ""}
                placeholder="Ví dụ: 0901234567"
                className="mt-2 h-11"
              />
            </label>

            <label className="block text-xs font-medium">
              Địa chỉ chi tiết (Số nhà, tên đường) *
              <Input
                name="line1"
                required
                maxLength={200}
                defaultValue={editing?.line1 || ""}
                placeholder="Ví dụ: 125 Nguyễn Đình Chiểu"
                className="mt-2 h-11"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium">
                Phường / Xã
                <Input
                  name="ward"
                  maxLength={80}
                  defaultValue={editing?.ward || ""}
                  placeholder="Ví dụ: Phường Xuân Hòa"
                  className="mt-2 h-11"
                />
              </label>

              <label className="block text-xs font-medium">
                Tỉnh / Thành phố *
                <Input
                  name="city"
                  required
                  maxLength={80}
                  defaultValue={editing?.city || ""}
                  placeholder="Ví dụ: TP. Hồ Chí Minh"
                  className="mt-2 h-11"
                />
              </label>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium select-none">
                <input
                  type="checkbox"
                  name="is_default"
                  defaultChecked={editing ? editing.is_default : addresses.length === 0}
                  className="accent-accent size-4"
                />
                Đặt làm địa chỉ nhận hàng mặc định
              </label>
            </div>

            {error && (
              <p className="text-destructive text-xs flex items-center gap-1.5">
                <AlertCircle className="size-4" /> {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Thêm địa chỉ"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Xóa */}
      <Dialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <DialogContent className="max-w-md p-6">
          <div className="flex items-center gap-3 text-destructive mb-2">
            <AlertCircle className="size-5" />
            <DialogTitle className="text-lg">Xác nhận xóa địa chỉ</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            Bạn có chắc chắn muốn xóa địa chỉ nhận hàng này khỏi sổ địa chỉ?
          </DialogDescription>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              Xóa địa chỉ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
