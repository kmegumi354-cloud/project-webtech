// =====================================================================
// components/MediaCard.tsx — การ์ดอนิเมะ (หน้าแรก, ค้นหา, Seasonal)
// ปก + ปุ่มติดตาม → ชื่อเรื่อง → (ถ้าเป็นแถว Recently Aired) ตอนที่ + เวลาที่ออกอากาศ
// ชี้เมาส์แล้วมีกล่อง .media-card-pop โผล่ข้างการ์ด (ทำด้วย CSS ล้วน ไม่ใช้ JavaScript)
// =====================================================================
import Link from "next/link";
import CardWatchButton from "./CardWatchButton";
import TimeAgo from "./TimeAgo";
import type { Media } from "@/lib/anilist";
import { displayTitle, formatLabel, mediaHref, seasonLabel } from "@/lib/anilist";

// episode/airedAt ส่งมาเฉพาะการ์ดในแถว Recently Aired
type Props = {
  media: Media;
  episode?: number;
  airedAt?: number;
};

export default function MediaCard({ media, episode, airedAt }: Props) {
  const href = mediaHref(media);
  const title = displayTitle(media.title);
  const studio = media.studios.nodes[0]?.name;
  const units = media.episodes ? `${media.episodes} ตอน` : null;

  return (
    <article className="media-card">
      <div className="media-card-media">
        <Link href={href} className="media-card-cover" tabIndex={-1} aria-hidden="true">
          {media.coverImage.large && <img src={media.coverImage.large} alt="" loading="lazy" />}
        </Link>
        <CardWatchButton mediaId={media.id} />
      </div>
      <Link href={href} className="media-card-title" title={title}>{title}</Link>
      {episode && airedAt && (
        <div className="media-card-sub">
          ตอนที่ {episode} · <TimeAgo at={airedAt} className="when" />
        </div>
      )}

      {/* กล่องรายละเอียดตอนชี้เมาส์: ตอนถัดไป/ซีซัน, คะแนน %, สตูดิโอ, รูปแบบ, แนว */}
      <div className="media-card-pop" aria-hidden="true">
        <div className="pop-head">
          <span>
            {media.nextAiringEpisode
              ? <>ตอนที่ {media.nextAiringEpisode.episode} · <TimeAgo at={media.nextAiringEpisode.airingAt} /></>
              : seasonLabel(media.season, media.seasonYear)}
          </span>
          {media.averageScore && <span className="pop-score">{media.averageScore}%</span>}
        </div>
        {studio && <div className="pop-studio">{studio}</div>}
        <div className="pop-info">
          {formatLabel(media.format)}{units && <> · {units}</>}
        </div>
        {media.genres.length > 0 && (
          <div className="pop-genres">
            {media.genres.slice(0, 3).map((g) => <span key={g}>{g}</span>)}
          </div>
        )}
      </div>
    </article>
  );
}
