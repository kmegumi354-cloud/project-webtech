// =====================================================================
// app/api/search/route.ts — API สำหรับช่องค้นหาแบบเห็นผลทันที (GET /api/search?q=...)
// SearchBox (ฝั่ง browser) เรียก endpoint นี้ระหว่างผู้ใช้พิมพ์
// server เป็นคนเรียก AniList แทน: ใช้แคชร่วมกับส่วนอื่นของเว็บ และคุมรูปแบบข้อมูลที่ส่งกลับ
// =====================================================================
import { NextResponse, type NextRequest } from "next/server";
import { anilist, displayTitle, formatLabel } from "@/lib/anilist";

const SEARCH_QUERY = /* GraphQL */ `
  query ($search: String) {
    Page(perPage: 6) {
      media(search: $search, type: ANIME, sort: SEARCH_MATCH, isAdult: false) {
        id format averageScore seasonYear
        title { userPreferred english romaji }
        coverImage { medium }
        startDate { year }
      }
    }
  }
`;

type SearchMedia = {
  id: number;
  format: string | null;
  averageScore: number | null;
  seasonYear: number | null;
  title: { userPreferred: string; english: string | null; romaji: string | null };
  coverImage: { medium: string | null };
  startDate: { year: number | null };
};

export type SearchResult = {
  id: number;
  title: string;
  cover: string | null;
  format: string;
  year: number | null;
  score: number | null;
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  // คำค้นสั้นหรือยาวเกินไปไม่ต้องเรียก AniList
  if (q.length < 2 || q.length > 100) return NextResponse.json({ results: [] });

  try {
    const data = await anilist<{ Page: { media: SearchMedia[] } }>(SEARCH_QUERY, { search: q });
    const results: SearchResult[] = data.Page.media.map((m) => ({
      id: m.id,
      title: displayTitle(m.title),
      cover: m.coverImage.medium,
      format: formatLabel(m.format),
      year: m.seasonYear ?? m.startDate.year,
      score: m.averageScore,
    }));
    // ให้ browser และ CDN ของ Vercel แคชผลคำค้นเดิมไว้ช่วงสั้น ๆ
    return NextResponse.json({ results }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=600" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ค้นหาไม่สำเร็จ";
    return NextResponse.json({ results: [], error: message }, { status: 502 });
  }
}
