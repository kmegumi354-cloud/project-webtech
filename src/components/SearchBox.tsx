"use client";

// =====================================================================
// components/SearchBox.tsx — ช่องค้นหาบน navbar พร้อมผลลัพธ์แบบเห็นทันที
// ขั้นตอน:
//   1. ผู้ใช้พิมพ์ → รอ 250ms หลังหยุดพิมพ์ (debounce) จะได้ไม่เรียก API ทุกตัวอักษร
//   2. เรียก /api/search?q=... ถ้ามีคำขอเก่าค้างอยู่จะยกเลิก (AbortController)
//   3. แสดงผลแยก 2 หมวดใต้ช่องค้นหา: Anime (ปก ชื่อ ชื่อญี่ปุ่น รูปแบบ ปี ตอน สถานะ แนว คะแนน)
//      และ Characters (รูป ชื่อ และเรื่องที่อยู่) เลือกด้วยเมาส์ หรือ ↑ ↓ + Enter ได้ทั้งสองหมวด
//   4. Enter โดยไม่ได้เลือกรายการ หรือกด "ดูผลทั้งหมด" → ไปหน้า /search?q=...
//   5. ค้นเสร็จ (ไปหน้าผลหรือเลือกรายการ) แล้วล้างช่องให้ว่างทุกครั้ง
// =====================================================================

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { CharacterResult, SearchResponse, SearchResult } from "@/app/api/search/route";

const EMPTY: SearchResponse = { anime: [], characters: [] };

export default function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const boxRef = useRef<HTMLFormElement>(null);
  const [q, setQ] = useState("");
  const [data, setData] = useState<SearchResponse>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const term = q.trim();
  // คำค้นยาว ๆ ตัดให้สั้นเวลาแสดงในกล่อง จะได้ไม่ล้นออกนอกจอ
  const shownTerm = term.length > 30 ? `${term.slice(0, 30)}…` : term;

  // รวมทุกรายการเป็นลำดับเดียว (อนิเมะก่อน แล้วตัวละคร) เพื่อให้ปุ่ม ↑ ↓ เลื่อนข้ามหมวดได้
  const hrefs = [
    ...data.anime.map((a) => `/anime/${a.id}`),
    ...data.characters.map((c) => `/anime/${c.anime.id}`),
  ];
  const total = hrefs.length;

  // เรียก API หลังผู้ใช้หยุดพิมพ์ 250ms
  useEffect(() => {
    if (term.length < 2) {
      setData(EMPTY);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?${new URLSearchParams({ q: term })}`, { signal: controller.signal });
        const json = (await res.json()) as SearchResponse;
        setData({ anime: json.anime ?? [], characters: json.characters ?? [] });
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

  // ปิดกล่องและล้างช่อง ใช้ทุกครั้งที่ค้นเสร็จ
  function finish() {
    setOpen(false);
    setQ("");
  }

  // ไปหน้าผลการค้นหาแล้วล้างช่องค้นหา พร้อมสำหรับการค้นรอบถัดไป
  function goToSearchPage() {
    finish();
    router.push(term ? `/search?${new URLSearchParams({ q: term })}` : "/search");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && total) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % total);
    } else if (e.key === "ArrowUp" && total) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? total - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (open && active >= 0 && hrefs[active]) {
      finish();
      router.push(hrefs[active]);
    } else {
      goToSearchPage();
    }
  }

  const showList = open && term.length >= 2;
  const nothing = total === 0;

  // props ร่วมของทุกแถวผลลัพธ์ (index = ลำดับในรายการรวม)
  function rowProps(index: number) {
    return {
      href: hrefs[index],
      className: index === active ? "search-item active" : "search-item",
      onMouseEnter: () => setActive(index),
      onClick: finish,
    };
  }

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
            {data.anime.length > 0 && <li role="presentation" className="search-group">Anime</li>}
            {data.anime.map((a, i) => (
              <li key={`a${a.id}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <AnimeRow item={a} {...rowProps(i)} />
              </li>
            ))}
            {data.characters.length > 0 && <li role="presentation" className="search-group">Characters</li>}
            {data.characters.map((c, j) => {
              const i = data.anime.length + j;
              return (
                <li key={`c${c.id}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                  <CharacterRow item={c} {...rowProps(i)} />
                </li>
              );
            })}
          </ul>
          {loading && nothing && <p className="search-state">กำลังค้นหา...</p>}
          {!loading && nothing && <p className="search-state">ไม่พบเรื่องที่ตรงกับ “{shownTerm}”</p>}
          <button type="button" className="search-all" onClick={goToSearchPage}>
            ดูผลการค้นหาทั้งหมดของ <strong>“{shownTerm}”</strong> →
          </button>
        </div>
      )}
    </form>
  );
}

type RowProps = { href: string; className: string; onMouseEnter: () => void; onClick: () => void };

// แถวอนิเมะ: ปก | ชื่อ / ชื่อญี่ปุ่น / (รูปแบบ, ปี) · ตอน · สถานะ / แนว | คะแนน
function AnimeRow({ item, ...link }: RowProps & { item: SearchResult }) {
  const meta = [item.year ? `${item.format}, ${item.year}` : item.format];
  if (item.episodes) meta.push(`${item.episodes} ตอน`);
  meta.push(item.status);
  return (
    <Link {...link}>
      {item.cover ? <img src={item.cover} alt="" /> : <span className="search-item-noimg" />}
      <span className="search-item-text">
        <span className="search-item-title">{item.title}</span>
        {item.native && <span className="search-item-native">{item.native}</span>}
        <span className="search-item-meta">{meta.join(" · ")}</span>
        {item.genres.length > 0 && (
          <span className="search-item-genres">
            {item.genres.map((g) => <span key={g}>{g}</span>)}
          </span>
        )}
      </span>
      {item.score && <span className="search-item-score">{item.score}%</span>}
    </Link>
  );
}

// แถวตัวละคร: รูป | ชื่อ / ชื่อญี่ปุ่น / จากเรื่อง ... (กดแล้วไปหน้าเรื่องนั้น)
function CharacterRow({ item, ...link }: RowProps & { item: CharacterResult }) {
  return (
    <Link {...link}>
      {item.image ? <img src={item.image} alt="" className="round" /> : <span className="search-item-noimg round" />}
      <span className="search-item-text">
        <span className="search-item-title">{item.name}</span>
        {item.native && <span className="search-item-native">{item.native}</span>}
        <span className="search-item-meta">จากเรื่อง {item.anime.title}</span>
      </span>
    </Link>
  );
}
