// =====================================================================
// app/search/page.tsx — หน้าค้นหา (/search?q=&genre=&sort=&page=)
// ไม่มีเงื่อนไขเลย → แสดงรายชื่อแนวให้เลือก
// มีคำค้น/แนว/การเรียง → ดึงผลจาก AniList แล้วแสดงเป็นการ์ด 48 เรื่องต่อหน้า
// ฟอร์มใช้ GET ธรรมดา ค่าที่ค้นจึงอยู่ใน URL แชร์ลิงก์หรือกด back ได้
// =====================================================================
import Link from "next/link";
import type { Metadata } from "next";
import MediaCard from "@/components/MediaCard";
import Pagination from "@/components/Pagination";
import { GENRES, firstParam, getMediaPage, pageParam } from "@/lib/anilist";

const PER_PAGE = 48;

const SORTS: Record<string, { label: string; value: string }> = {
  popularity: { label: "ความนิยม", value: "POPULARITY_DESC" },
  score: { label: "คะแนน", value: "SCORE_DESC" },
  trending: { label: "กำลังมาแรง", value: "TRENDING_DESC" },
  newest: { label: "ใหม่ล่าสุด", value: "START_DATE_DESC" },
  title: { label: "ชื่อเรื่อง", value: "TITLE_ROMAJI" },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// อ่านและตรวจค่าจาก URL: genre ต้องอยู่ในรายชื่อที่รู้จัก, sort ต้องเป็น key ใน SORTS
function readParams(params: Record<string, string | string[] | undefined>) {
  const q = firstParam(params.q)?.trim() ?? "";
  const genreParam = firstParam(params.genre);
  const genre = GENRES.find((g) => g === genreParam);
  const sortKey = firstParam(params.sort) ?? "";
  const sort = SORTS[sortKey] ? sortKey : "";
  return { q, genre, sort, page: pageParam(params.page) };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q, genre } = readParams(await searchParams);
  return { title: q ? `ผลการค้นหา "${q}"` : genre ? `${genre} Anime` : "ค้นหาอนิเมะ" };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, genre, sort, page } = readParams(await searchParams);

  // สร้างลิงก์ค้นหาที่คงเงื่อนไขเดิม แล้วเปลี่ยนเฉพาะค่าที่ส่งมา (ใช้กับปุ่มเปลี่ยนหน้า)
  function href(changes: Record<string, string | number | undefined>) {
    const params = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = { q, genre, sort, ...changes };
    for (const [key, value] of Object.entries(merged)) {
      if (value && !(key === "page" && value === 1)) params.set(key, String(value));
    }
    return `/search?${params}`;
  }

  // ถ้ามีคำค้นให้เรียงตามความตรงของชื่อ (SEARCH_MATCH) ถ้าไม่มีให้เรียงตามความนิยม
  const hasFilter = q || genre || sort;
  const result = hasFilter
    ? await getMediaPage({
        type: "ANIME", page, perPage: PER_PAGE,
        search: q || undefined,
        genre,
        sort: [sort ? SORTS[sort].value : q ? "SEARCH_MATCH" : "POPULARITY_DESC"],
      })
    : null;

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">
          {q ? `ผลการค้นหา "${q}"` : genre ? `${genre} Anime` : "Browse Anime"}
        </h1>
        <p className="page-sub">
          {result ? `พบ ${result.pageInfo.total.toLocaleString()} เรื่อง` : "ค้นหาจากชื่อเรื่อง หรือเลือกแนวที่สนใจ"}
        </p>
      </div>

      <form className="search-panel" action="/search">
        <label className="field field-grow">
          <span>ค้นหา</span>
          <input name="q" defaultValue={q} placeholder="ชื่อเรื่อง..." />
        </label>
        <label className="field">
          <span>แนว</span>
          <select name="genre" defaultValue={genre ?? ""}>
            <option value="">ทุกแนว</option>
            {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <label className="field">
          <span>เรียงตาม</span>
          <select name="sort" defaultValue={sort}>
            <option value="">ค่าเริ่มต้น</option>
            {Object.entries(SORTS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
          </select>
        </label>
        <button type="submit" className="btn btn-accent">ค้นหา</button>
      </form>

      {!result && (
        <section className="row">
          <h2 className="row-head">Genres</h2>
          <ul className="genre-list">
            {GENRES.map((g) => (
              <li key={g}><Link href={`/search?genre=${encodeURIComponent(g)}`}>{g}</Link></li>
            ))}
          </ul>
        </section>
      )}

      {result && result.media.length === 0 && <p className="empty">ไม่พบเรื่องที่ตรงกับเงื่อนไข</p>}

      {result && result.media.length > 0 && (
        <>
          <Pagination page={page} hasNext={result.pageInfo.hasNextPage} makeHref={(p) => href({ page: p })} perPage={PER_PAGE} />
          <div className="card-grid card-grid-wide">
            {result.media.map((m) => <MediaCard key={m.id} media={m} />)}
          </div>
          <Pagination page={page} hasNext={result.pageInfo.hasNextPage} makeHref={(p) => href({ page: p })} perPage={PER_PAGE} />
        </>
      )}
    </>
  );
}
