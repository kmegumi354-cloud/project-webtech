// =====================================================================
// lib/anilist.ts — ชั้นติดต่อ AniList GraphQL API
// ทุกหน้าที่ต้องใช้ข้อมูลอนิเมะจะเรียกผ่านไฟล์นี้ (ฝั่ง server เท่านั้น)
//   1. anilist()        ส่ง query + variables ไปที่ graphql.anilist.co แล้วคืนค่า data
//   2. getMediaDetail() ดึงข้อมูลเต็มของอนิเมะ 1 เรื่อง (หน้ารายละเอียด)
//   3. getMediaPage()   ดึงรายการอนิเมะแบบแบ่งหน้า (Top, ค้นหา, ซีซัน)
//   4. ฟังก์ชันช่วย      แปลงข้อมูลดิบเป็นข้อความที่แสดงบนหน้าเว็บ
// =====================================================================
import { cache } from "react";   //data

const API_URL = "https://graphql.anilist.co";

// ---------- type ของข้อมูลที่ได้จาก AniList ----------
export type MediaType = "ANIME" | "MANGA";
export type Season = "WINTER" | "SPRING" | "SUMMER" | "FALL";

export type FuzzyDate = { year: number | null; month: number | null; day: number | null };

export type Media = {
  id: number;
  type: MediaType;
  format: string | null;
  status: string | null;
  title: { userPreferred: string; english: string | null; romaji: string | null };
  coverImage: { large: string | null; medium: string | null };
  averageScore: number | null;
  popularity: number;
  favourites: number;
  episodes: number | null;
  chapters: number | null;
  volumes: number | null;
  duration: number | null;
  season: Season | null;
  seasonYear: number | null;
  startDate: FuzzyDate;
  endDate: FuzzyDate;
  genres: string[];
  source: string | null;
  studios: { nodes: { id: number; name: string }[] };
  nextAiringEpisode: { episode: number; airingAt: number } | null;
  description?: string | null;
};

export type PageInfo = { currentPage: number; hasNextPage: boolean; total: number };

// error ที่มี status code ติดมาด้วย เพื่อให้หน้ารายละเอียดแยกได้ว่าเป็น 404 (ไม่พบเรื่อง) หรือ error อื่น
export class AniListError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// fragment ของฟิลด์ที่ทุก query ใช้ร่วมกัน ช่วยให้ไม่ต้องเขียนรายชื่อฟิลด์ซ้ำในแต่ละหน้า
export const MEDIA_FIELDS = /* GraphQL */ `
  fragment media on Media {
    id type format status
    title { userPreferred english romaji }
    coverImage { large medium }
    averageScore popularity favourites
    episodes chapters volumes duration
    season seasonYear
    startDate { year month day }
    endDate { year month day }
    genres source
    studios(isMain: true) { nodes { id name } }
    nextAiringEpisode { episode airingAt }
  }
`;

// ส่ง GraphQL request ไปที่ AniList
// - ใช้ POST + JSON body ตามมาตรฐาน GraphQL
// - next.revalidate = 1800 ให้ Next.js แคชผลลัพธ์ 30 นาที ลดการเรียก API ซ้ำ
// - แปลง error ทุกแบบ (429 rate limit, GraphQL errors, HTTP error) เป็น AniListError
export async function anilist<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 1800 },
  });

  const json = await response.json().catch(() => null);
  if (response.status === 429) {
    throw new AniListError("เรียก AniList API ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่", 429);
  }
  if (!response.ok || !json || json.errors) {
    const message = json?.errors?.[0]?.message ?? `เรียกข้อมูลไม่สำเร็จ สถานะ ${response.status}`;
    throw new AniListError(message, json?.errors?.[0]?.status ?? response.status);
  }
  return json.data as T;
}

// ---------- detail ----------

export type MediaDetail = Media & {
  title: Media["title"] & { native: string | null };
  synonyms: string[];
  description: string | null;
  bannerImage: string | null;
  trailer: { id: string; site: string } | null;
  rankings: { rank: number; type: "RATED" | "POPULAR"; allTime: boolean }[];
  stats: { scoreDistribution: { score: number; amount: number }[] } | null;
  characters: {
    edges: {
      role: string;
      node: { id: number; name: { full: string }; image: { medium: string | null } };
      voiceActors: { id: number; name: { full: string }; image: { medium: string | null }; languageV2: string }[];
    }[];
  };
  relations: {
    edges: { relationType: string; node: Pick<Media, "id" | "type" | "format" | "title" | "coverImage"> }[];
  };
  recommendations: {
    nodes: { mediaRecommendation: Pick<Media, "id" | "type" | "title" | "coverImage"> | null }[];
  };
};

