import Link from "next/link";

// แสดงเมื่อเรียก notFound() หรือเปิด URL ที่ไม่มีอยู่
export default function NotFound() {
  return (
    <div className="message-page">
      <h1 className="page-title">404 Not Found</h1>
      <p>ไม่พบหน้าที่คุณต้องการ</p>
      <Link href="/">กลับหน้าแรก</Link>
    </div>
  );
}
