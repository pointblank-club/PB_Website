"use client";
import { motion } from "framer-motion";
export default function RecruitmentBanner() {
  return (
    <section className="relative overflow-hidden bg-[#101010] px-4 py-12">
      {/* Subtle background glow */}
      <div className="absolute left-1/2 top-1/2 h-40 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#39ff14]/5 blur-3xl" />
      <div className="relative mx-auto max-w-[1540px]">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#151515] px-8 py-12 md:px-16 transition-all duration-300 hover:border-[#39ff14]/30 hover:shadow-[0_0_30px_rgba(57,255,20,0.15)]">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-semibold text-white md:text-4xl">
              Recruitment{" "}
              <span className="text-[#39ff14]">Coming Soon</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-gray-400">
              Think you can build, break and create?
              <br className="hidden md:block" />
              Stay tuned for the next Point Blank recruitment drive.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}