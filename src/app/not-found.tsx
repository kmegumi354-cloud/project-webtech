import Link from "next/link";

// แสดงเมื่อเรียก notFound() หรือเปิด URL ที่ไม่มีอยู่
export default function NotFound() {
  return (
    <div className="message-page">
      <div className="message-code">404</div>
      <h1 className="message-title">ไม่พบหน้าที่คุณต้องการ</h1>
      <p className="message-text">ลิงก์อาจผิด หรืออนิเมะเรื่องนี้ไม่มีอยู่ใน AniList</p>
      <div className="message-actions">
        <Link href="/" className="btn btn-accent">กลับหน้าแรก</Link>
        <Link href="/search" className="btn btn-ghost">ค้นหาอนิเมะ</Link>
      </div>
    </div>
  );
}
