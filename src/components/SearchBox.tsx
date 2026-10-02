"use client";

// =====================================================================
// components/SearchBox.tsx — ช่องค้นหาบน navbar
// กด Enter แล้วพาไปหน้า /search?q=... ด้วย router.push (เปลี่ยนหน้าโดยไม่โหลดเว็บใหม่ทั้งหมด)
// =====================================================================

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/search?${new URLSearchParams({ q: q.trim() })}` : "/search");
  }

  return (
    <form className="searchbox" role="search" onSubmit={submit}>
      <input
        aria-label="Search anime"
        placeholder="Search Anime..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button type="submit" aria-label="Search">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  );
}
