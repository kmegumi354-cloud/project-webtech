// =====================================================================
// app/page.tsx — หน้าแรก (/)
// ดึงข้อมูล 3 แถวใน GraphQL request เดียวด้วย alias (recent, seasonal, trending)
//   Trending Now        → อนิเมะที่กำลังมาแรง
//   Popular This Season → อนิเมะยอดนิยมของซีซันปัจจุบัน
//   Recently Aired      → ตอนที่ออกอากาศใน 7 วันล่าสุด (จาก airingSchedules)
// =====================================================================
import Link from "next/link";
import MediaCard from "@/components/MediaCard";
import type { Media } from "@/lib/anilist";
import { MEDIA_FIELDS, anilist, currentSeason } from "@/lib/anilist";

// สร้างหน้าใหม่ทุก 5 นาที เพื่อให้แถว Recently Aired ไม่เก่าเกินไป
export const revalidate = 300;

const HOME_QUERY = /* GraphQL */ `
  query ($season: MediaSeason, $year: Int, $now: Int, $since: Int) {
    recent: Page(perPage: 40) {
      airingSchedules(airingAt_greater: $since, airingAt_lesser: $now, sort: TIME_DESC) {
        id episode airingAt
        media { ...media isAdult }
      }
    }
    seasonal: Page(perPage: 6) {
      media(season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC, isAdult: false) { ...media }
    }
    trending: Page(perPage: 6) {
      media(type: ANIME, sort: TRENDING_DESC, isAdult: false) { ...media }
    }
  }
  ${MEDIA_FIELDS}
`;

type Section = { media: Media[] };
type AiringSchedule = { id: number; episode: number; airingAt: number; media: Media & { isAdult: boolean } };
type HomeData = Record<"seasonal" | "trending", Section> & {
  recent: { airingSchedules: AiringSchedule[] };
};

// Server Component: ดึงข้อมูลบน server แล้วส่ง HTML ที่มีข้อมูลครบไปให้ browser
export default async function HomePage() {
  const { season, year } = currentSeason();
  const now = Math.floor(Date.now() / 1000);
  const data = await anilist<HomeData>(HOME_QUERY, { season, year, now, since: now - 7 * 86_400 });
  // ตัดเรื่องสำหรับผู้ใหญ่ออก แล้วเอาแค่ 12 ตอนล่าสุด
  const recent = data.recent.airingSchedules.filter((s) => !s.media.isAdult).slice(0, 12);

  return (
    <>
      <h1 className="visually-hidden">AniExplorer</h1>

      <section className="row">
        <h2 className="row-head">
          Trending Now
          <Link href="/search?sort=trending">View All</Link>
        </h2>
        <div className="card-grid">
          {data.trending.media.map((m) => <MediaCard key={m.id} media={m} />)}
        </div>
      </section>

      <section className="row">
        <h2 className="row-head">
          Popular This Season
          <Link href="/seasonal">View All</Link>
        </h2>
        <div className="card-grid">
          {data.seasonal.media.map((m) => <MediaCard key={m.id} media={m} />)}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="row">
          <h2 className="row-head">
            Recently Aired
            <Link href="/seasonal">View All</Link>
          </h2>
          <div className="card-grid">
            {recent.map((s) => (
              <MediaCard key={s.id} media={s.media} episode={s.episode} airedAt={s.airingAt} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
