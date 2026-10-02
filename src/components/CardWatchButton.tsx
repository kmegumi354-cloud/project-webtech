// =====================================================================
// components/CardWatchButton.tsx — ปุ่มติดตามวงกลม (+ / ✓) บนปกการ์ด
// Server Component: อ่านสถานะจาก getViewer() ซึ่งแคชไว้ทั้งหน้า การ์ดหลายสิบใบจึงอ่านข้อมูลครั้งเดียว
// ยังไม่ล็อกอิน → กดแล้วไปล็อกอินและกลับมาหน้าเดิม
// ล็อกอินแล้ว   → กดแล้วเรียก toggleWatchAction เพื่อเพิ่ม/เลิกติดตาม
// =====================================================================
import { signInHereAction, toggleWatchAction } from "@/app/actions";
import { getViewer } from "@/lib/viewer";
import SubmitButton from "./SubmitButton";

export default async function CardWatchButton({ mediaId }: { mediaId: number }) {
  const { userId, watched } = await getViewer();

  if (!userId) {
    return (
      <form action={signInHereAction} className="card-watch">
        <button type="submit" className="card-watch-btn" title="ล็อกอินเพื่อติดตาม" aria-label="ล็อกอินเพื่อติดตาม">+</button>
      </form>
    );
  }

  const watching = watched.has(mediaId);
  const label = watching ? "เลิกติดตาม" : "เพิ่มในรายการติดตาม";
  return (
    <form action={toggleWatchAction.bind(null, mediaId)} className="card-watch">
      <SubmitButton
        className={watching ? "card-watch-btn watching" : "card-watch-btn"}
        title={label}
        ariaLabel={label}
        pendingText="…"
      >
        {watching ? "✓" : "+"}
      </SubmitButton>
    </form>
  );
}
