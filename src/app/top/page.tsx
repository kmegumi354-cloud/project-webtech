// =====================================================================
// app/top/page.tsx — หน้าจัดอันดับอนิเมะ (/top?filter=...&page=...)
// 1. readParams() อ่านตัวกรองและเลขหน้าจาก URL
// 2. getMediaPage() ดึง 50 เรื่องตามเงื่อนไขของตัวกรองนั้น
// 3. แสดงเป็นการ์ดทีละอันดับ (RankRow) พร้อมปุ่มเปลี่ยนหน้า
// =====================================================================
import Link from "next/link";
import type { Metadata } from "next";
import CardWatchButton from "@/components/CardWatchButton";
import Pagination from "@/components/Pagination";
import type { Media, PageVariables } from "@/lib/anilist";
import {
  displayTitle, firstParam, formatLabel, formatNumber, getMediaPage, mediaHref, pageParam,
  seasonLabel, statusLabel,
} from "@/lib/anilist";

// ตัวกรองแต่ละปุ่ม: key ใช้ใน URL, vars คือเงื่อนไขที่ส่งไป AniList
type Filter = { key: string; label: string; vars: Partial<PageVariables> };

const SCORE = ["SCORE_DESC", "POPULARITY_DESC"];

const FILTERS: Filter[] = [
  { key: "all", label: "All Anime", vars: { sort: SCORE } },
  { key: "airing", label: "Top Airing", vars: { sort: SCORE, status: "RELEASING" } },
  { key: "tv", label: "TV Series", vars: { sort: SCORE, format: "TV" } },
  { key: "movie", label: "Movies", vars: { sort: SCORE, format: "MOVIE" } },
  { key: "ova", label: "OVAs", vars: { sort: SCORE, format: "OVA" } },
  { key: "ona", label: "ONAs", vars: { sort: SCORE, format: "ONA" } },
  { key: "bypopularity", label: "Most Popular", vars: { sort: ["POPULARITY_DESC"] } },
  { key: "favorite", label: "Most Favorited", vars: { sort: ["FAVOURITES_DESC"] } },
];

const PER_PAGE = 50;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function readParams(params: Record<string, string | string[] | undefined>) {
  const filter = FILTERS.find((f) => f.key === firstParam(params.filter)) ?? FILTERS[0];
  return { filter, page: pageParam(params.page) };
}

// แบ่งสีคะแนน: เขียว ≥ 75, ส้ม 60–74, แดง < 60
function scoreTone(score: number | null) {
  if (!score) return "none";
  if (score >= 75) return "high";
  if (score >= 60) return "mid";
  return "low";
}

// การ์ด 1 อันดับ: เลขอันดับ | ปก + ปุ่มติดตาม | ชื่อ + แนว | คะแนน | รูปแบบ | ซีซัน
function RankRow({ media, rank }: { media: Media; rank: number }) {
  const href = mediaHref(media);
  const tone = scoreTone(media.averageScore);
  return (
    <li className="rank-row">
      <div className={`rank-num${rank <= 3 ? ` top${rank}` : ""}`}>
        <span className="rank-hash">#</span>{rank}
      </div>
      <div className="rank-card">
        <div className="rank-cover">
          <Link href={href} tabIndex={-1} aria-hidden="true">
            {media.coverImage.medium && <img src={media.coverImage.medium} alt="" loading="lazy" />}
          </Link>
          <CardWatchButton mediaId={media.id} />
        </div>

        <div className="rank-main">
          <Link href={href} className="rank-title">{displayTitle(media.title)}</Link>
          <div className="rank-genres">
            {media.genres.slice(0, 4).map((g) => (
              <Link key={g} href={`/search?genre=${encodeURIComponent(g)}`}>{g}</Link>
            ))}
          </div>
        </div>

        <div className={`rank-col rank-score ${tone}`}>
          <div className="rank-col-main">{media.averageScore ? `${media.averageScore}%` : "N/A"}</div>
          <div className="rank-col-sub">{formatNumber(media.popularity)} users</div>
          {media.averageScore && (
            <div className="score-meter"><span style={{ width: `${media.averageScore}%` }} /></div>
          )}
        </div>

        <div className="rank-col rank-format">
          <div className="rank-col-main">{formatLabel(media.format)}</div>
          <div className="rank-col-sub">{media.episodes ? `${media.episodes} ตอน` : "? ตอน"}</div>
        </div>

        <div className="rank-col rank-season">
          <div className="rank-col-main">{seasonLabel(media.season, media.seasonYear ?? media.startDate.year)}</div>
          <div className="rank-col-sub">{statusLabel(media.status)}</div>
        </div>
      </div>
    </li>
  );
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { filter } = readParams(await searchParams);
  return { title: `${filter.label} - Top Anime` };
}

export default async function TopPage({ searchParams }: Props) {
  const { filter, page } = readParams(await searchParams);
  const result = await getMediaPage({ type: "ANIME", page, perPage: PER_PAGE, sort: [], ...filter.vars });
  // สร้างลิงก์ไปหน้าอื่นโดยคงตัวกรองเดิมไว้
  const href = (p: number) => `/top?filter=${filter.key}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Top Anime</h1>
        <p className="page-sub">อนิเมะที่ได้คะแนนและความนิยมสูงสุดตลอดกาลจากผู้ใช้ AniList</p>
      </div>
      <div className="top-head">
        <nav className="tabs" aria-label="ตัวกรอง">
          {FILTERS.map((f) => (
            <Link key={f.key} href={`/top?filter=${f.key}`} className={f.key === filter.key ? "active" : undefined}>
              {f.label}
            </Link>
          ))}
        </nav>
      </div>

      {result.media.length === 0 ? (
        <p className="empty">ไม่พบข้อมูล</p>
      ) : (
        <ol className="rank-list">
          {result.media.map((m, i) => (
            <RankRow key={m.id} media={m} rank={(page - 1) * PER_PAGE + i + 1} />
          ))}
        </ol>
      )}

      <Pagination page={page} hasNext={result.pageInfo.hasNextPage} makeHref={href} perPage={PER_PAGE} />
    </>
  );
}
