// =====================================================================
// app/seasonal/page.tsx — อนิเมะตามซีซัน (/seasonal?year=2026&season=fall)
// ไม่ระบุ year/season จะใช้ซีซันปัจจุบัน แท็บด้านบนเลื่อนไปซีซันก่อนหน้า/ถัดไปได้
// ดึง 50 เรื่องที่นิยมที่สุดของซีซัน แล้วแบ่งกลุ่มตามรูปแบบ (TV, ONA, Movie ...)
// =====================================================================
import Link from "next/link";
import type { Metadata } from "next";
import MediaCard from "@/components/MediaCard";
import type { Season } from "@/lib/anilist";
import { currentSeason, firstParam, getMediaPage, seasonLabel, shiftSeason } from "@/lib/anilist";

const SEASONS: Season[] = ["WINTER", "SPRING", "SUMMER", "FALL"];

function seasonHref(s: { season: Season; year: number }) {
  return `/seasonal?year=${s.year}&season=${s.season.toLowerCase()}`;
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function readParams(params: Record<string, string | string[] | undefined>) {
  const now = currentSeason();
  const seasonParam = firstParam(params.season)?.toUpperCase();
  const yearParam = Number(firstParam(params.year));
  return {
    season: SEASONS.find((s) => s === seasonParam) ?? now.season,
    year: Number.isInteger(yearParam) && yearParam > 1900 && yearParam < 2100 ? yearParam : now.year,
  };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { season, year } = readParams(await searchParams);
  return { title: `${seasonLabel(season, year)} Anime` };
}

// ลำดับกลุ่มที่แสดง แต่ละกลุ่มรวม format ของ AniList ที่ระบุไว้
const GROUPS: { label: string; formats: string[] }[] = [
  { label: "TV", formats: ["TV"] },
  { label: "TV Short", formats: ["TV_SHORT"] },
  { label: "ONA", formats: ["ONA"] },
  { label: "OVA / Special", formats: ["OVA", "SPECIAL"] },
  { label: "Movie", formats: ["MOVIE"] },
  { label: "อื่น ๆ", formats: ["MUSIC"] },
];

export default async function SeasonalPage({ searchParams }: Props) {
  const { season, year } = readParams(await searchParams);
  // แท็บ 4 ซีซัน: ย้อนหลัง 2, ปัจจุบัน, ถัดไป 1
  const tabs = [-2, -1, 0, 1].map((step) => shiftSeason(season, year, step));
  const result = await getMediaPage({
    type: "ANIME", season, seasonYear: year, perPage: 50, sort: ["POPULARITY_DESC"],
  });

  return (
    <>
      <h1 className="page-title">{seasonLabel(season, year)} Anime</h1>
      <nav className="tabs" aria-label="เลือกซีซัน">
        <Link href={seasonHref(shiftSeason(season, year, -4))}>« ปีก่อน</Link>
        {tabs.map((t) => (
          <Link
            key={`${t.season}-${t.year}`}
            href={seasonHref(t)}
            className={t.season === season && t.year === year ? "active" : undefined}
          >
            {seasonLabel(t.season, t.year)}
          </Link>
        ))}
        <Link href={seasonHref(shiftSeason(season, year, 4))}>ปีถัดไป »</Link>
      </nav>

      {result.media.length === 0 && <p className="empty">ยังไม่มีข้อมูลอนิเมะในซีซันนี้</p>}

      {GROUPS.map((group) => {
        const items = result.media.filter((m) => m.format && group.formats.includes(m.format));
        if (items.length === 0) return null;
        return (
          <section key={group.label} className="row">
            <h2 className="row-head">{group.label} <span className="row-count">{items.length} เรื่อง</span></h2>
            <div className="card-grid card-grid-wide">
              {items.map((m) => <MediaCard key={m.id} media={m} />)}
            </div>
          </section>
        );
      })}
    </>
  );
}
