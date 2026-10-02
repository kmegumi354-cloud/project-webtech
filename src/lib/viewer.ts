// =====================================================================
// lib/viewer.ts — ข้อมูลของ "คนที่กำลังดูหน้าเว็บ"
// คืน userId (อีเมล) และ Map ของเรื่องที่ติดตาม ให้ปุ่มติดตามและตัวนับตอนใช้
// =====================================================================
import { cache } from "react";
import { auth } from "@/auth";
import { getWatchlist } from "@/lib/watchlist";

// cache() ทำให้ทั้งหน้าอ่าน session และรายการติดตามแค่ครั้งเดียว แม้มีการ์ดหลายสิบใบ
export const getViewer = cache(async () => {
  const session = await auth();
  const userId = session?.user?.email ?? null;
  const list = userId ? await getWatchlist(userId) : [];
  const watched = new Map(list.map((item) => [item.id, item]));
  return { userId, watched };
});
