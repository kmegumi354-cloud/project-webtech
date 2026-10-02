// =====================================================================
// app/layout.tsx — โครงหน้าที่ทุกหน้าใช้ร่วมกัน
// header (โลโก้ + ปุ่ม Login) → navbar (เมนู + ช่องค้นหา) → เนื้อหาของแต่ละหน้า (children) → footer
// AuthButtons อ่าน session จาก cookie ทุกหน้าจึง render ใหม่ต่อ request (ข้อมูล AniList ยังแคชไว้)
// =====================================================================
import type { Metadata } from "next";
import Link from "next/link";
import AuthButtons from "@/components/AuthButtons";
import SearchBox from "@/components/SearchBox";
import "./globals.css";

// title.template ทำให้ทุกหน้าได้ชื่อแท็บเป็น "<ชื่อหน้า> - AniExplorer"
export const metadata: Metadata = {
  title: { default: "AniExplorer - ฐานข้อมูลอนิเมะ", template: "%s - AniExplorer" },
  description: "ค้นหาอนิเมะ จัดอันดับ และดูรายละเอียด ด้วยข้อมูลจาก AniList",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>
        <header className="masthead">
          <div className="wrap masthead-inner">
            <Link href="/" className="logo">Ani<span>Explorer</span></Link>
            <div className="masthead-right">
              <span className="powered">Powered by AniList GraphQL API</span>
              <AuthButtons />
            </div>
          </div>
        </header>
        <nav className="menubar">
          <div className="wrap menubar-inner">
            <ul className="menu">
              <li><Link href="/">Home</Link></li>
              <li><Link href="/top">Top Anime</Link></li>
              <li><Link href="/seasonal">Seasonal Anime</Link></li>
            </ul>
            <SearchBox />
          </div>
        </nav>
        {/* เนื้อหาของหน้าที่ผู้ใช้เปิดอยู่จะถูกแทรกตรงนี้ */}
        <div className="wrap content">{children}</div>
        <footer className="footer">
          <div className="wrap">
            <p>
              AniExplorer · สร้างด้วย Next.js · ข้อมูลทั้งหมดจาก{" "}
              <a href="https://anilist.co" target="_blank" rel="noreferrer">AniList</a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
