"use client";

// แสดงเมื่อหน้าใดก็ตามโยน error (เช่น AniList ล่มหรือ rate limit) ปุ่ม "ลองใหม่" จะ render หน้านั้นอีกครั้ง
// ต้องเป็น Client Component เพราะใช้ปุ่มที่มี onClick
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="message-page">
      <div className="message-code">Oops!</div>
      <h1 className="message-title">เกิดข้อผิดพลาด</h1>
      <p className="message-text">{error.message || "โหลดข้อมูลจาก AniList ไม่สำเร็จ"}</p>
      <div className="message-actions">
        <button type="button" className="btn btn-accent" onClick={reset}>ลองใหม่</button>
        <Link href="/" className="btn btn-ghost">กลับหน้าแรก</Link>
      </div>
    </div>
  );
}
