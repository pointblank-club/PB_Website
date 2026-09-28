"use client";

import { Lexend_Tera } from "next/font/google";
import ThreeBackground from "@/components/ui/ThreeBackground";
import { motion } from "framer-motion";
import AwardBadge from "@/components/homepage/AwardBadge";

const lexendTera = Lexend_Tera({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const headingParts = [
  {
    text: "We Are ",
    className:
      "bg-linear-to-b px-1.5 from-[#FFFFFF] to-[#999999] bg-clip-text text-transparent font-semibold",
  },
  { text: " <. >", className: "text-pbgreen font-semibold font-mono" },
  { br: true },
  { text: " Point ", className: "text-pbgreen font-semibold" },
  {
    text: "Blank",
    className:
      "font-semibold px-1.5 bg-linear-to-b from-[#FFFFFF] to-[#999999] bg-clip-text text-transparent",
  },
  {
    text: "Student run Open Source Community from India",
    className: "text-base text-white italic pt-2",
    block: true,
  },
];

export default function HeroSection() {
  return (
    <section
      id="home"
      className="relative z-10 min-h-[90vh] overflow-hidden text-white bg-pbpages"
    >
      <ThreeBackground />

      {/* Reading scrim. The grid keeps reacting under the cursor everywhere -
          legibility is handled by compositing instead of by suppressing the
          effect, so lifted keys dissolve into shadow as they pass behind the
          copy. Invisible at rest: it is the page colour over a black scene. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-40"
        style={{
          background:
            "radial-gradient(ellipse 40% 38% at 50% 47%, rgba(17,17,17,0.95) 0%, rgba(17,17,17,0.93) 52%, rgba(17,17,17,0.55) 80%, rgba(17,17,17,0) 100%)",
        }}
      />

      <div className="relative z-10 min-h-[90vh] flex items-center justify-center px-4 sm:px-10 lg:px-24 py-28 lg:py-20 max-w-420 mx-auto w-full">
        <div className="flex w-full flex-col items-center gap-10 sm:gap-14">
          <h1
            className={`text-4xl sm:text-5xl md:text-6xl xl:text-7xl text-center tracking-[-22%] text-white select-none ${lexendTera.className}`}
          >
            {headingParts.map((part, idx) =>
              part.br ? (
                <br key={idx} />
              ) : (
                <motion.span
                  key={idx}
                  className={part.className}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: idx * 0.05 }}
                  style={{ display: part.block ? "block" : "inline" }}
                >
                  {part.text}
                </motion.span>
              ),
            )}
          </h1>

          <AwardBadge />
        </div>
      </div>
    </section>
  );
}
