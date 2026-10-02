// ปุ่มเปลี่ยนหน้า (ใช้ในหน้า Top Anime และค้นหา) — makeHref สร้างลิงก์ของหน้าที่ต้องการ โดยคงตัวกรองเดิมไว้
import Link from "next/link";

type Props = {
  page: number;
  hasNext: boolean;
  makeHref: (page: number) => string;
  perPage: number;
};

export default function Pagination({ page, hasNext, makeHref, perPage }: Props) {
  if (page === 1 && !hasNext) return null;
  const from = (page - 1) * perPage + 1;
  return (
    <nav className="pagination" aria-label="เปลี่ยนหน้า">
      {page > 1
        ? <Link href={makeHref(page - 1)} className="page-btn">‹ ก่อนหน้า</Link>
        : <span className="page-btn disabled">‹ ก่อนหน้า</span>}
      <span className="page-info">หน้า {page} · รายการที่ {from}–{from + perPage - 1}</span>
      {hasNext
        ? <Link href={makeHref(page + 1)} className="page-btn">ถัดไป ›</Link>
        : <span className="page-btn disabled">ถัดไป ›</span>}
    </nav>
  );
}
