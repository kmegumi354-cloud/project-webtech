// =====================================================================
// components/MediaDetailView.tsx — เนื้อหาหน้ารายละเอียดอนิเมะ
// โครงหน้า: banner → header (ปก + ปุ่มติดตาม + ชื่อ + เรื่องย่อ)
//         → แถบข้าง (ข้อมูลเรื่อง, แนว) | เนื้อหาหลัก (สถิติ, Relations, Characters, Trailer, Recommendations)
// ไอคอนเป็น SVG inline เพื่อไม่ต้องติดตั้งไลบรารีไอคอนเพิ่ม
// =====================================================================
import Link from "next/link";
import type { MediaDetail } from "@/lib/anilist";
import {
  cleanDescription, dateRange, displayTitle, enumLabel, formatLabel, formatNumber,
  mediaHref, seasonLabel, statusLabel,
} from "@/lib/anilist";
import TimeAgo from "./TimeAgo";
import WatchButton from "./WatchButton";

// 1 แถวข้อมูลในแถบข้าง: หัวข้อตัวหนา + ค่าอยู่ด้านล่าง
function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="info-item">
      <div className="info-label">{label}</div>
      <div className="info-value">{children}</div>
    </div>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V18h3v3H8v-3h3v-3.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3zm0 4H6v1a2 2 0 0 0 1 1.7zm10 0v2.7A2 2 0 0 0 18 8V7z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.2C1 8.6 3 5 6.6 5c2.1 0 3.6 1.2 4.4 2.5C11.8 6.2 13.3 5 15.4 5 19 5 21 8.6 19.6 11.8 17.5 16.4 12 21 12 21" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m7.5 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6M9 13c-3.9 0-7 1.9-7 4.5V20h14v-2.5C16 14.9 12.9 13 9 13m7.6.1c1.5.8 2.4 2.1 2.4 3.9V20h3v-2.6c0-2.3-2.4-3.9-5.4-4.3" />
    </svg>
  );
}

