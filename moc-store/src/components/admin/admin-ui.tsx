import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function PageHead({ eyebrow, title, desc, action }: { eyebrow: string; title: string; desc?: string | undefined; action?: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-4 mb-8"><div><p className="text-accent text-[11px] tracking-widest uppercase mb-2">{eyebrow}</p><h1 className="editorial-title text-4xl md:text-5xl">{title}</h1>{desc && <p className="text-sm text-muted-foreground mt-3">{desc}</p>}</div>{action}</div>;
}
const tones = { ok: "bg-emerald-50 text-emerald-700", warn: "bg-amber-50 text-amber-700", bad: "bg-red-50 text-red-700", muted: "bg-secondary text-muted-foreground" };
export function Badge({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-block px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${tones[tone]}`}>{children}</span>;
}
export function Select({ value, onChange, options, label, disabled }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label?: string | undefined; disabled?: boolean | undefined }) {
  return <select aria-label={label} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className="input-field bg-card h-10 w-auto min-w-40 disabled:opacity-50">{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
}
export const opts = (arr: string[]) => arr.map(x => ({ value: x, label: x }));
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-xs font-medium">{label}<span className="block mt-2">{children}</span></label>; }
export function Modal({ open, onOpenChange, title, desc, children, className }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; desc?: string | undefined; children: ReactNode; className?: string | undefined }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className={`max-h-[90vh] overflow-y-auto p-7 ${className ?? "max-w-lg"}`}><DialogTitle className="text-xl">{title}</DialogTitle><DialogDescription>{desc ?? "Thông tin chi tiết"}</DialogDescription>{children}</DialogContent></Dialog>;
}
export function Table({ children }: { children: ReactNode }) { return <div className="border border-border overflow-x-auto"><table className="w-full text-sm">{children}</table></div>; }
export const th = "text-left text-[11px] uppercase tracking-widest text-muted-foreground font-medium px-4 py-3 border-b bg-secondary whitespace-nowrap";
export const td = "px-4 py-3 border-b align-middle";
export function Bars({ data, unit }: { data: [string, number][]; unit: string }) {
  const max = Math.max(1, ...data.map(d => d[1]));
  return <div className="flex items-end gap-2 h-56 overflow-x-auto pt-6">{data.map(([label, v]) => <div key={label} className="flex-1 min-w-8 flex flex-col items-center justify-end h-full gap-2"><span className="text-[10px] text-muted-foreground">{v}{unit}</span><div className="w-full bg-accent" style={{ height: `${Math.max(2, (v / max) * 80)}%` }} /><span className="text-[10px] text-muted-foreground whitespace-nowrap">{label}</span></div>)}</div>;
}
