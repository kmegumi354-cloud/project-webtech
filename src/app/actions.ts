"use server";

// =====================================================================
// app/actions.ts — Server Actions (ฟังก์ชันที่รันบน server เรียกจากฟอร์ม/ปุ่มได้)
// ทุก action ที่แก้ข้อมูลจะ:
//   1. ตรวจ session ด้วย requireUserId() — การซ่อนปุ่มบน UI ไม่ใช่การป้องกัน เพราะเรียก action ตรงได้
//   2. ตรวจค่าที่ส่งมา (id, จำนวนตอน)
//   3. แก้ข้อมูลผ่าน lib/watchlist.ts
//   4. revalidatePath() ให้ Next.js render หน้าใหม่ ข้อมูลบนจอจะอัปเดตทันที
// =====================================================================
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth, signIn } from "@/auth";
import { displayTitle, getMediaDetail } from "@/lib/anilist";
import { addToWatchlist, isWatching, removeFromWatchlist, setProgress } from "@/lib/watchlist";

// ตรวจ session ซ้ำฝั่ง server เสมอ กันการเรียก Server Action ตรงโดยไม่ล็อกอิน
async function requireUserId() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Unauthorized");
  return email;
}

// id ต้องเป็นจำนวนเต็มบวก กันค่าแปลก ๆ ที่ส่งมาตรง ๆ
function assertMediaId(mediaId: number) {
  if (!Number.isInteger(mediaId) || mediaId <= 0) throw new Error("Invalid anime id");
}

// กดปุ่มติดตาม: ถ้าติดตามอยู่แล้วให้เลิกติดตาม ถ้ายังให้เพิ่มเข้ารายการ
export async function toggleWatchAction(mediaId: number) {
  const userId = await requireUserId();
  assertMediaId(mediaId);

  if (await isWatching(userId, mediaId)) {
    await removeFromWatchlist(userId, mediaId);
  } else {
    // ดึงข้อมูลจาก AniList เองบน server แทนการเชื่อข้อมูลที่ส่งมาจาก client
    const media = await getMediaDetail(mediaId);
    await addToWatchlist(userId, {
      id: media.id,
      title: displayTitle(media.title),
      cover: media.coverImage.large,
      format: media.format,
      episodes: media.episodes,
      progress: 0,
      addedAt: Math.floor(Date.now() / 1000),
    });
  }

  // การ์ดอยู่หลายหน้า (หน้าแรก, ค้นหา, ซีซัน, รายละเอียด, โปรไฟล์) จึงรีเฟรชทุกหน้า
  revalidatePath("/", "layout");
}

// ตั้งจำนวนตอนที่ดู (เรียกจาก ProgressControl ทุกครั้งที่กด + / −)
export async function setProgressAction(mediaId: number, progress: number) {
  const userId = await requireUserId();
  assertMediaId(mediaId);
  if (!Number.isInteger(progress) || progress < 0 || progress > 100_000) throw new Error("Invalid progress");
  if (!(await setProgress(userId, mediaId, progress))) throw new Error("ยังไม่ได้ติดตามเรื่องนี้");
  revalidatePath("/", "layout");
}

// ปุ่ม "เลิกติดตาม" ในหน้าโปรไฟล์
export async function removeWatchAction(mediaId: number) {
  const userId = await requireUserId();
  assertMediaId(mediaId);
  await removeFromWatchlist(userId, mediaId);
  revalidatePath("/profile");
}

// ล็อกอินแล้วกลับมาหน้าเดิม ใช้แค่ path จาก Referer เพื่อไม่ให้ redirect ออกนอกเว็บ
export async function signInHereAction() {
  const referer = (await headers()).get("referer");
  const url = referer ? new URL(referer) : null;
  await signIn("google", { redirectTo: url ? `${url.pathname}${url.search}` : "/" });
}
