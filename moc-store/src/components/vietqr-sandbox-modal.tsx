import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { money, useStore } from "@/lib/store";
import {
  CreditCard,
  QrCode,
  Smartphone,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Building2,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export type BankingOrderData = {
  id: string;
  amount: number;
};

type Props = {
  order: BankingOrderData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentConfirmed?: (orderId: string) => void;
};

export function VietQrSandboxModal({ order, open, onOpenChange, onPaymentConfirmed }: Props) {
  const store = useStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"qr" | "simulator">("qr");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Simulator states
  const [simState, setSimState] = useState<"ready" | "processing" | "success" | "failed">("ready");
  const [txCode, setTxCode] = useState("");
  const [txTime, setTxTime] = useState("");

  useEffect(() => {
    if (open) {
      setSimState("ready");
      const code = `FT26${Math.floor(10000000 + Math.random() * 90000000)}`;
      setTxCode(code);
      setTxTime(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " " + new Date().toLocaleDateString("vi-VN"));
    }
  }, [open, order?.id]);

  if (!order) return null;

  const orderShortId = order.id.slice(0, 8);
  const transferContent = `MOC ${orderShortId}`;
  const bankAccount = "0901234567";
  const bankName = "MB Bank (Ngân hàng Quân Đội)";
  const accountHolder = "MOC FASHION";
  const qrUrl = `https://img.vietqr.io/image/MB-${bankAccount}-compact2.png?amount=${order.amount}&addInfo=MOC%20${orderShortId}&accountName=${encodeURIComponent(accountHolder)}`;

  const handleCopy = (key: string, value: string) => {
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(value);
      setCopiedKey(key);
      store.notify(`Đã sao chép: ${value}`);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleSimulatePayment = () => {
    setSimState("processing");
    setTimeout(() => {
      setSimState("success");
      store.notify(`Đã xác thực giao dịch chuyển khoản VietQR cho đơn #${orderShortId}!`);
      if (onPaymentConfirmed) {
        onPaymentConfirmed(order.id);
      }
    }, 1300);
  };

  const handleSimulateFailure = () => {
    setSimState("processing");
    setTimeout(() => {
      setSimState("failed");
    }, 1000);
  };

  const handleDone = () => {
    onOpenChange(false);
    void navigate({ to: "/account/orders" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-card text-card-foreground border-border shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="bg-primary/5 px-6 pt-6 pb-4 border-b border-border/80">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent shrink-0">
              <CreditCard className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                Thanh toán Chuyển khoản (VietQR)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                Đơn hàng <span className="font-mono font-medium text-foreground">#{order.id}</span>
              </DialogDescription>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider block">Cần thanh toán</span>
              <span className="text-base font-bold text-accent">{money(order.amount)}</span>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-muted/70 p-1 rounded-lg mt-4 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("qr")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md transition-all ${
                activeTab === "qr"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <QrCode className="size-3.5" />
              Mã VietQR Thực tế
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("simulator")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md transition-all ${
                activeTab === "simulator"
                  ? "bg-accent text-accent-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="size-3.5" />
              Sandbox Giả lập Quét mã
            </button>
          </div>
        </div>

        {/* Tab 1: Real VietQR Mode */}
        {activeTab === "qr" && (
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="bg-white p-3.5 rounded-xl border border-border shadow-xs inline-block mx-auto w-full text-center">
              <img
                src={qrUrl}
                alt="Mã VietQR Chuyển khoản"
                className="w-56 h-auto mx-auto object-contain transition-transform hover:scale-102"
              />
              <p className="text-[11px] text-zinc-500 mt-2 font-mono">
                Quét bằng App Ngân hàng hoặc Ví MoMo/ZaloPay
              </p>
            </div>

            {/* Thông tin tài khoản */}
            <div className="p-3.5 bg-secondary/50 rounded-xl text-xs space-y-2 border border-border/70">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Ngân hàng:</span>
                <span className="font-semibold text-right">{bankName}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Số tài khoản:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-sm">{bankAccount}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy("account", bankAccount)}
                    className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground"
                    title="Sao chép số tài khoản"
                  >
                    {copiedKey === "account" ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Chủ tài khoản:</span>
                <span className="font-semibold uppercase tracking-wide">{accountHolder}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Số tiền:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-accent text-sm">{money(order.amount)}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy("amount", String(order.amount))}
                    className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground"
                    title="Sao chép số tiền"
                  >
                    {copiedKey === "amount" ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Nội dung CK:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-foreground bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                    {transferContent}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy("content", transferContent)}
                    className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground"
                    title="Sao chép nội dung"
                  >
                    {copiedKey === "content" ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Hướng dẫn Sandbox */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-300 rounded-xl text-xs space-y-1">
              <div className="font-medium flex items-center gap-1.5">
                <span>💡 Bạn muốn thực hành test chuyển khoản mà không cần nộp tiền thật?</span>
              </div>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                Hãy bấm nút <strong>Sandbox Giả lập Quét mã</strong> bên trên hoặc bấm nút dưới đây để trải nghiệm quy trình quét QR và xác nhận giao dịch tự động.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                type="button"
                className="w-full h-11 text-xs font-semibold gap-2"
                onClick={() => setActiveTab("simulator")}
              >
                <Sparkles className="size-4" />
                Mở Sandbox Thực hành Quét mã ngay
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-9 text-xs"
                onClick={() => {
                  store.notify("Đã ghi nhận đơn hàng. Bạn có thể chuyển khoản sau.");
                  handleDone();
                }}
              >
                Để sau / Xem đơn hàng của tôi
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Interactive Sandbox Simulator */}
        {activeTab === "simulator" && (
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Mock Mobile Phone Simulator */}
            <div className="border border-border/80 bg-zinc-950 text-zinc-100 rounded-2xl p-4 shadow-inner relative overflow-hidden">
              {/* Phone Status Bar */}
              <div className="flex justify-between items-center text-[10px] text-zinc-400 pb-3 border-b border-zinc-800/80 mb-3">
                <span className="font-semibold font-mono">09:41</span>
                <span className="font-medium flex items-center gap-1">
                  <Building2 className="size-3 text-sky-400" />
                  MB Bank Mobile Sandbox
                </span>
                <span className="font-mono">5G 100%</span>
              </div>

              {/* State: Ready to Scan / Identified */}
              {simState === "ready" && (
                <div className="space-y-4">
                  {/* Scanner Camera Simulation Viewport */}
                  <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700/60 flex items-center justify-center">
                    {/* Background faint QR */}
                    <img
                      src={qrUrl}
                      alt="Camera view"
                      className="w-36 h-auto opacity-35 blur-[0.5px] select-none pointer-events-none"
                    />

                    {/* Viewfinder reticle corners */}
                    <div className="absolute inset-4 pointer-events-none">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-md" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-md" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-md" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-md" />
                    </div>

                    {/* Laser Scan Beam */}
                    <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse" />

                    <div className="absolute top-2 inset-x-0 text-center">
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 backdrop-blur-xs">
                        <Check className="size-3" /> Đã nhận diện mã VietQR
                      </span>
                    </div>
                  </div>

                  {/* Parsed VietQR Info Card */}
                  <div className="bg-zinc-900/90 rounded-xl p-3 border border-zinc-800 text-xs space-y-2">
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Đơn vị nhận:</span>
                      <span className="font-semibold text-zinc-100 uppercase">{accountHolder}</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Tài khoản:</span>
                      <span className="font-mono text-zinc-100">{bankAccount} (MB Bank)</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Số tiền:</span>
                      <span className="text-sm font-bold text-emerald-400">{money(order.amount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Nội dung:</span>
                      <span className="font-mono text-amber-300">{transferContent}</span>
                    </div>
                    <div className="pt-1.5 border-t border-zinc-800 text-[11px] text-zinc-400 flex justify-between items-center">
                      <span>Nguồn tiền test:</span>
                      <span className="text-zinc-300">Tài khoản Sandbox Demo (Số dư 50tr)</span>
                    </div>
                  </div>

                  {/* Simulation Actions */}
                  <div className="space-y-2">
                    <Button
                      type="button"
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md"
                      onClick={handleSimulatePayment}
                    >
                      🚀 Xác nhận chuyển khoản (Sandbox Test)
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full h-8 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                      onClick={handleSimulateFailure}
                    >
                      Thử nghiệm lỗi giao dịch (Số dư không đủ / Lỗi mạng)
                    </Button>
                  </div>
                </div>
              )}

              {/* State: Processing Animation */}
              {simState === "processing" && (
                <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-3">
                  <Loader2 className="size-10 text-emerald-400 animate-spin" />
                  <p className="font-medium text-sm text-zinc-200">Đang xử lý giao dịch Napas247...</p>
                  <p className="text-xs text-zinc-400 max-w-xs">
                    Hệ thống đang kết nối ngân hàng để xác thực số tiền {money(order.amount)} và nội dung {transferContent}.
                  </p>
                </div>
              )}

              {/* State: Success Receipt */}
              {simState === "success" && (
                <div className="py-4 space-y-4 text-center">
                  <div className="size-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-emerald-400">CHUYỂN KHOẢN THÀNH CÔNG</h3>
                    <p className="text-2xl font-black text-white mt-1">-{money(order.amount)}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{txTime}</p>
                  </div>

                  {/* Receipt details */}
                  <div className="bg-zinc-900 rounded-xl p-3 text-left text-xs space-y-2 border border-zinc-800">
                    <div className="flex justify-between text-zinc-400">
                      <span>Mã giao dịch (FT):</span>
                      <span className="font-mono text-zinc-200 font-semibold">{txCode}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Người thụ hưởng:</span>
                      <span className="font-semibold text-zinc-200">{accountHolder}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Nội dung chuyển:</span>
                      <span className="font-mono text-emerald-300">{transferContent}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Trạng thái đơn:</span>
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <ShieldCheck className="size-3.5" /> Đã xác nhận thanh toán
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Button
                      type="button"
                      className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                      onClick={handleDone}
                    >
                      Hoàn tất & Xem đơn hàng của tôi
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-8 text-[11px] border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      onClick={() => setSimState("ready")}
                    >
                      Thực hành lại lần nữa
                    </Button>
                  </div>
                </div>
              )}

              {/* State: Failure Test */}
              {simState === "failed" && (
                <div className="py-6 space-y-4 text-center">
                  <div className="size-14 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 mx-auto flex items-center justify-center">
                    <XCircle className="size-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-rose-400">GIAO DỊCH KHÔNG THÀNH CÔNG</h3>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                      Mô phỏng lỗi: Số dư tài khoản không đủ hoặc kết nối đến ngân hàng thụ hưởng bị gián đoạn.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Button
                      type="button"
                      className="w-full h-10 bg-zinc-800 hover:bg-zinc-700 text-white text-xs gap-1.5"
                      onClick={() => setSimState("ready")}
                    >
                      <RefreshCw className="size-3.5" /> Thử lại Sandbox
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full h-8 text-[11px] text-zinc-400 hover:text-zinc-200"
                      onClick={() => setActiveTab("qr")}
                    >
                      Quay lại mã VietQR thực tế
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
