"use client";

// =====================================================================
// components/SearchBox.tsx — ช่องค้นหาบน navbar พร้อมผลลัพธ์แบบเห็นทันที
// ขั้นตอน:
//   1. ผู้ใช้พิมพ์ → รอ 250ms หลังหยุดพิมพ์ (debounce) จะได้ไม่เรียก API ทุกตัวอักษร
//   2. เรียก /api/search?q=... ถ้ามีคำขอเก่าค้างอยู่จะยกเลิก (AbortController)
//   3. แสดงรายการผลลัพธ์ใต้ช่องค้นหา เลือกด้วยเมาส์ หรือ ↑ ↓ + Enter ได้
//   4. Enter โดยไม่ได้เลือกรายการ หรือกด "ดูผลทั้งหมด" → ไปหน้า /search?q=...
// =====================================================================

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { SearchResult } from "@/app/api/search/route";

export default function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const boxRef = useRef<HTMLFormElement>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const term = q.trim();
  // คำค้นยาว ๆ ตัดให้สั้นเวลาแสดงในกล่อง จะได้ไม่ล้นออกนอกจอ
  const shownTerm = term.length > 30 ? `${term.slice(0, 30)}…` : term;

  // เรียก API หลังผู้ใช้หยุดพิมพ์ 250ms
  useEffect(() => {
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?${new URLSearchParams({ q: term })}`, { signal: controller.signal });
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results);
        setActive(-1);
      } catch {
        // ถูกยกเลิกเพราะพิมพ์ต่อ หรือเครือข่ายมีปัญหา — ไม่ต้องแสดงอะไร
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  // คลิกนอกกล่องค้นหาแล้วปิดรายการ
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // ไปหน้าผลการค้นหาแล้วล้างช่องค้นหา พร้อมสำหรับการค้นรอบถัดไป
  function goToSearchPage() {
    setOpen(false);
    setQ("");
    router.push(term ? `/search?${new URLSearchParams({ q: term })}` : "/search");
  }

  function choose(result: SearchResult) {
    setOpen(false);
    setQ("");
    router.push(`/anime/${result.id}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (open && active >= 0 && results[active]) choose(results[active]);
    else goToSearchPage();
  }

  const showList = open && term.length >= 2;

  return (
    <form ref={boxRef} className="searchbox" role="search" onSubmit={onSubmit}>
      <input
        role="combobox"
        aria-label="Search anime"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        placeholder="Search Anime..."
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        maxLength={100}
      />
      <button type="submit" aria-label="Search">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      {showList && (
        <div className="search-dropdown">
          <ul id={listId} role="listbox" aria-label="ผลการค้นหา">
            {results.map((r, i) => (
              <li key={r.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <Link
                  href={`/anime/${r.id}`}
                  className={i === active ? "search-item active" : "search-item"}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => {
                    setOpen(false);
                    setQ("");
                  }}
                >
                  {r.cover ? <img src={r.cover} alt="" /> : <span className="search-item-noimg" />}
                  <span className="search-item-text">
                    <span className="search-item-title">{r.title}</span>
                    <span className="search-item-meta">
                      {r.format}{r.year ? ` · ${r.year}` : ""}
                    </span>
                  </span>
                  {r.score && <span className="search-item-score">{r.score}%</span>}
                </Link>
              </li>
            ))}
          </ul>
          {loading && results.length === 0 && <p className="search-state">กำลังค้นหา...</p>}
          {!loading && results.length === 0 && <p className="search-state">ไม่พบเรื่องที่ตรงกับ “{shownTerm}”</p>}
          <button type="button" className="search-all" onClick={goToSearchPage}>
            ดูผลการค้นหาทั้งหมดของ “{shownTerm}” →
          </button>
        </div>
      )}
    </form>
  );
}
