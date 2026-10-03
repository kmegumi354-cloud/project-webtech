// Next.js แสดงหน้านี้ระหว่างรอ Server Component ดึงข้อมูล (ทำงานผ่าน React Suspense อัตโนมัติ)
// แสดงเป็นโครงการ์ดกระพริบ (skeleton) ให้ผู้ใช้เห็นว่ากำลังโหลด และหน้าไม่กระตุกตอนข้อมูลมาถึง
export default function Loading() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-label="กำลังโหลดข้อมูล">
      <div className="skeleton skeleton-title" />
      <div className="card-grid">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i}>
            <div className="skeleton skeleton-cover" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line short" />
          </div>
        ))}
      </div>
    </div>
  );
}
