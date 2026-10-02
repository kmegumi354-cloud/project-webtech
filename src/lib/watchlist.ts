// =====================================================================
// lib/watchlist.ts — เก็บรายการติดตามและตอนที่ดูของผู้ใช้
// ข้อมูลอยู่ในไฟล์ .data/watchlist.json รูปแบบ { "อีเมลผู้ใช้": [WatchItem, ...] }
// ฟังก์ชันอ่าน (get/isWatching) อ่านไฟล์ตรง ๆ
// ฟังก์ชันแก้ไข (add/remove/setProgress) ผ่าน update() ซึ่งเข้าคิวทีละงานและเขียนไฟล์แบบ atomic
// =====================================================================
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

// ข้อมูล 1 เรื่องในรายการติดตาม เก็บชื่อ/ปกไว้ด้วย หน้าโปรไฟล์จึงไม่ต้องเรียก AniList ทุกเรื่อง
export type WatchItem = {
  id: number;
  title: string;
  cover: string | null;
  format: string | null;
  episodes: number | null;
  progress: number;
  addedAt: number;
};

type Store = Record<string, WatchItem[]>;

// เก็บเป็นไฟล์ JSON เพื่อการเรียนรู้ ถ้าใช้งานจริงควรเปลี่ยนเป็นฐานข้อมูล
const FILE = path.join(process.cwd(), ".data", "watchlist.json");

async function readStore(): Promise<Store> {
  try {
    const store = JSON.parse(await readFile(FILE, "utf8")) as Store;
    // รายการที่บันทึกก่อนมีฟีเจอร์นับตอนจะไม่มี progress
    for (const list of Object.values(store)) for (const item of list) item.progress ??= 0;
    return store;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

// เขียนลงไฟล์ชั่วคราวแล้ว rename ทับ ผู้อ่านจึงไม่เจอไฟล์ที่เขียนไปได้ครึ่งเดียว
// Windows อาจ rename ไม่ได้ชั่วขณะ (EPERM) ถ้ามี request อื่นเปิดไฟล์อยู่ จึงลองซ้ำ
async function writeStore(store: Store) {
  await mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(store, null, 2));
  for (let attempt = 0; ; attempt++) {
    try {
      return await rename(tmp, FILE);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (attempt >= 5 || (code !== "EPERM" && code !== "EBUSY")) throw error;
      await new Promise((r) => setTimeout(r, 20 * (attempt + 1)));
    }
  }
}

// ให้การแก้ไขทำทีละครั้ง กันสอง request อ่าน-แก้-เขียนพร้อมกันจนข้อมูลหาย
let queue: Promise<unknown> = Promise.resolve();
function update<T>(fn: (store: Store) => T): Promise<T> {
  const run = queue.then(async () => {
    const store = await readStore();
    const result = fn(store);
    await writeStore(store);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

// รายการติดตามของผู้ใช้ เรียงจากที่เพิ่มล่าสุด
export async function getWatchlist(userId: string) {
  const store = await readStore();
  return [...(store[userId] ?? [])].sort((a, b) => b.addedAt - a.addedAt);
}

export async function isWatching(userId: string, mediaId: number) {
  const store = await readStore();
  return (store[userId] ?? []).some((item) => item.id === mediaId);
}

// เพิ่มเรื่องเข้ารายการ (ถ้ามีอยู่แล้วจะไม่เพิ่มซ้ำ)
export function addToWatchlist(userId: string, item: WatchItem) {
  return update((store) => {
    const list = store[userId] ?? [];
    if (!list.some((i) => i.id === item.id)) store[userId] = [...list, item];
  });
}

export function removeFromWatchlist(userId: string, mediaId: number) {
  return update((store) => {
    store[userId] = (store[userId] ?? []).filter((item) => item.id !== mediaId);
  });
}

// ตั้งจำนวนตอนที่ดู ถ้ารู้จำนวนตอนทั้งหมดจะไม่ให้เกิน คืน false ถ้ายังไม่ได้ติดตามเรื่องนี้
export function setProgress(userId: string, mediaId: number, progress: number) {
  return update((store) => {
    const item = (store[userId] ?? []).find((i) => i.id === mediaId);
    if (!item) return false;
    item.progress = item.episodes ? Math.min(progress, item.episodes) : progress;
    return true;
  });
}
