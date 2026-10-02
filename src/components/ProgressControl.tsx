"use client";

// =====================================================================
// components/ProgressControl.tsx — ตัวนับตอนที่ดู [−] 3 / 12 [+]
// Client Component เพราะต้องตอบสนองการกดทันที:
//   useOptimistic → เปลี่ยนตัวเลขบนจอทันทีโดยไม่ต้องรอ server
//   useTransition → เรียก setProgressAction เบื้องหลัง เสร็จแล้ว Next จะส่งค่าจริงกลับมาแทน
// ถ้าบันทึกไม่สำเร็จ ตัวเลขจะกลับเป็นค่าเดิมเอง
// =====================================================================

import { useOptimistic, useTransition } from "react";
import { setProgressAction } from "@/app/actions";

type Props = { mediaId: number; progress: number; total: number | null };

export default function ProgressControl({ mediaId, progress, total }: Props) {
  const [current, setCurrent] = useOptimistic(progress);
  const [pending, startTransition] = useTransition();
  const finished = total !== null && current >= total;

  // คำนวณค่าใหม่โดยไม่ให้ต่ำกว่า 0 หรือเกินจำนวนตอนทั้งหมด (ถ้ารู้)
  function change(delta: number) {
    const next = Math.max(0, total !== null ? Math.min(current + delta, total) : current + delta);
    if (next === current) return;
    startTransition(async () => {
      setCurrent(next);
      await setProgressAction(mediaId, next);
    });
  }

  return (
    <div className="progress" aria-busy={pending}>
      <div className="progress-row">
        <button type="button" className="progress-btn" onClick={() => change(-1)} disabled={current <= 0} aria-label="ลดตอนที่ดู">−</button>
        <span className="progress-count" aria-live="polite">
          {finished ? "ดูจบแล้ว" : <>ตอนที่ดู <strong>{current}</strong> / {total ?? "?"}</>}
        </span>
        <button type="button" className="progress-btn" onClick={() => change(1)} disabled={finished} aria-label="เพิ่มตอนที่ดู">+</button>
      </div>
      {total !== null && total > 0 && (
        <div className="progress-bar">
          <span className={finished ? "done" : undefined} style={{ width: `${(current / total) * 100}%` }} />
        </div>
      )}
    </div>
  );
}
