// =====================================================================
// middleware.ts — ด่านแรกที่ตรวจ request ก่อนถึงหน้าเว็บ
// ใช้ auth ของ Auth.js เป็น middleware: ถ้าเข้าเส้นทางที่ต้องล็อกอินโดยไม่มี session
// จะถูก redirect ไปหน้าเข้าสู่ระบบ (ตัดสินด้วย callback authorized ใน auth.ts)
// Next 15 ใช้ชื่อ middleware.ts — ถ้าอัปเกรดเป็น Next 16 ให้เปลี่ยนเป็น proxy.ts และ export เป็น proxy
// =====================================================================
export { auth as middleware } from "@/auth";

// matcher กำหนดว่า middleware ทำงานกับเส้นทางไหนบ้าง หน้าอื่นจะไม่ผ่าน middleware เลย
export const config = {
  matcher: ["/profile/:path*"],
};
