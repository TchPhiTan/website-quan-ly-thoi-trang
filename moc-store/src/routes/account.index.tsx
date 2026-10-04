import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Lock, Pencil, ShieldCheck, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { profileService, type UserProfile } from "@/services";

export const Route = createFileRoute("/account/")({
  head: () => ({
    meta: [
      { title: "Thông tin tài khoản — MỘC" },
      { name: "description", content: "Xem và quản lý hồ sơ cá nhân và bảo mật tài khoản MỘC." },
      { property: "og:title", content: "Thông tin tài khoản — MỘC" },
      { property: "og:description", content: "Quản lý thông tin cá nhân và đăng nhập của bạn." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountInfo,
});

function AccountInfo() {
  const store = useStore();

  const [profile, setProfile] = useState<UserProfile>({
    id: "user-1",
    full_name: "Nguyễn Thị Minh Anh",
    email: "minhanh.nguyen@example.com",
    phone: "090 123 4567",
    dob: "1998-06-15",
  });

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [infoError, setInfoError] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!store.signedIn) return;
    void profileService
      .get()
      .then(data => {
        if (data) {
          setProfile(prev => ({
            ...prev,
            ...data,
            dob: data.dob ? data.dob.slice(0, 10) : prev.dob,
          }));
        }
      })
      .catch(() => {});
  }, [store.signedIn]);

  // Lưu thông tin cá nhân
  const handleSaveInfo = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const full_name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").replace(/\s/g, "");
    const dob = String(data.get("birthday") || "");

    if (!full_name) {
      setInfoError("Họ và tên không được để trống.");
      return;
    }
    if (!/^0\d{9}$/.test(phone)) {
      setInfoError("Số điện thoại cần có 10 chữ số và bắt đầu bằng số 0.");
      return;
    }

    setInfoError("");
    setLoading(true);

    try {
      if (store.signedIn) {
        await profileService.update({ full_name, phone, dob });
      }
      setProfile(prev => ({ ...prev, full_name, phone, dob }));
      setIsEditingInfo(false);
      store.notify("Cập nhật thông tin cá nhân thành công");
    } catch (err) {
      setInfoError((err as Error).message || "Không thể cập nhật thông tin");
    } finally {
      setLoading(false);
    }
  };

  // Đổi mật khẩu
  const handleChangePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const old_password = String(data.get("old_password") || "");
    const new_password = String(data.get("new_password") || "");
    const confirm_password = String(data.get("confirm_password") || "");

    if (!old_password || !new_password) {
      setPwdError("Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.");
      return;
    }
    if (new_password.length < 6) {
      setPwdError("Mật khẩu mới phải có tối thiểu 6 ký tự.");
      return;
    }
    if (new_password !== confirm_password) {
      setPwdError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setPwdError("");
    setLoading(true);

    try {
      if (store.signedIn) {
        await profileService.changePassword({ old_password, new_password });
      }
      setIsChangingPassword(false);
      store.notify("Đổi mật khẩu thành công");
    } catch (err) {
      setPwdError((err as Error).message || "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "Chưa cập nhật";
    const parts = isoString.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return isoString;
  };

  return (
    <>
      <h2 className="text-2xl font-medium mb-2">Thông tin tài khoản</h2>
      <p className="text-sm text-muted-foreground mb-9">Quản lý thông tin cá nhân và bảo mật tài khoản.</p>

      <div className="grid lg:grid-cols-2 gap-7">
        {/* CARD 1: THÔNG TIN CÁ NHÂN */}
        <div className="border border-border p-6 bg-card transition-all">
          <div className="flex items-center justify-between border-b pb-4 mb-5">
            <div>
              <h3 className="font-semibold text-base">Thông tin cá nhân</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Thông tin sử dụng để nhận hàng và liên hệ</p>
            </div>
            {!isEditingInfo && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={() => {
                  setInfoError("");
                  setIsEditingInfo(true);
                }}
              >
                <Pencil className="size-3.5" /> Thay đổi
              </Button>
            )}
          </div>

          {!isEditingInfo ? (
            /* CHẾ ĐỘ XEM (VIEW MODE) */
            <div className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Họ và tên</span>
                <span className="font-medium text-foreground">{profile.full_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Số điện thoại</span>
                <span className="font-medium text-foreground">{profile.phone || "Chưa cập nhật"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Ngày sinh</span>
                <span className="font-medium text-foreground">{formatDate(profile.dob)}</span>
              </div>
              <div className="pt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                <UserCheck className="size-4 text-emerald-600" /> Hồ sơ thành viên MỘC
              </div>
            </div>
          ) : (
            /* CHẾ ĐỘ CHỈNH SỬA (EDIT MODE) */
            <form onSubmit={handleSaveInfo} className="space-y-4">
              <label className="block text-xs font-medium">
                Họ và tên <span className="text-destructive">*</span>
                <Input name="name" defaultValue={profile.full_name} maxLength={100} required className="mt-1.5 h-10" />
              </label>
              <label className="block text-xs font-medium">
                Số điện thoại <span className="text-destructive">*</span>
                <Input name="phone" defaultValue={profile.phone || ""} required className="mt-1.5 h-10" />
              </label>
              <label className="block text-xs font-medium">
                Ngày sinh
                <Input type="date" name="birthday" defaultValue={profile.dob || ""} className="mt-1.5 h-10" />
              </label>

              {infoError && <p className="text-destructive text-xs">{infoError}</p>}

              <div className="flex gap-2 pt-2">
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInfoError("");
                    setIsEditingInfo(false);
                  }}
                >
                  Hủy
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* CARD 2: ĐĂNG NHẬP & BẢO MẬT */}
        <div className="border border-border p-6 bg-card transition-all">
          <div className="flex items-center justify-between border-b pb-4 mb-5">
            <div>
              <h3 className="font-semibold text-base">Đăng nhập & Bảo mật</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Bảo vệ thông tin tài khoản và mật khẩu</p>
            </div>
            {!isChangingPassword && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={() => {
                  setPwdError("");
                  setIsChangingPassword(true);
                }}
              >
                <Lock className="size-3.5" /> Đổi mật khẩu
              </Button>
            )}
          </div>

          {!isChangingPassword ? (
            /* CHẾ ĐỘ XEM (VIEW MODE) */
            <div className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Email đăng nhập</span>
                <span className="font-medium text-foreground">{profile.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Mật khẩu</span>
                <span className="font-mono text-xs tracking-widest text-muted-foreground">••••••••••••</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Bảo mật tài khoản</span>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <ShieldCheck className="size-4" /> Đã kích hoạt
                </span>
              </div>
              <div className="pt-2 text-xs text-muted-foreground">
                Để bảo vệ tài khoản, bạn nên đổi mật khẩu định kỳ 6 tháng một lần.
              </div>
            </div>
          ) : (
            /* CHẾ ĐỘ ĐỔI MẬT KHẨU (EDIT PASSWORD MODE) */
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="text-xs text-muted-foreground pb-1">
                Tài khoản: <strong className="text-foreground">{profile.email}</strong>
              </div>
              <label className="block text-xs font-medium">
                Mật khẩu hiện tại <span className="text-destructive">*</span>
                <Input
                  type="password"
                  name="old_password"
                  placeholder="Nhập mật khẩu đang dùng"
                  required
                  className="mt-1.5 h-10"
                />
              </label>
              <label className="block text-xs font-medium">
                Mật khẩu mới <span className="text-destructive">*</span>
                <Input
                  type="password"
                  name="new_password"
                  minLength={6}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                  className="mt-1.5 h-10"
                />
              </label>
              <label className="block text-xs font-medium">
                Xác nhận mật khẩu mới <span className="text-destructive">*</span>
                <Input
                  type="password"
                  name="confirm_password"
                  minLength={6}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                  className="mt-1.5 h-10"
                />
              </label>

              {pwdError && <p className="text-destructive text-xs">{pwdError}</p>}

              <div className="flex gap-2 pt-2">
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPwdError("");
                    setIsChangingPassword(false);
                  }}
                >
                  Hủy
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
