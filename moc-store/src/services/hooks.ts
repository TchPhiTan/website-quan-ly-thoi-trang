import { useEffect, useState, useSyncExternalStore } from "react";
import { getDb, getSeed, subscribe, type Db } from "./mock-db";
import { addressService, inventoryService, productService, promoService, reportService, reviewService, userService, type UserAddress } from "./index";
import { orderService } from "./index";
import { useStore } from "@/lib/store";

// Lớp đọc dữ liệu cho giao diện. Khi nối API thật, đổi nội dung các hook này sang useQuery(service.list).
function useSlice<K extends keyof Db>(k: K): Db[K] { return useSyncExternalStore(subscribe, () => getDb()[k], () => getSeed()[k]); }
export function useProducts(admin = false) {
	const [products, setProducts] = useState<Awaited<ReturnType<typeof productService.list>>>([]);
	useEffect(() => { let active = true; const load = admin ? productService.listAdmin() : productService.list(); void load.then(value => { if (active) setProducts(value); }).catch(error => console.error("Không tải được sản phẩm từ API", error)); return () => { active = false; }; }, [admin]);
	return products;
}
export function useInventory() {
	const [products, setProducts] = useState<Awaited<ReturnType<typeof inventoryService.list>>>([]);
	useEffect(() => { let active = true; void inventoryService.list().then(value => { if (active) setProducts(value); }).catch(error => console.error("Không tải được tồn kho từ API", error)); return () => { active = false; }; }, []);
	return products;
}
export function useReports(year: number, enabled = true) {
	const [overview, setOverview] = useState<Awaited<ReturnType<typeof reportService.overview>> | null>(null);
	const [revenue, setRevenue] = useState<Awaited<ReturnType<typeof reportService.revenue>> | null>(null);
	const [topProducts, setTopProducts] = useState<Awaited<ReturnType<typeof reportService.topProducts>>>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	useEffect(() => {
		let active = true;
		if (!enabled) { setOverview(null); setRevenue(null); setTopProducts([]); setLoading(false); setError(""); return () => { active = false; }; }
		setLoading(true); setError("");
		void Promise.all([reportService.overview(), reportService.revenue(year), reportService.topProducts()]).then(([nextOverview, nextRevenue, nextTopProducts]) => {
			if (!active) return;
			setOverview(nextOverview); setRevenue(nextRevenue); setTopProducts(nextTopProducts);
		}).catch(nextError => { if (active) setError(nextError instanceof Error ? nextError.message : "Không tải được báo cáo."); }).finally(() => { if (active) setLoading(false); });
		return () => { active = false; };
	}, [enabled, year]);
	return { overview, revenue, topProducts, loading, error };
}
export function useOrders(admin = false, refreshToken = 0) {
	const { signedIn } = useStore();
	const [orders, setOrders] = useState<Awaited<ReturnType<typeof orderService.list>>>([]);
	useEffect(() => {
		let active = true;
		if (!admin && !signedIn) { setOrders([]); return () => { active = false; }; }
		void orderService.list(admin).then(value => { if (active) setOrders(value); }).catch(error => console.error("Không tải được đơn hàng từ API", error));
		return () => { active = false; };
	}, [admin, refreshToken, signedIn]);
	return orders;
}
export function usePromos(admin = false, refreshToken = 0) {
	const [promos, setPromos] = useState<Awaited<ReturnType<typeof promoService.listAdmin>>>([]);
	const localPromos = useSlice("promos");
	useEffect(() => {
		let active = true;
		const load = admin ? promoService.listAdmin() : promoService.listPublic();
		void load.then(value => { if (active && value.length > 0) setPromos(value); }).catch(error => console.error("Không tải được khuyến mại từ API", error));
		return () => { active = false; };
	}, [admin, refreshToken]);
	return promos.length > 0 ? promos : (admin ? promos : localPromos);
}
export function useReviews(authenticated = false, admin = false) {
	const [reviews, setReviews] = useState<Awaited<ReturnType<typeof reviewService.list>>>([]);
	const reload = async () => setReviews(await reviewService.list(authenticated, admin));
	useEffect(() => { let active = true; void reviewService.list(authenticated, admin).then(value => { if (active) setReviews(value); }).catch(error => console.error("Không tải được đánh giá từ API", error)); return () => { active = false; }; }, [authenticated, admin]);
	return { reviews, reload };
}
export function useReviewableItems(authenticated = false) {
	const [items, setItems] = useState<Awaited<ReturnType<typeof reviewService.reviewableItems>>>([]);
	useEffect(() => { let active = true; void reviewService.reviewableItems(authenticated).then(value => { if (active) setItems(value); }).catch(error => console.error("Không tải được sản phẩm cần đánh giá", error)); return () => { active = false; }; }, [authenticated]);
	return items;
}
export function useUsers() {
	const [users, setUsers] = useState<Awaited<ReturnType<typeof userService.list>>>([]);
	const reload = async () => {
		try { setUsers(await userService.list()); }
		catch (error) { console.error("Không tải được người dùng từ API", error); }
	};
	useEffect(() => { void reload(); }, []);
	return { users, reload };
}
export const useSessions = () => useSlice("sessions");
export function useStockLog() {
	const [logs, setLogs] = useState<Awaited<ReturnType<typeof inventoryService.movements>>>([]);
	useEffect(() => { let active = true; void inventoryService.movements().then(value => { if (active) setLogs(value); }).catch(error => console.error("Không tải được lịch sử kho từ API", error)); return () => { active = false; }; }, []);
	return logs;
}

export function useAddresses(refreshToken = 0) {
	const { signedIn } = useStore();
	const [addresses, setAddresses] = useState<UserAddress[]>([]);
	const [loading, setLoading] = useState(false);
	const reload = async () => {
		if (!signedIn) { setAddresses([]); return; }
		setLoading(true);
		try {
			const data = await addressService.list();
			setAddresses(data);
		} catch (error) {
			console.error("Không tải được sổ địa chỉ từ API", error);
		} finally {
			setLoading(false);
		}
	};
	useEffect(() => {
		void reload();
	}, [signedIn, refreshToken]);
	return { addresses, reload, loading };
}
