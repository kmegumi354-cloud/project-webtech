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
  // สถิติบนการ์ดโปรไฟล์: จำนวนเรื่อง, ตอนที่ดูรวม, เรื่องที่ดูจบ
  const episodesWatched = watchlist.reduce((sum, item) => sum + item.progress, 0);
  const completed = watchlist.filter((item) => item.episodes && item.progress >= item.episodes).length;

  return (
    <>
      <section className="profile-card">
        {user.image
          ? <img className="profile-avatar" src={user.image} alt="" width={88} height={88} />
          : <div className="profile-avatar profile-avatar-empty" aria-hidden="true">{user.name?.[0] ?? "?"}</div>}
        <div className="profile-info">
          <h1 className="profile-name">{user.name}</h1>
          <div className="profile-email">{user.email}</div>
        </div>
        <dl className="profile-stats">
          <div><dt>กำลังติดตาม</dt><dd>{watchlist.length}</dd></div>
          <div><dt>ตอนที่ดูแล้ว</dt><dd>{episodesWatched.toLocaleString()}</dd></div>
          <div><dt>ดูจบแล้ว</dt><dd>{completed}</dd></div>
        </dl>
      </section>

      <section className="row">
        <h2 className="row-head">Watchlist <span className="row-count">{watchlist.length} เรื่อง</span></h2>

        {watchlist.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">ยังไม่มีเรื่องที่ติดตาม</p>
            <p>กดปุ่ม <strong>+</strong> บนการ์ดอนิเมะ หรือ “เพิ่มในรายการติดตาม” ในหน้ารายละเอียด</p>
            <Link href="/top" className="btn btn-accent">ไปดู Top Anime</Link>
          </div>
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