// query ของหน้ารายละเอียด: ข้อมูลพื้นฐาน + เรื่องย่อ, อันดับ, ตัวละคร, เรื่องที่เกี่ยวข้อง, เรื่องแนะนำ
const DETAIL_QUERY = /* GraphQL */ `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      ...media
      title { native }
      synonyms
      description(asHtml: false)
      bannerImage
      trailer { id site }
      rankings { rank type allTime }
      stats { scoreDistribution { score amount } }
      characters(sort: [ROLE, RELEVANCE], perPage: 10) {
        edges {
          role
          node { id name { full } image { medium } }
          voiceActors(language: JAPANESE, sort: RELEVANCE) { id name { full } image { medium } languageV2 }
        }
      }
      relations {
        edges {
          relationType(version: 2)
          node { id type format title { userPreferred english romaji } coverImage { large medium } }
        }
      }
      recommendations(sort: RATING_DESC, perPage: 10) {
        nodes { mediaRecommendation { id type title { userPreferred english romaji } coverImage { large medium } } }
      }
    }
  }
  ${MEDIA_FIELDS}
`;

// ห่อด้วย React cache() เพราะทั้ง generateMetadata และตัวหน้าเรียกฟังก์ชันนี้ซ้ำใน request เดียวกัน
export const getMediaDetail = cache(async (id: number) => {
  const data = await anilist<{ Media: MediaDetail }>(DETAIL_QUERY, { id });
  return data.Media;
});

// ---------- list queries ----------

// query กลางสำหรับรายการแบบแบ่งหน้า ตัวแปรที่ไม่ได้ส่งมา (undefined) AniList จะไม่นำไปกรอง
const PAGE_QUERY = /* GraphQL */ `
  query (
    $page: Int, $perPage: Int, $type: MediaType, $sort: [MediaSort], $search: String,
    $status: MediaStatus, $format: MediaFormat, $genre: String,
    $season: MediaSeason, $seasonYear: Int
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { currentPage hasNextPage total }
      media(
        type: $type, sort: $sort, search: $search, status: $status, format: $format,
        genre: $genre, season: $season, seasonYear: $seasonYear, isAdult: false
      ) {
        ...media
      }
    }
  }
  ${MEDIA_FIELDS}
`;

export type PageVariables = {
  page?: number;
  perPage?: number;
  type: MediaType;
  sort: string[];
  search?: string;
  status?: string;
  format?: string;
  genre?: string;
  season?: Season;
  seasonYear?: number;
};

// ใช้ในหน้า Top Anime, ค้นหา และ Seasonal โดยแต่ละหน้าส่งเงื่อนไขกรอง/เรียงที่ต่างกันมา
export async function getMediaPage(variables: PageVariables) {
  const data = await anilist<{ Page: { pageInfo: PageInfo; media: Media[] } }>(PAGE_QUERY, variables);
  return data.Page;
}

// ---------- helpers ----------

// ---------- ฟังก์ชันช่วยแปลงข้อมูล ----------

// รายชื่อแนวที่ใช้ในฟอร์มค้นหา (ตัด Hentai ออก)
export const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", "Horror",
  "Mahou Shoujo", "Mecha", "Music", "Mystery", "Psychological", "Romance",
  "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller",
] as const;

const SEASONS: Season[] = ["WINTER", "SPRING", "SUMMER", "FALL"];

// หาซีซันปัจจุบันจากเดือน: ธ.ค.–ก.พ. = WINTER, มี.ค.–พ.ค. = SPRING, มิ.ย.–ส.ค. = SUMMER, ก.ย.–พ.ย. = FALL
// ธันวาคมนับเป็น WINTER ของปีถัดไปตามธรรมเนียมของวงการอนิเมะ
export function currentSeason(date = new Date()): { season: Season; year: number } {
  const month = date.getMonth();
  if (month === 11) return { season: "WINTER", year: date.getFullYear() + 1 };
  return { season: SEASONS[Math.floor((month + 1) / 3)], year: date.getFullYear() };
}

