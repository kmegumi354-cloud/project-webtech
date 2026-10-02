// =====================================================================
// app/profile/page.tsx — หน้าโปรไฟล์และรายการติดตาม (/profile)
// ถูกปกป้อง 2 ชั้น: middleware.ts (ก่อนเข้าหน้า) และ auth() ในหน้านี้ (กันเหนียว)
// แสดงเรื่องที่ติดตามจาก .data/watchlist.json พร้อมตัวนับตอนและปุ่มเลิกติดตาม
// =====================================================================
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { removeWatchAction } from "@/app/actions";
import ProgressControl from "@/components/ProgressControl";
import SubmitButton from "@/components/SubmitButton";
import TimeAgo from "@/components/TimeAgo";
import { formatLabel, mediaHref } from "@/lib/anilist";
import { getWatchlist } from "@/lib/watchlist";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await auth();
  const user = session?.user;
  if (!user?.email) redirect("/");

  // ใช้อีเมลเป็น key ของข้อมูลผู้ใช้แต่ละคน
  const watchlist = await getWatchlist(user.email);

  return (
    <>
      <h1 className="page-title">Profile</h1>

      <div className="profile-head">
        {user.image && <img src={user.image} alt="" width={64} height={64} />}
        <div>
          <div className="profile-name">{user.name}</div>
          <div className="meta">{user.email}</div>
        </div>
      </div>

      <section className="block">
        <h2 className="section-head">รายการติดตาม ({watchlist.length})</h2>

        {watchlist.length === 0 ? (
          <p className="empty">
            ยังไม่มีเรื่องที่ติดตาม — เปิดหน้ารายละเอียดอนิเมะแล้วกด “+ เพิ่มในรายการติดตาม”
            <br />
            <Link href="/top">ดู Top Anime</Link>
          </p>
        ) : (
          <div className="card-grid">
            {watchlist.map((item) => (
              <article key={item.id} className="media-card">
                <Link href={mediaHref(item)} className="media-card-cover" tabIndex={-1} aria-hidden="true">
                  {item.cover && <img src={item.cover} alt="" loading="lazy" />}
                </Link>
                <Link href={mediaHref(item)} className="media-card-title" title={item.title}>{item.title}</Link>
                <div className="media-card-sub">
                  {formatLabel(item.format)}{item.episodes ? ` · ${item.episodes} ตอน` : ""}
                </div>
                <div className="media-card-foot">
                  <span className="by">ติดตามเมื่อ</span>
                  <TimeAgo at={item.addedAt} className="when" />
                </div>
                <ProgressControl mediaId={item.id} progress={item.progress} total={item.episodes} />
                {/* bind(null, id) ผูก id ไว้กับ Server Action ฟอร์มจึงไม่ต้องส่ง id มาเอง */}
                <form action={removeWatchAction.bind(null, item.id)}>
                  <SubmitButton className="remove-btn" pendingText="กำลังลบ...">เลิกติดตาม</SubmitButton>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
