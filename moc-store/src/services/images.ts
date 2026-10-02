import whiteShirt from "@/assets/look-white-shirt.jpg";
import blazer from "@/assets/look-blazer.jpg";
import dress from "@/assets/look-dress.jpg";
import denim from "@/assets/look-denim.jpg";
import type { Swatch } from "./types";

// Trong DB chỉ lưu "khóa ảnh" (hoặc data URL do admin tải lên), URL ảnh build có hash nên không lưu.
const assets: Record<string, string> = { "white-shirt": whiteShirt, blazer, dress, denim };
export const imageSrc = (key: string) => assets[key] ?? key;
export const imageKey = (src: string) => Object.entries(assets).find(([, v]) => v === src)?.[0] ?? src;

const swatches: Record<string, string> = { "trắng": "swatch-ivory", "trắng kem": "swatch-ivory", "đen": "swatch-dark", "than chì": "swatch-dark", "xám": "swatch-gray", "xanh sage": "swatch-sage", "đen wash": "swatch-denim", "xanh đậm": "swatch-blue" };
export const swatchFor = (name: string): Swatch => ({ name, className: swatches[name.toLowerCase()] ?? "swatch-gray" });
