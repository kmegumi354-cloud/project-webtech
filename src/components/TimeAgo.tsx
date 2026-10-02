"use client";

// =====================================================================
// components/TimeAgo.tsx — แสดงเวลาแบบ "5 นาที", "2 ชม.", "อีก 3 วัน"
// เป็น Client Component เพื่อคำนวณจากเวลาของเครื่องผู้ใช้ และอัปเดตเองทุก 1 นาที
// suppressHydrationWarning: เวลาที่ server render กับเวลาบน browser ต่างกันเล็กน้อยเป็นเรื่องปกติ
// =====================================================================

import { useEffect, useState } from "react";

// seconds > 0 = ผ่านมาแล้ว, seconds < 0 = ยังมาไม่ถึง (ใช้กับตอนถัดไปที่จะออกอากาศ)
function formatTimeAgo(seconds: number) {
  const future = seconds < 0;
  const s = Math.abs(seconds);
  let text: string;
  if (s < 60) return future ? "เร็ว ๆ นี้" : "เมื่อครู่";
  if (s < 3600) text = `${Math.floor(s / 60)} นาที`;
  else if (s < 86400) text = `${Math.floor(s / 3600)} ชม.`;
  else if (s < 604800) text = `${Math.floor(s / 86400)} วัน`;
  else text = `${Math.floor(s / 604800)} สัปดาห์`;
  return future ? `อีก ${text}` : text;
}

export default function TimeAgo({ at, className }: { at: number; className?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <time className={className} dateTime={new Date(at * 1000).toISOString()} suppressHydrationWarning>
      {formatTimeAgo(now / 1000 - at)}
    </time>
  );
}