// เลื่อนซีซันไปข้างหน้า/ถอยหลัง step ซีซัน (4 ซีซัน = 1 ปี) ใช้ทำแท็บในหน้า Seasonal
export function shiftSeason(season: Season, year: number, step: number) {
  const index = SEASONS.indexOf(season) + step;
  return {
    season: SEASONS[((index % 4) + 4) % 4],
    year: year + Math.floor(index / 4),
  };
}

export function seasonLabel(season: Season | null, year: number | null) {
  if (!season) return year ? String(year) : "?";
  return `${season[0]}${season.slice(1).toLowerCase()} ${year ?? ""}`.trim();
}

const FORMAT_LABELS: Record<string, string> = {
  TV: "TV", TV_SHORT: "TV Short", MOVIE: "Movie", SPECIAL: "Special",
  OVA: "OVA", ONA: "ONA", MUSIC: "Music", MANGA: "Manga",
  NOVEL: "Light Novel", ONE_SHOT: "One-shot",
};

export function formatLabel(format: string | null) {
  return format ? FORMAT_LABELS[format] ?? format : "Unknown";
}

export function statusLabel(status: string | null) {
  switch (status) {
    case "FINISHED": return "ฉายจบแล้ว";
    case "RELEASING": return "กำลังฉาย";
    case "NOT_YET_RELEASED": return "ยังไม่เริ่ม";
    case "CANCELLED": return "ยกเลิก";
    case "HIATUS": return "พักการฉาย";
    default: return "ไม่ทราบ";
  }
}

export function enumLabel(value: string | null) {
  if (!value) return "Unknown";
  return value.toLowerCase().split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

// คะแนน AniList เต็ม 100 แปลงเป็นเต็ม 10 แบบทศนิยม 2 ตำแหน่ง
export function formatScore(score: number | null) {
  return score ? (score / 10).toFixed(2) : "N/A";
}

export function formatNumber(n: number) {
  return n.toLocaleString("en-US");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(date: FuzzyDate, withDay = true) {
  if (!date.year) return "?";
  if (!date.month) return String(date.year);
  const day = withDay && date.day ? ` ${date.day},` : "";
  return `${MONTHS[date.month - 1]}${day} ${date.year}`;
}

// แสดงช่วงวันที่ฉาย เช่น "Sep 29, 2023 to Mar 22, 2024" ถ้ายังไม่จบจะแสดง "to ?"
export function dateRange(media: Pick<Media, "startDate" | "endDate">, withDay = true) {
  const start = formatDate(media.startDate, withDay);
  if (media.endDate.year && media.endDate.year === media.startDate.year
      && media.endDate.month === media.startDate.month && media.endDate.day === media.startDate.day) {
    return start;
  }
  return `${start} to ${media.endDate.year ? formatDate(media.endDate, withDay) : "?"}`;
}

export function unitCount(media: Pick<Media, "episodes">) {
  return media.episodes ? `${media.episodes} eps` : "? eps";
}

// ลิงก์ไปหน้ารายละเอียดของอนิเมะ
export function mediaHref(media: Pick<Media, "id">) {
  return `/anime/${media.id}`;
}

// เลือกชื่อที่แสดง: ภาษาอังกฤษก่อน ถ้าไม่มีใช้ชื่อที่ AniList แนะนำ หรือชื่อโรมาจิ
export function displayTitle(title: Media["title"]) {
  return title.english ?? title.userPreferred ?? title.romaji ?? "Untitled";
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&quot;": '"', "&#039;": "'", "&lt;": "<", "&gt;": ">", "&mdash;": "—" };

// เรื่องย่อจาก AniList มีแท็ก HTML ปน: แปลง <br> เป็นขึ้นบรรทัดใหม่ ลบแท็กอื่น และแปลง HTML entity
// ผลลัพธ์เป็นข้อความล้วน React จะ escape ให้อีกชั้น จึงปลอดภัยจาก XSS
export function cleanDescription(text: string | null | undefined) {
  if (!text) return "";
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|quot|#039|lt|gt|mdash);/g, (m) => ENTITIES[m])
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// อ่านค่าจาก URL searchParams ซึ่งอาจเป็น string หรือ string[]
export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// แปลงเลขหน้าจาก URL ถ้าไม่ใช่จำนวนเต็มบวกให้เป็นหน้า 1
export function pageParam(value: string | string[] | undefined) {
  const n = Number(firstParam(value));
  return Number.isInteger(n) && n > 0 ? n : 1;
}
