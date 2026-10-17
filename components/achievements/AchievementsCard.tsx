"use client";

import Image from "next/image";
import badge from "@/public/images/icons/badge.svg";

export type AchievementItem = {
  event: string;
  result: string;
  category: string; // "GSOC" | "LFX" | "HACKATHONS" | "SIH" | "LIFT" | "ACM" | "CP"
  url?: string;
};

// Each row is an array of items — 1 item = full width, 2 = two columns, 3 = three columns, etc.
export type AchievementRow = AchievementItem[];

export type Member = {
  name: string;
  avatar?: string;
  achievements: AchievementRow[];
};

// CARD LAYOUT
export function AchievementCard({
  member,
  filterCategory,
}: {
  member: Member;
  filterCategory: string;
}) {
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <div className="w-full h-full rounded-xl border overflow-hidden border-pbborder bg-pbgray flex flex-col hover:border hover:border-pbgreen">
      {/* profile */}
      <div className="flex items-center gap-4 px-6 py-5">
        <div className="relative shrink-0">
          <div className="w-15 h-15 rounded-full bg-linear-to-br from-[#2a2a2a] to-[#3d3d3d] flex items-center justify-center text-lg font-bold text-pbtext overflow-hidden border-2 border-[#333]">
            {member.avatar ? (
              <Image
                src={member.avatar}
                alt={member.name}
                className="w-full h-full object-cover"
                width={60}
                height={60}
                draggable={false}
                loading="lazy"
              />
            ) : (
              initials
            )}
          </div>

          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#FFB413] flex items-center justify-center text-xs border-2 border-pbgray p-0.5">
            <Image
              src={badge}
              alt="badge"
              width={20}
              height={20}
              draggable={false}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
          <span className="text-xl font-medium text-white tracking-tight leading-none wrap-break-word">
            {member.name}
          </span>
        </div>
      </div>

      {/* divider */}
      <div className="h-px bg-white/25 mx-4" />

      {/* achievements */}
      <div className="bg-pbgray flex flex-col px-3 py-2.5 gap-2">
        {member.achievements
          .filter((row) => row.length > 0)
          .map((row, i) => {
            const cols = row.length;
            const gridClass =
              cols === 1
                ? "grid-cols-1"
                : cols === 2
                  ? "grid-cols-2"
                  : cols === 3
                    ? "grid-cols-3"
                    : "grid-cols-4";
            return (
              <div key={i} className={`grid gap-2 ${gridClass}`}>
                {row.map((item, j) => {
                  const active =
                    filterCategory == "ALL" || filterCategory == item.category;
                  const className = `block bg-pbsurface transition-all duration-300 border border-transparent
                      ${
                        active
                          ? "opacity-100 text-pbgreen/90"
                          : "opacity-40 text-pbtext"
                      } rounded-lg px-3.5 py-2.5 min-w-0
                      ${item.url ? "hover:border-pbgreen/60 cursor-pointer" : ""}`;
                  const body = (
                    <>
                      <p className="text-sm font-normal m-0 wrap-break-word">
                        {item.event}
                        {item.url && (
                          <span aria-hidden="true" className="ml-1 text-xs">
                            ↗
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-pbtext m-0 mt-0.5 wrap-break-word">
                        {item.result}
                      </p>
                    </>
                  );

                  // A real <a href> so crawlers and LLM fetchers can follow it.
                  return item.url ? (
                    <a
                      key={j}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${item.event} ${item.result} (opens official page)`}
                      className={className}
                    >
                      {body}
                    </a>
                  ) : (
                    <div key={j} className={className}>
                      {body}
                    </div>
                  );
                })}
              </div>
            );
          })}
      </div>
    </div>
  );
}
