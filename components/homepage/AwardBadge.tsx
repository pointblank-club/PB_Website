"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import indiaFoss from "@/public/images/indiafoss.svg";
import fossUnited from "@/public/images/fossunited.svg";

/**
 * A laurel branch: leaves sit on a circular arc (the wreath) and are swept
 * toward the tip rather than fanning radially, which is what separates a
 * laurel from a sunburst. Angles below are in degrees on the unit circle
 * (maths convention, y up); the SVG y axis is flipped when the point is
 * placed, and leaf rotation is expressed directly in SVG degrees.
 */
const CX = 60;
const CY = 53;
const RADIUS = 38;

// Bottom of the branch -> tip. Leaves are longest through the belly of the arc.
const ARC = [240, 220, 200, 180, 160, 140, 120];
const OUTER_LENGTHS = [11, 14.5, 17, 18, 17, 14, 9.5];
const INNER_ARC = [228, 208, 188, 168, 148];

const rad = (deg: number) => (deg * Math.PI) / 180;
const point = (a: number) => ({
  x: CX + RADIUS * Math.cos(rad(a)),
  y: CY - RADIUS * Math.sin(rad(a)),
});

// Tangent (pointing toward the tip) is 90 - a in SVG degrees; swing 35 deg
// outward for the outer leaves and inward for the smaller filler leaves.
const OUTER_LEAVES = ARC.map((a, i) => ({
  ...point(a),
  angle: 55 - a,
  r: OUTER_LENGTHS[i],
}));

const INNER_LEAVES = INNER_ARC.map((a) => ({
  ...point(a),
  angle: 125 - a,
  r: 6,
}));

const START = point(ARC[0]);
const END = point(ARC[ARC.length - 1]);

function Leaf({
  x,
  y,
  angle,
  r,
  opacity,
}: {
  x: number;
  y: number;
  angle: number;
  r: number;
  opacity: number;
}) {
  // Lanceolate: two arcs meeting in a point at each end. An ellipse reads as
  // a blob once the branch is shown large; the taper is what makes it a leaf.
  const w = r * 0.44;
  const d = `M0 0 C ${r * 0.34} ${-w} ${r * 1.5} ${-w} ${r * 2} 0 C ${r * 1.5} ${w} ${r * 0.34} ${w} 0 0 Z`;

  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle})`}>
      <path
        d={d}
        fill="currentColor"
        opacity={opacity}
        stroke="var(--color-pbpages)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    </g>
  );
}

function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    // Padded past the drawing box: the longest leaves reach x=-3.5 and the
    // upper tips sit near y=0, so a "0 0 64 100" box cropped them.
    <svg
      viewBox="-10 -8 74 106"
      aria-hidden
      className="h-16 w-auto shrink-0 text-pbgreen sm:h-24 lg:h-28"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        d={`M${START.x.toFixed(2)} ${START.y.toFixed(2)} A ${RADIUS} ${RADIUS} 0 0 1 ${END.x.toFixed(2)} ${END.y.toFixed(2)}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.8"
      />
      {INNER_LEAVES.map((leaf, i) => (
        <Leaf key={`i${i}`} {...leaf} opacity={0.45} />
      ))}
      {OUTER_LEAVES.map((leaf, i) => (
        <Leaf key={`o${i}`} {...leaf} opacity={0.7 + i * 0.04} />
      ))}
    </svg>
  );
}

export default function AwardBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full"
    >
      {/* glow anchoring the award to the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[150%] w-[min(44rem,100%)] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(55,255,0,0.10),transparent_70%)]"
      />

      <div className="relative mx-auto flex w-full max-w-2xl items-center justify-center gap-1.5 sm:gap-4 lg:gap-5">
        <Laurel />

        <div className="flex min-w-0 flex-col items-center gap-1.5 text-center sm:gap-2">
          <Link
            href="/achievements"
            className="group flex flex-col items-center gap-1.5 sm:gap-2"
          >
            <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-pbgreen sm:text-xs sm:tracking-[0.38em]">
              FOSS Awards 2026
            </span>

            <span className="text-balance text-lg font-semibold leading-snug text-white transition-colors duration-300 group-hover:text-pbgreen sm:text-2xl lg:text-[28px]">
              Student Community of the Year
            </span>
          </Link>

          {/* Official marks, both the bracketed wordmark variant, matched on
              frame height so they read as one lockup: event, then organisation.
              The dot stops the two frames reading as a single mark. Each links
              out on its own, which is why they sit outside the achievements
              link rather than nested inside it. */}
          <span className="mt-1 flex items-center gap-2.5 sm:gap-3">
            <a
              href="https://fossunited.org/indiafoss/2026"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-80 transition-opacity duration-300 hover:opacity-100"
            >
              <Image
                src={indiaFoss}
                alt="IndiaFOSS 2026"
                className="h-7 w-auto sm:h-8"
              />
            </a>

            <span
              aria-hidden
              className="h-1 w-1 shrink-0 rounded-full bg-pbgreen/60"
            />

            <a
              href="https://fossunited.org"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-80 transition-opacity duration-300 hover:opacity-100"
            >
              <Image
                src={fossUnited}
                alt="FOSS United"
                className="h-7 w-auto sm:h-8"
              />
            </a>
          </span>
        </div>

        <Laurel flip />
      </div>
    </motion.div>
  );
}
