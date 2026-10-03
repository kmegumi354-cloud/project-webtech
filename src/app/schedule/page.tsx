// =====================================================================
// app/schedule/page.tsx — ตารางฉายอนิเมะรายวัน (/schedule?day=0..6)
// 1. คำนวณช่วงเวลาของแต่ละวันตามเวลาประเทศไทย (UTC+7) เพราะ server ของ Vercel ใช้เวลา UTC
// 2. ปุ่มเลือกวัน 7 ปุ่ม: วันนี้, พรุ่งนี้ และอีก 5 วันถัดไป (ส่งเลขวันผ่าน URL จึงแชร์ลิงก์ได้)
// 3. ดึง airingSchedules ของวันที่เลือกจาก AniList (หน้าละ 50 รายการ วนจนครบ)
// 4. แสดงเรียงตามเวลาฉาย พร้อมตอนที่ฉาย นับถอยหลัง และปุ่มติดตาม
// =====================================================================
import Link from "next/link";
import type { Metadata } from "next";
import CardWatchButton from "@/components/CardWatchButton";
import TimeAgo from "@/components/TimeAgo";
import type { Media } from "@/lib/anilist";
import { MEDIA_FIELDS, anilist, displayTitle, firstParam, formatLabel, mediaHref } from "@/lib/anilist";

export const metadata: Metadata = { title: "ตารางฉาย" };

const TZ = "Asia/Bangkok";
const TZ_OFFSET = 7 * 3600; // ประเทศไทยไม่มี daylight saving จึงบวก 7 ชั่วโมงคงที่ได้
const DAY = 86_400;
const MAX_PAGES = 4;

const SCHEDULE_QUERY = /* GraphQL */ `
  query ($page: Int, $start: Int, $end: Int) {
    Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
        id episode airingAt
        media { ...media isAdult }
      }
    }
  }
  ${MEDIA_FIELDS}
`;

type Airing = { id: number; episode: number; airingAt: number; media: Media & { isAdult: boolean } };
type SchedulePage = { Page: { pageInfo: { hasNextPage: boolean }; airingSchedules: Airing[] } };

// เวลาเริ่มต้นของวัน (00:00 เวลาไทย) ในหน่วยวินาที นับจากวันนี้ไป offset วัน
function dayStart(now: number, offset: number) {
  return Math.floor((now + TZ_OFFSET) / DAY) * DAY - TZ_OFFSET + offset * DAY;
}

const weekdayFormat = new Intl.DateTimeFormat("th-TH", { weekday: "long", timeZone: TZ });
const dateFormat = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: TZ });
const timeFormat = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });

function dayLabel(offset: number, start: number) {
  if (offset === 0) return "วันนี้";
  if (offset === 1) return "พรุ่งนี้";
  return weekdayFormat.format(new Date(start * 1000)).replace("วัน", "");
}

// ดึงทุกตอนที่ฉายในช่วงเวลานั้น (AniList ให้หน้าละไม่เกิน 50 รายการ)
async function getAirings(start: number, end: number) {
  const all: Airing[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await anilist<SchedulePage>(SCHEDULE_QUERY, { page, start: start - 1, end });
    all.push(...data.Page.airingSchedules);
    if (!data.Page.pageInfo.hasNextPage) break;
  }
  return all.filter((a) => !a.media.isAdult);
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SchedulePage({ searchParams }: Props) {
  const params = await searchParams;
  const dayParam = Number(firstParam(params.day));
  const selected = Number.isInteger(dayParam) && dayParam >= 0 && dayParam <= 6 ? dayParam : 0;

  const now = Math.floor(Date.now() / 1000);
  const days = Array.from({ length: 7 }, (_, offset) => {
    const start = dayStart(now, offset);
    return { offset, start, label: dayLabel(offset, start), date: dateFormat.format(new Date(start * 1000)) };
  });
  const day = days[selected];
  const airings = await getAirings(day.start, day.start + DAY);
  const aired = airings.filter((a) => a.airingAt <= now).length;

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">ตารางฉาย</h1>
        <p className="page-sub">ตอนใหม่ที่ออกอากาศแต่ละวัน แสดงตามเวลาประเทศไทย</p>
      </div>

      <nav className="day-tabs" aria-label="เลือกวัน">
        {days.map((d) => (
          <Link
            key={d.offset}
            href={d.offset === 0 ? "/schedule" : `/schedule?day=${d.offset}`}
            className={d.offset === selected ? "day-tab active" : "day-tab"}
            aria-current={d.offset === selected ? "page" : undefined}
          >
            <span className="day-tab-name">{d.label}</span>
            <span className="day-tab-date">{d.date}</span>
          </Link>
        ))}
      </nav>

      <section className="row">
        <h2 className="row-head">
          {weekdayFormat.format(new Date(day.start * 1000))} {day.date}
          <span className="row-count">
            {airings.length} ตอน{selected === 0 && airings.length > 0 ? ` · ออกแล้ว ${aired}` : ""}
          </span>
        </h2>

        {airings.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">ยังไม่มีตารางฉายของวันนี้</p>
            <p>AniList อาจยังไม่ได้ประกาศเวลาฉายของวันที่เลือก</p>
          </div>
        ) : (
          <ol className="sched-list">
            {airings.map((a) => {
              const m = a.media;
              const href = mediaHref(m);
              const isPast = a.airingAt <= now;
              const studio = m.studios.nodes[0]?.name;
              return (
                <li key={a.id} className={isPast ? "sched-row past" : "sched-row"}>
                  <time className="sched-time" dateTime={new Date(a.airingAt * 1000).toISOString()}>
                    {timeFormat.format(new Date(a.airingAt * 1000))}
                  </time>
                  <div className="sched-card">
                    <div className="sched-cover">
                      <Link href={href} tabIndex={-1} aria-hidden="true">
                        {m.coverImage.medium && <img src={m.coverImage.medium} alt="" loading="lazy" />}
                      </Link>
                      <CardWatchButton mediaId={m.id} />
                    </div>
                    <div className="sched-info">
                      <Link href={href} className="sched-title">{displayTitle(m.title)}</Link>
                      <div className="sched-meta">
                        <span className="sched-ep">ตอนที่ {a.episode}{m.episodes ? ` / ${m.episodes}` : ""}</span>
                        <span>{formatLabel(m.format)}</span>
                        {studio && <span>{studio}</span>}
                      </div>
                    </div>
                    <div className="sched-status">
                      {isPast ? <span className="sched-aired">ออกอากาศแล้ว</span> : <TimeAgo at={a.airingAt} className="sched-countdown" />}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </>
  );
}
