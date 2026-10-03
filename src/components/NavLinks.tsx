"use client";

// =====================================================================
// components/NavLinks.tsx — เมนูหลักบน navbar
// เป็น Client Component เพื่อใช้ usePathname() ไฮไลต์เมนูของหน้าที่เปิดอยู่
// =====================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/top", label: "Top Anime" },
  { href: "/seasonal", label: "Seasonal" },
  { href: "/schedule", label: "Schedule" },
  { href: "/search", label: "Browse" },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <ul className="nav-links">
      {LINKS.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <li key={link.href}>
            <Link href={link.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
