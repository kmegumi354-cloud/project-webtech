// =====================================================================
// app/anime/[id]/page.tsx — หน้ารายละเอียดอนิเมะ (/anime/16498)
// [id] ใน URL คือ id ของ AniList ถ้าไม่ใช่ตัวเลขหรือไม่พบเรื่อง จะแสดงหน้า 404
// การแสดงผลทั้งหมดอยู่ใน components/MediaDetailView.tsx
// =====================================================================
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MediaDetailView from "@/components/MediaDetailView";
import { AniListError, cleanDescription, displayTitle, getMediaDetail } from "@/lib/anilist";

type Props = { params: Promise<{ id: string }> };

// ตรวจ id → ดึงข้อมูล → ถ้า AniList ตอบ 404 ให้แสดงหน้า not-found ของ Next
async function load(params: Props["params"]) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  try {
    return await getMediaDetail(id);
  } catch (error) {
    if (error instanceof AniListError && error.status === 404) notFound();
    throw error;
  }
}

// ตั้งชื่อแท็บและคำอธิบายของหน้า (ใช้ข้อมูลชุดเดียวกับหน้าเพราะ getMediaDetail ถูกแคชไว้)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const media = await load(params);
  return {
    title: displayTitle(media.title),
    description: cleanDescription(media.description).slice(0, 160),
  };
}

export default async function AnimePage({ params }: Props) {
  return <MediaDetailView media={await load(params)} />;
}
