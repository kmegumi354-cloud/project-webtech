// =====================================================================
// auth.ts — ตั้งค่า Auth.js (next-auth v5) ให้ล็อกอินด้วย Google
// export 4 อย่างที่ใช้ทั้งโปรเจกต์:
//   handlers  → route handler ที่ /api/auth/* (login, callback, logout, session)
//   auth()    → อ่าน session ฝั่ง server (ใช้ใน page, component, Server Action, middleware)
//   signIn()  → เริ่มล็อกอิน (พาไปหน้ายินยอมของ Google)
//   signOut() → ลบ session cookie แล้วออกจากระบบ
// Client ID/Secret อ่านจาก env AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET อัตโนมัติ
// =====================================================================
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// เส้นทางที่ต้องล็อกอินก่อนจึงจะเข้าได้ (ต้องเพิ่มใน matcher ของ middleware.ts ด้วย)
export const PROTECTED_PATHS = ["/profile"];

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [Google],
  callbacks: {
    // middleware เรียก callback นี้ก่อนเข้าทุกเส้นทางใน matcher
    // คืน false = ยังไม่ล็อกอิน → Auth.js พาไปหน้าเข้าสู่ระบบ, คืน true = ให้ผ่าน
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isProtected = PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
      return isProtected ? Boolean(auth?.user) : true;
    },
  },
});
