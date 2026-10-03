// =====================================================================
// lib/watchlist.ts — เก็บรายการติดตามและตอนที่ดูของผู้ใช้
// มีที่เก็บข้อมูล 2 แบบ เลือกอัตโนมัติจาก environment variables:
//   1. Upstash Redis — ใช้เมื่อมี KV_REST_API_URL + KV_REST_API_TOKEN
//      (หรือ UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) ซึ่ง Vercel ใส่ให้เอง
//      เมื่อเพิ่ม Upstash จากแท็บ Storage — จำเป็นบน Vercel เพราะ Vercel เขียนไฟล์ไม่ได้
//   2. ไฟล์ .data/watchlist.json — ใช้เมื่อไม่มีค่า Redis (รันบนเครื่องตัวเอง)
// ทั้งสองแบบมีฟังก์ชันชุดเดียวกัน ส่วนอื่นของเว็บจึงไม่ต้องรู้ว่าข้อมูลอยู่ที่ไหน
// =====================================================================
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";

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

type Store = {
  list(userId: string): Promise<WatchItem[]>;
  has(userId: string, mediaId: number): Promise<boolean>;
  add(userId: string, item: WatchItem): Promise<void>;
  remove(userId: string, mediaId: number): Promise<void>;
  setProgress(userId: string, mediaId: number, progress: number): Promise<boolean>;
};

// จำนวนตอนที่ดูต้องไม่เกินจำนวนตอนทั้งหมด (ถ้ารู้)
function clampProgress(item: WatchItem, progress: number) {
  return item.episodes ? Math.min(progress, item.episodes) : progress;
}

// ---------- แบบที่ 1: Upstash Redis ----------
// แต่ละผู้ใช้เป็น 1 hash: key = "watchlist:<อีเมล>", field = id อนิเมะ, value = WatchItem
// @upstash/redis แปลง object ↔ JSON ให้อัตโนมัติ
function redisStore(redis: Redis): Store {
  const key = (userId: string) => `watchlist:${userId}`;
  return {
    async list(userId) {
      const all = await redis.hgetall<Record<string, WatchItem>>(key(userId));
      return Object.values(all ?? {}).map((item) => ({ ...item, progress: item.progress ?? 0 }));
    },
    async has(userId, mediaId) {
      return (await redis.hexists(key(userId), String(mediaId))) === 1;
    },
    async add(userId, item) {
      // hsetnx = เขียนเฉพาะเมื่อยังไม่มี จึงไม่เพิ่มซ้ำ
      await redis.hsetnx(key(userId), String(item.id), item);
    },
    async remove(userId, mediaId) {
      await redis.hdel(key(userId), String(mediaId));
    },
    async setProgress(userId, mediaId, progress) {
      const item = await redis.hget<WatchItem>(key(userId), String(mediaId));
      if (!item) return false;
      await redis.hset(key(userId), { [String(mediaId)]: { ...item, progress: clampProgress(item, progress) } });
      return true;
    },
  };
}

// ---------- แบบที่ 2: ไฟล์ JSON บนเครื่อง ----------
// รูปแบบไฟล์ { "อีเมลผู้ใช้": [WatchItem, ...] }
function fileStore(file: string): Store {
  type Data = Record<string, WatchItem[]>;

  async function read(): Promise<Data> {
    try {
      const data = JSON.parse(await readFile(file, "utf8")) as Data;
      // รายการที่บันทึกก่อนมีฟีเจอร์นับตอนจะไม่มี progress
      for (const list of Object.values(data)) for (const item of list) item.progress ??= 0;
      return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw error;
    }
  }

  // เขียนลงไฟล์ชั่วคราวแล้ว rename ทับ ผู้อ่านจึงไม่เจอไฟล์ที่เขียนไปได้ครึ่งเดียว
  // Windows อาจ rename ไม่ได้ชั่วขณะ (EPERM) ถ้ามี request อื่นเปิดไฟล์อยู่ จึงลองซ้ำ
  async function write(data: Data) {
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2));
    for (let attempt = 0; ; attempt++) {
      try {
        return await rename(tmp, file);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (attempt >= 5 || (code !== "EPERM" && code !== "EBUSY")) throw error;
        await new Promise((r) => setTimeout(r, 20 * (attempt + 1)));
      }
    }
  }

  // ให้การแก้ไขทำทีละครั้ง กันสอง request อ่าน-แก้-เขียนพร้อมกันจนข้อมูลหาย
  let queue: Promise<unknown> = Promise.resolve();
  function update<T>(fn: (data: Data) => T): Promise<T> {
    const run = queue.then(async () => {
      const data = await read();
      const result = fn(data);
      await write(data);
      return result;
    });
    queue = run.catch(() => {});
    return run;
  }

  return {
    async list(userId) {
      return (await read())[userId] ?? [];
    },
    async has(userId, mediaId) {
      return ((await read())[userId] ?? []).some((item) => item.id === mediaId);
    },
    async add(userId, item) {
      await update((data) => {
        const list = data[userId] ?? [];
        if (!list.some((i) => i.id === item.id)) data[userId] = [...list, item];
      });
    },
    async remove(userId, mediaId) {
      await update((data) => {
        data[userId] = (data[userId] ?? []).filter((item) => item.id !== mediaId);
      });
    },
    setProgress(userId, mediaId, progress) {
      return update((data) => {
        const item = (data[userId] ?? []).find((i) => i.id === mediaId);
        if (!item) return false;
        item.progress = clampProgress(item, progress);
        return true;
      });
    },
  };
}

// ---------- เลือกที่เก็บข้อมูล ----------
const redisUrl = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

const store: Store = redisUrl && redisToken
  ? redisStore(new Redis({ url: redisUrl, token: redisToken }))
  : fileStore(path.join(process.cwd(), ".data", "watchlist.json"));

// ---------- ฟังก์ชันที่ส่วนอื่นของเว็บเรียกใช้ ----------

// รายการติดตามของผู้ใช้ เรียงจากที่เพิ่มล่าสุด
export async function getWatchlist(userId: string) {
  return (await store.list(userId)).sort((a, b) => b.addedAt - a.addedAt);
}

export function isWatching(userId: string, mediaId: number) {
  return store.has(userId, mediaId);
}

// เพิ่มเรื่องเข้ารายการ (ถ้ามีอยู่แล้วจะไม่เพิ่มซ้ำ)
export function addToWatchlist(userId: string, item: WatchItem) {
  return store.add(userId, item);
}

export function removeFromWatchlist(userId: string, mediaId: number) {
  return store.remove(userId, mediaId);
}

// ตั้งจำนวนตอนที่ดู คืน false ถ้ายังไม่ได้ติดตามเรื่องนี้
export function setProgress(userId: string, mediaId: number, progress: number) {
  return store.setProgress(userId, mediaId, progress);
}
