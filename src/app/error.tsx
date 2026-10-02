"use client";

// แสดงเมื่อหน้าใดก็ตามโยน error (เช่น AniList ล่มหรือ rate limit) ปุ่ม "ลองใหม่" จะ render หน้านั้นอีกครั้ง
// ต้องเป็น Client Component เพราะใช้ปุ่มที่มี onClick
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="message-page">
      <h1 className="page-title">เกิดข้อผิดพลาด</h1>
      <p>{error.message || "โหลดข้อมูลจาก AniList ไม่สำเร็จ"}</p>
      <button type="button" className="btn-primary" onClick={reset}>ลองใหม่</button>
    </div>
  );
}
