import { Printer, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { money } from "@/lib/store";
import type { Order } from "@/services/types";

interface InvoiceModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceModal({ order, open, onOpenChange }: InvoiceModalProps) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const lines = [
      ["HÓA ĐƠN BÁN HÀNG — MỘC FASHION STUDIO"],
      ["Mã đơn hàng", `#${order.id}`],
      ["Ngày đặt", order.date],
      ["Khách hàng", order.customer],
      ["Số điện thoại", order.phone],
      ["Địa chỉ nhận", `"${order.address.replace(/"/g, '""')}"`],
      ["Trạng thái", order.status],
      [],
      ["Chi tiết sản phẩm", order.items],
      [],
      ["Tổng tiền thanh toán (VNĐ)", order.total],
      ["Ghi chú", "Đã bao gồm VAT"],
    ];

    const csvContent = "\uFEFF" + lines.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `HoaDon-MOC-${order.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border border-border bg-background sm:rounded-none">
        {/* THANH THAO TÁC (Ẩn khi in) */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-secondary/50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-semibold text-accent">Hóa đơn điện tử</span>
            <span className="text-xs text-muted-foreground">#{order.id.slice(0, 12)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={handleExportCsv}>
              <Download className="size-3.5" /> Xuất Excel/CSV
            </Button>
            <Button size="sm" className="gap-1.5 text-xs h-8 bg-primary text-primary-foreground" onClick={handlePrint}>
              <Printer className="size-3.5" /> In hóa đơn / Lưu PDF
            </Button>
          </div>
        </div>

        {/* NỘI DUNG HÓA ĐƠN (Phần được in) */}
        <div id="printable-invoice" className="p-8 md:p-10 font-sans text-foreground bg-white text-black">
          {/* HEADER SHOP */}
          <div className="flex justify-between items-start border-b pb-6 mb-6">
            <div>
              <DialogTitle className="editorial-title text-3xl font-serif tracking-tight text-neutral-900">MỘC</DialogTitle>
              <p className="text-[11px] uppercase tracking-widest text-neutral-500 font-medium mt-0.5">Thời trang tối giản cho mỗi ngày</p>
              <div className="text-xs text-neutral-600 mt-3 space-y-0.5 leading-relaxed">
                <p>📍 28 Tràng Tiền, Q. Hoàn Kiếm, TP. Hà Nội</p>
                <p>📞 Hotline: 1900 6868 — ✉️ cskh@mocstore.vn</p>
                <p>🌐 Website: www.mocstore.vn</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold uppercase tracking-wider text-neutral-800">HÓA ĐƠN BÁN HÀNG</h2>
              <p className="text-[11px] font-mono text-neutral-500 mt-1">SỐ: #{order.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-xs text-neutral-600 mt-2">Ngày lập: {order.date.split("-").reverse().join("/")}</p>
              <span className="inline-block mt-2 px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded bg-neutral-100 text-neutral-800 border border-neutral-300">
                {order.status}
              </span>
            </div>
          </div>

          {/* THÔNG TIN KHÁCH HÀNG */}
          <div className="bg-neutral-50 p-4 rounded border border-neutral-200 mb-6 text-xs leading-relaxed grid sm:grid-cols-2 gap-4">
            <div>
              <p className="font-semibold text-neutral-900 mb-1">THÔNG TIN KHÁCH HÀNG:</p>
              <p><span className="text-neutral-500">Khách hàng:</span> <strong className="text-neutral-800">{order.customer}</strong></p>
              <p><span className="text-neutral-500">Điện thoại:</span> <strong className="text-neutral-800">{order.phone}</strong></p>
            </div>
            <div>
              <p className="font-semibold text-neutral-900 mb-1">ĐỊA CHỈ GIAO HÀNG:</p>
              <p className="text-neutral-700">{order.address}</p>
              <p className="mt-1"><span className="text-neutral-500">Hình thức thanh toán:</span> Thanh toán khi nhận hàng (COD)</p>
            </div>
          </div>

          {/* BẢNG SẢN PHẨM */}
          <table className="w-full text-xs text-left mb-6 border-collapse">
            <thead>
              <tr className="border-b-2 border-neutral-800 bg-neutral-100 text-neutral-800 uppercase font-semibold">
                <th className="py-2.5 px-3 w-12 text-center">STT</th>
                <th className="py-2.5 px-3">Tên sản phẩm / Quy cách</th>
                <th className="py-2.5 px-3 text-right">Tổng tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              <tr>
                <td className="py-3 px-3 text-center text-neutral-500">01</td>
                <td className="py-3 px-3">
                  <p className="font-semibold text-neutral-900">{order.items}</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Sản phẩm chính hãng thương hiệu MỘC</p>
                </td>
                <td className="py-3 px-3 text-right font-medium text-neutral-900">
                  {money(order.total)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* BẢNG TÍNH TIỀN */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-1.5 text-xs text-neutral-700">
              <div className="flex justify-between py-1 border-b border-neutral-200">
                <span>Tạm tính hàng hóa:</span>
                <span className="font-medium text-neutral-900">{money(order.total)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-200">
                <span>Phí vận chuyển:</span>
                <span className="text-emerald-700 font-medium">Miễn phí (0 ₫)</span>
              </div>
              <div className="flex justify-between py-2 text-sm font-bold border-b-2 border-neutral-900 text-neutral-900">
                <span>TỔNG CỘNG:</span>
                <span className="text-base font-semibold">{money(order.total)}</span>
              </div>
              <p className="text-[10px] text-neutral-500 italic text-right pt-1">(Đã bao gồm thuế GTGT)</p>
            </div>
          </div>

          {/* CHỮ KÝ */}
          <div className="grid grid-cols-2 text-center text-xs mt-10 pt-4 border-t border-dashed border-neutral-300">
            <div>
              <p className="font-semibold text-neutral-800">NGƯỜI MUA HÀNG</p>
              <p className="text-[10px] text-neutral-400 italic">(Ký, ghi rõ họ tên)</p>
              <div className="h-16" />
              <p className="font-medium text-neutral-700">{order.customer}</p>
            </div>
            <div>
              <p className="font-semibold text-neutral-800">ĐẠI DIỆN CỬA HÀNG MỘC</p>
              <p className="text-[10px] text-neutral-400 italic">(Ký, đóng dấu điện tử)</p>
              <div className="h-16 flex items-center justify-center">
                <span className="text-[11px] font-mono text-emerald-800 border-2 border-emerald-700 px-3 py-1 rotate-[-6deg] uppercase font-bold rounded">
                  ĐÃ XÁC THỰC
                </span>
              </div>
              <p className="font-medium text-neutral-700">Bộ phận Kế toán & Vận hành</p>
            </div>
          </div>

          {/* LỜI CẢM ƠN */}
          <div className="text-center mt-8 pt-4 border-t text-[11px] text-neutral-500 italic">
            Cảm ơn quý khách đã tin chọn sản phẩm của MỘC! Nếu cần hỗ trợ đổi trả trong vòng 7 ngày, vui lòng liên hệ hotline 1900 6868.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
