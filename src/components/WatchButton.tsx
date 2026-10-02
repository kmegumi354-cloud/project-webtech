// =====================================================================
// components/WatchButton.tsx — ปุ่มติดตามขนาดใหญ่ในหน้ารายละเอียด
// ทำงานเหมือน CardWatchButton และถ้าติดตามอยู่จะแสดงตัวนับตอนที่ดู (ProgressControl) ด้านล่าง
// =====================================================================
import { signInHereAction, toggleWatchAction } from "@/app/actions";
import { getViewer } from "@/lib/viewer";
import ProgressControl from "./ProgressControl";
import SubmitButton from "./SubmitButton";

export default async function WatchButton({ mediaId, total }: { mediaId: number; total: number | null }) {
  const { userId, watched } = await getViewer();

  if (!userId) {
    return (
      <form action={signInHereAction}>
        <button type="submit" className="watch-btn">Login เพื่อติดตาม</button>
      </form>
    );
  }

  const item = watched.get(mediaId);
  const watching = Boolean(item);
  return (
    <>
      <form action={toggleWatchAction.bind(null, mediaId)}>
        <SubmitButton
          className={watching ? "watch-btn watching" : "watch-btn"}
          title={watching ? "กดเพื่อเลิกติดตาม" : undefined}
          pendingText="กำลังบันทึก..."
        >
          {watching ? "✓ กำลังติดตาม" : "+ เพิ่มในรายการติดตาม"}
        </SubmitButton>
      </form>
      {item && <ProgressControl mediaId={mediaId} progress={item.progress} total={total ?? item.episodes} />}
    </>
  );
}
