"use client";

import Link from "next/link";

const CHEVRON = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const CLASSES =
  "mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 bg-surface-2/70 text-gold backdrop-blur-sm transition-transform active:scale-90";

export default function BackButton({ onClick, href }: { onClick?: () => void; href?: string }) {
  if (href) {
    return (
      <Link href={href} className={CLASSES} aria-label="Retour">
        {CHEVRON}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={CLASSES} aria-label="Retour">
      {CHEVRON}
    </button>
  );
}
