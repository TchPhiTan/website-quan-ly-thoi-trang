import { useMemo, useSyncExternalStore } from "react";
import { getDb, getSeed, subscribe, type Db } from "./mock-db";
import { imageSrc } from "./images";

// Lớp đọc dữ liệu cho giao diện. Khi nối API thật, đổi nội dung các hook này sang useQuery(service.list).
function useSlice<K extends keyof Db>(k: K): Db[K] { return useSyncExternalStore(subscribe, () => getDb()[k], () => getSeed()[k]); }
export function useProducts() { const raw = useSlice("products"); return useMemo(() => raw.map(p => ({ ...p, image: imageSrc(p.image) })), [raw]); }
export const useOrders = () => useSlice("orders");
export const usePromos = () => useSlice("promos");
export const useReviews = () => useSlice("reviews");
export const useUsers = () => useSlice("users");
export const useSessions = () => useSlice("sessions");
export const useStockLog = () => useSlice("stockLog");
