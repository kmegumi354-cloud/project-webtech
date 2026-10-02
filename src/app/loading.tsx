// Next.js แสดงหน้านี้ระหว่างรอ Server Component ดึงข้อมูล (ทำงานผ่าน React Suspense อัตโนมัติ)
export default function Loading() {
  return <p className="loading">กำลังโหลดข้อมูล...</p>;
}
