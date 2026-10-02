// route handler ของ Auth.js — [...nextauth] รับทุกเส้นทางใต้ /api/auth/
// เช่น /api/auth/signin, /api/auth/callback/google (Google ส่งผู้ใช้กลับมาที่นี่), /api/auth/session
// การแลก token กับ Google เกิดที่นี่บน server ทำให้ Client Secret ไม่หลุดไปถึง browser
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
