// =====================================================================
// app/api/search/route.ts — API สำหรับช่องค้นหาแบบเห็นผลทันที (GET /api/search?q=...)
// SearchBox (ฝั่ง browser) เรียก endpoint นี้ระหว่างผู้ใช้พิมพ์
// server เป็นคนเรียก AniList แทน: ใช้แคชร่วมกับส่วนอื่นของเว็บ และคุมรูปแบบข้อมูลที่ส่งกลับ
// ส่งกลับ 2 กลุ่มใน request เดียว (GraphQL alias):
//   anime      → อนิเมะที่ชื่อตรงที่สุด 6 เรื่อง พร้อมรูปแบบ ปี จำนวนตอน สถานะ แนว คะแนน
//   characters → ตัวละครที่ชื่อตรง 3 ตัว พร้อมเรื่องที่ตัวละครนั้นอยู่ (กดแล้วไปหน้าเรื่องนั้น)
// =====================================================================
import { NextResponse, type NextRequest } from "next/server";
import { anilist, displayTitle, formatLabel, statusLabel } from "@/lib/anilist";

const SEARCH_QUERY = /* GraphQL */ `
  query ($search: String) {
    anime: Page(perPage: 6) {
      media(search: $search, type: ANIME, sort: SEARCH_MATCH, isAdult: false) {
        id format status episodes averageScore seasonYear genres
        title { userPreferred english romaji native }
        coverImage { medium }
        startDate { year }
      }
    }
    characters: Page(perPage: 6) {
      characters(search: $search, sort: SEARCH_MATCH) {
        id
        name { full native }
        image { medium }
        media(type: ANIME, sort: POPULARITY_DESC, perPage: 1) {
          nodes { id isAdult title { userPreferred english romaji } }
        }
      }
    }
  }
`;

type Title = { userPreferred: string; english: string | null; romaji: string | null };

type SearchMedia = {
  id: number;
  format: string | null;
  status: string | null;
  episodes: number | null;
  averageScore: number | null;
  seasonYear: number | null;
  genres: string[];
  title: Title & { native: string | null };
  coverImage: { medium: string | null };
  startDate: { year: number | null };
};

type SearchCharacter = {
  id: number;
  name: { full: string | null; native: string | null };
  image: { medium: string | null };
  media: { nodes: { id: number; isAdult: boolean; title: Title }[] };
};

export type SearchResult = {
  id: number;
  title: string;
  native: string | null; // ชื่อภาษาญี่ปุ่น
  cover: string | null;
  format: string;
  year: number | null;
  episodes: number | null;
  status: string;
  genres: string[];
  score: number | null;
};

export type CharacterResult = {
  id: number;
  name: string;
  native: string | null;
  image: string | null;
  anime: { id: number; title: string }; // เรื่องที่ตัวละครนี้โด่งดังที่สุด
};

export type SearchResponse = { anime: SearchResult[]; characters: CharacterResult[]; error?: string };

const MAX_CHARACTERS = 3;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  // คำค้นสั้นหรือยาวเกินไปไม่ต้องเรียก AniList
  if (q.length < 2 || q.length > 100) return NextResponse.json<SearchResponse>({ anime: [], characters: [] });

  try {
    const data = await anilist<{
      anime: { media: SearchMedia[] };
      characters: { characters: SearchCharacter[] };
    }>(SEARCH_QUERY, { search: q });

    const anime: SearchResult[] = data.anime.media.map((m) => {
      const title = displayTitle(m.title);
      return {
        id: m.id,
        title,
        // ไม่แสดงชื่อญี่ปุ่นซ้ำถ้าเหมือนชื่อหลัก
        native: m.title.native !== title ? m.title.native : null,
        cover: m.coverImage.medium,
        format: formatLabel(m.format),
        year: m.seasonYear ?? m.startDate.year,
        episodes: m.episodes,
        status: statusLabel(m.status),
        genres: m.genres.slice(0, 3),
        score: m.averageScore,
      };
    });

    // เก็บเฉพาะตัวละครที่อยู่ในอนิเมะ (ไม่ใช่เรื่องผู้ใหญ่) เพราะเว็บนี้ไม่มีหน้าตัวละคร จะพาไปหน้าเรื่องแทน
    const characters: CharacterResult[] = [];
    for (const c of data.characters.characters) {
      const show = c.media.nodes[0];
      if (!show || show.isAdult || !c.name.full) continue;
      characters.push({
        id: c.id,
        name: c.name.full,
        native: c.name.native,
        image: c.image.medium,
        anime: { id: show.id, title: displayTitle(show.title) },
      });
      if (characters.length === MAX_CHARACTERS) break;
    }

    // ให้ browser และ CDN ของ Vercel แคชผลคำค้นเดิมไว้ช่วงสั้น ๆ
    return NextResponse.json<SearchResponse>(
      { anime, characters },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=600" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "ค้นหาไม่สำเร็จ";
    return NextResponse.json<SearchResponse>({ anime: [], characters: [], error: message }, { status: 502 });
  }
}
