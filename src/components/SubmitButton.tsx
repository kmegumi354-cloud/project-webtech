"use client";

// =====================================================================
// components/SubmitButton.tsx — ปุ่ม submit ที่รู้ว่าฟอร์มกำลังส่งอยู่
// useFormStatus() อ่านสถานะของ <form> ที่ครอบปุ่มนี้ ระหว่างส่งจะปิดปุ่มและแสดง pendingText
// แยกเป็น Client Component เพื่อให้ฟอร์มที่เหลือยังเป็น Server Component ได้
// =====================================================================

import { useFormStatus } from "react-dom";

type Props = {
  className?: string;
  title?: string;
  ariaLabel?: string;
  pendingText: string;
  children: React.ReactNode;
};

export default function SubmitButton({ className, title, ariaLabel, pendingText, children }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} title={title} aria-label={ariaLabel} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
