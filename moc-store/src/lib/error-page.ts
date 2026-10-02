export function renderErrorPage(): string {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Đã xảy ra lỗi — MỘC</title></head><body style="font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;text-align:center"><div><h1 style="font-size:20px">Trang chưa tải được</h1><p style="color:#666;font-size:14px">Đã có lỗi ở phía máy chủ. Vui lòng thử tải lại trang.</p><a href="/" style="font-size:14px">Về trang chủ</a></div></body></html>`;
}
