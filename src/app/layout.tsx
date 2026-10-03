// =====================================================================
// app/layout.tsx — โครงหน้าที่ทุกหน้าใช้ร่วมกัน
// navbar (โลโก้ + เมนู + ช่องค้นหา + ปุ่ม Login) → เนื้อหาของแต่ละหน้า (children) → footer
// ฟอนต์โหลดผ่าน next/font: Overpass สำหรับภาษาอังกฤษ และ Noto Sans Thai สำหรับภาษาไทย
// (Next ดาวน์โหลดไฟล์ฟอนต์มาเก็บไว้กับเว็บตอน build ไม่ต้องเรียก Google Fonts ตอนเปิดหน้า)
// AuthButtons อ่าน session จาก cookie ทุกหน้าจึง render ใหม่ต่อ request (ข้อมูล AniList ยังแคชไว้)
// =====================================================================
import type { Metadata } from "next";
import { Noto_Sans_Thai, Overpass } from "next/font/google";
import Link from "next/link";
import AuthButtons from "@/components/AuthButtons";
import NavLinks from "@/components/NavLinks";
import SearchBox from "@/components/SearchBox";
import "./globals.css";

const overpass = Overpass({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-latin" });
const notoThai = Noto_Sans_Thai({ subsets: ["thai"], weight: ["400", "500", "600", "700"], variable: "--font-thai" });

// title.template ทำให้ทุกหน้าได้ชื่อแท็บเป็น "<ชื่อหน้า> - AniExplorer"
export const metadata: Metadata = {
  title: { default: "AniExplorer - ฐานข้อมูลอนิเมะ", template: "%s - AniExplorer" },
  description: "ค้นหาอนิเมะ จัดอันดับ และดูรายละเอียด ด้วยข้อมูลจาก AniList",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={`${overpass.variable} ${notoThai.variable}`}>
      <body>
        <header className="site-nav">
          <div className="wrap nav-inner">
            <Link href="/" className="logo" aria-label="AniExplorer หน้าแรก">
              <span className="logo-mark" aria-hidden="true">A</span>
              <span className="logo-text">Ani<span>Explorer</span></span>
            </Link>
            <nav className="nav-menu" aria-label="เมนูหลัก">
              <NavLinks />
            </nav>
            <SearchBox />
            <div className="nav-auth">
              <AuthButtons />
            </div>
          </div>
        </header>

        {/* เนื้อหาของหน้าที่ผู้ใช้เปิดอยู่จะถูกแทรกตรงนี้ */}
        <main className="wrap content">{children}</main>

        <footer className="footer">
          <div className="wrap footer-inner">
            <div>
              <Link href="/" className="logo footer-logo">
                <span className="logo-mark" aria-hidden="true">A</span>
                <span className="logo-text">Ani<span>Explorer</span></span>
              </Link>
              <p className="footer-note">
                ค้นหา จัดอันดับ และติดตามอนิเมะที่คุณชอบ
                <br />
                ข้อมูลทั้งหมดจาก <a href="https://anilist.co" target="_blank" rel="noreferrer">AniList</a>
              </p>
            </div>
            <nav className="footer-links" aria-label="ลิงก์ส่วนท้าย">
              <Link href="/top">Top Anime</Link>
              <Link href="/seasonal">Seasonal</Link>
              <Link href="/search">Browse</Link>
              <Link href="/profile">Profile</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