// ---------- คำนวณค่าที่ต้องแสดงจากข้อมูลดิบ ----------
export default function MediaDetailView({ media }: { media: MediaDetail }) {
  const title = displayTitle(media.title);
  const mainTitle = media.title.romaji ?? title;
  // rankings มีหลายแบบ (รายปี/รายซีซัน) เลือกเฉพาะอันดับตลอดกาล
  const ranked = media.rankings.find((r) => r.type === "RATED" && r.allTime)?.rank;
  const popularity = media.rankings.find((r) => r.type === "POPULAR" && r.allTime)?.rank;
  // จำนวนคนให้คะแนน = ผลรวมของทุกช่วงคะแนนใน scoreDistribution
  const scoredBy = media.stats?.scoreDistribution.reduce((sum, s) => sum + s.amount, 0) ?? 0;
  const synopsis = cleanDescription(media.description);
  const studios = media.studios.nodes;
  // แสดงเฉพาะเรื่องที่เป็นอนิเมะ เพราะเว็บนี้ไม่มีหน้ามังงะ
  const relations = media.relations.edges.filter((e) => e.node.type === "ANIME");
  const recommendations = media.recommendations.nodes
    .map((n) => n.mediaRecommendation)
    .filter((m): m is NonNullable<typeof m> => m?.type === "ANIME");
  const seasonHref = media.season
    ? `/seasonal?year=${media.seasonYear}&season=${media.season.toLowerCase()}`
    : null;

  return (
    <div className="detail">
      {/* banner: ถ้าเรื่องไหนไม่มีภาพจะใช้แถบไล่สีแทน */}
      <div className={media.bannerImage ? "detail-banner" : "detail-banner detail-banner-empty"}>
        {media.bannerImage && <img src={media.bannerImage} alt="" />}
      </div>

      {/* header: ปกลอยทับ banner, ปุ่มติดตาม/ตัวนับตอน, ชื่อ, ป้าย และเรื่องย่อ */}
      <header className="detail-header">
        <div className="detail-cover-col">
          {media.coverImage.large && <img className="detail-cover" src={media.coverImage.large} alt={title} />}
          <div className="detail-actions">
            <WatchButton mediaId={media.id} total={media.episodes} />
          </div>
        </div>

        <div className="detail-intro">
          <h1>{mainTitle}</h1>
          {media.title.english && media.title.english !== mainTitle && (
            <p className="detail-subtitle">{media.title.english}</p>
          )}
          <div className="detail-tags">
            <span className="tag">{formatLabel(media.format)}</span>
            {media.season && <span className="tag">{seasonLabel(media.season, media.seasonYear)}</span>}
            <span className="tag">{statusLabel(media.status)}</span>
            {media.nextAiringEpisode && (
              <span className="tag tag-live">
                ตอนที่ {media.nextAiringEpisode.episode} · <TimeAgo at={media.nextAiringEpisode.airingAt} />
              </span>
            )}
          </div>
          <p className="detail-synopsis">{synopsis || "ยังไม่มีเรื่องย่อสำหรับเรื่องนี้"}</p>
        </div>
      </header>

      {/* ส่วนล่าง: แถบข้างซ้าย + เนื้อหาหลักขวา (บนมือถือเรียงเป็นคอลัมน์เดียว) */}
      <div className="detail-body">
        <aside className="detail-side">
          <div className="side-panel">
            {media.nextAiringEpisode && (
              <InfoItem label="Airing">
                <span className="fresh">ตอนที่ {media.nextAiringEpisode.episode}: <TimeAgo at={media.nextAiringEpisode.airingAt} /></span>
              </InfoItem>
            )}
            <InfoItem label="Format">{formatLabel(media.format)}</InfoItem>
            <InfoItem label="Episodes">{media.episodes ?? "Unknown"}</InfoItem>
            {media.duration && <InfoItem label="Episode Duration">{media.duration} mins</InfoItem>}
            <InfoItem label="Status">{statusLabel(media.status)}</InfoItem>
            <InfoItem label="Aired">{dateRange(media)}</InfoItem>
            {seasonHref && (
              <InfoItem label="Season">
                <Link href={seasonHref}>{seasonLabel(media.season, media.seasonYear)}</Link>
              </InfoItem>
            )}
            <InfoItem label="Studios">{studios.length ? studios.map((s) => s.name).join(", ") : "Unknown"}</InfoItem>
            <InfoItem label="Source">{enumLabel(media.source)}</InfoItem>
            {media.title.romaji && <InfoItem label="Romaji">{media.title.romaji}</InfoItem>}
            {media.title.english && <InfoItem label="English">{media.title.english}</InfoItem>}
            {media.title.native && <InfoItem label="Native">{media.title.native}</InfoItem>}
            {media.synonyms.length > 0 && (
              <InfoItem label="Synonyms">
                {media.synonyms.slice(0, 6).map((s) => <div key={s}>{s}</div>)}
                {media.synonyms.length > 6 && <div>และอีก {media.synonyms.length - 6} ชื่อ</div>}
              </InfoItem>
            )}
          </div>

          {media.genres.length > 0 && (
            <div className="side-panel">
              <div className="info-label">Genres</div>
              <div className="genre-tags">
                {media.genres.map((g) => (
                  <Link key={g} href={`/search?genre=${encodeURIComponent(g)}`}>{g}</Link>
                ))}
              </div>
            </div>
          )}

          <a className="side-link" href={`https://anilist.co/anime/${media.id}`} target="_blank" rel="noreferrer">
            ดูบน AniList ↗
          </a>
        </aside>

        <main className="detail-main">
          {/* การ์ดสถิติ 4 ใบ: คะแนน, อันดับ, ผู้ติดตาม, คนที่ชื่นชอบ */}
          <div className="stat-cards">
            <div className="stat-card">
              <span className="stat-icon star"><StarIcon /></span>
              <div>
                <div className="stat-value">{media.averageScore ? `${media.averageScore}%` : "N/A"}</div>
                <div className="stat-label">คะแนนเฉลี่ย{scoredBy > 0 && ` · ${formatNumber(scoredBy)} คน`}</div>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon trophy"><TrophyIcon /></span>
              <div>
                <div className="stat-value">{ranked ? `#${ranked}` : "N/A"}</div>
                <div className="stat-label">อันดับคะแนนตลอดกาล</div>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon users"><UsersIcon /></span>
              <div>
                <div className="stat-value">{formatNumber(media.popularity)}</div>
                <div className="stat-label">ผู้ติดตาม{popularity && ` · ยอดนิยม #${popularity}`}</div>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon heart"><HeartIcon /></span>
              <div>
                <div className="stat-value">{formatNumber(media.favourites)}</div>
                <div className="stat-label">คนที่ชื่นชอบ</div>
              </div>
            </div>
          </div>

          {relations.length > 0 && (
            <section className="detail-section">
              <h2 className="detail-section-head">Relations</h2>
              <div className="relation-grid">
                {relations.map((e) => (
                  <Link key={e.node.id} href={mediaHref(e.node)} className="relation-card">
                    {e.node.coverImage.medium && <img src={e.node.coverImage.medium} alt="" loading="lazy" />}
                    <div className="relation-info">
                      <div className="relation-type">{enumLabel(e.relationType)}</div>
                      <div className="relation-title">{displayTitle(e.node.title)}</div>
                      <div className="relation-format">{formatLabel(e.node.format)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {media.characters.edges.length > 0 && (
            <section className="detail-section">
              <h2 className="detail-section-head">Characters</h2>
              <div className="character-grid">
                {media.characters.edges.map((edge) => {
                  const va = edge.voiceActors[0];
                  return (
                    <div key={edge.node.id} className="character-card">
                      <div className="person">
                        {edge.node.image.medium && <img src={edge.node.image.medium} alt="" loading="lazy" />}
                        <div className="person-info">
                          <div className="person-name">{edge.node.name.full}</div>
                          <div className="person-role">{enumLabel(edge.role)}</div>
                        </div>
                      </div>
                      {va && (
                        <div className="person person-right">
                          <div className="person-info">
                            <div className="person-name">{va.name.full}</div>
                            <div className="person-role">{va.languageV2}</div>
                          </div>
                          {va.image.medium && <img src={va.image.medium} alt="" loading="lazy" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ใช้ youtube-nocookie เพื่อไม่ให้ YouTube ตั้ง cookie ติดตามผู้ใช้จนกว่าจะกดเล่น */}
          {media.trailer?.site === "youtube" && (
            <section className="detail-section">
              <h2 className="detail-section-head">Trailer</h2>
              <div className="trailer">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(media.trailer.id)}`}
                  title={`${title} trailer`}
                  allow="encrypted-media; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </section>
          )}

          {recommendations.length > 0 && (
            <section className="detail-section">
              <h2 className="detail-section-head">Recommendations</h2>
              <div className="rec-grid">
                {recommendations.map((m) => (
                  <Link key={m.id} href={mediaHref(m)} className="rec-card">
                    <span className="rec-cover">
                      {m.coverImage.large && <img src={m.coverImage.large} alt="" loading="lazy" />}
                    </span>
                    <span className="rec-title">{displayTitle(m.title)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
