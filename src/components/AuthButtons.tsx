// =====================================================================
// components/AuthButtons.tsx — ปุ่ม Login / Logout มุมขวาบน
// อ่าน session ฝั่ง server แล้วเลือกแสดง: ชื่อ + รูป + Logout หรือ ปุ่ม Login with Google
// ฟอร์มใช้ inline Server Action ("use server" ในฟังก์ชัน) จึงเรียก signIn/signOut บน server ได้โดยตรง
// =====================================================================
import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";

export default async function AuthButtons() {
  const session = await auth();
  const user = session?.user;

  if (user) {
    return (
      <div className="auth">
        <Link href="/profile" className="auth-user">
          {user.image && <img src={user.image} alt="" width={22} height={22} />}
          {user.name ?? "Profile"}
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button type="submit" className="auth-btn">Logout</button>
        </form>
      </div>
    );
  }

  return (
    <form
      className="auth"
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/" });
      }}
    >
      <button type="submit" className="auth-btn">Login with Google</button>
    </form>
  );
}
