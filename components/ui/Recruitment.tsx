"use client";

import Link from "next/link";

export default function Recruitment() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-20 mx-4 sm:mx-6 lg:mx-10">
      <Link
        href="/recruitment"
        className="
          group mx-auto flex h-10 max-w-450 items-center justify-center
          gap-2.5 overflow-hidden rounded-xl border border-pbgreen/25
          bg-black px-4 transition-colors duration-300 pointer-events-auto
          hover:border-pbgreen/60 sm:h-11 sm:gap-4
        "
      >
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-pbgreen sm:text-xs">
          Recruiting
        </span>

        <span aria-hidden className="h-3.5 w-px shrink-0 bg-pbgreen/25" />

        <span className="hidden truncate text-xs text-pbtext sm:inline sm:text-sm">
          Think you could be a part of Point Blank? We&apos;d love to have you.
        </span>
        <span className="truncate text-xs text-pbtext sm:hidden">
          Want to join us?
        </span>

        <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-white underline decoration-pbgreen/50 decoration-2 underline-offset-4 transition-colors duration-300 group-hover:decoration-pbgreen sm:text-sm">
          Apply now
        </span>
      </Link>
    </div>
  );
}
