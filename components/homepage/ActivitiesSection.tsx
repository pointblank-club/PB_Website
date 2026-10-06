"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import FadeIn from "@/components/FadeIn";
import hustleImg from "@/public/images/hustle.webp";
import chroniclesImg from "@/public/images/chronicles.webp";
import sihImg from "@/public/images/sih.webp";
import opensrcImg from "@/public/images/opensource.webp";
import cybersecImg from "@/public/images/cybersec.webp";
import innovationImg from "@/public/images/innovation.webp";

const activities = [
  {
    title: "CP Contests",
    tag: "PB Hustle",
    img: hustleImg,
    description:
      "Since 2019, Point Blank has built a strong competitive programming culture. Participation scaled rapidly, with teams qualifying for ICPC Regionals.",
  },
  {
    title: "Development",
    tag: "PB Chronicles",
    img: chroniclesImg,
    description:
      "We host hands-on workshops across web, mobile, DevOps, machine learning, and open source, focused on real skills rather than slides.",
  },
  {
    title: "Hackathons",
    tag: "Smart India Hackathon",
    img: sihImg,
    description:
      "Point Blank organizes the internal Smart India Hackathon annually, with consistent national qualifications, finals, and wins.",
  },
  {
    title: "Open Source",
    tag: "GSoC",
    img: opensrcImg,
    description:
      "Our open-source community has produced GSoC contributors, LFX scholars, and GitHub Externs across global organizations.",
  },
  {
    title: "Cybersecurity",
    tag: "PBCTF",
    img: cybersecImg,
    description:
      "We run hands-on cybersecurity sessions and host PBCTF, an in-house Capture The Flag event with wide campus participation.",
  },
  {
    title: "Innovation",
    img: innovationImg,
    tag: "Research",
    description:
      "From hardware prototypes to published research, we foster a culture of experimentation and innovation beyond the classroom.",
  },
];

export default function ActivitiesSection() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 400);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <section id="activities" className="text-white px-4 sm:px-10 lg:px-20">
      <FadeIn className="text-center my-20">
        <h2 className="text-4xl font-bold text-pbgreen">Activities</h2>
      </FadeIn>

      <div className="max-w-8xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {activities.map(({ title, tag, img, description }, i) => {
          const displayTag =
            isMobile && tag === "PB Chronicles"
              ? "Chronicles"
              : isMobile && tag === "Smart India Hackathon"
                ? "SIH"
                : tag;
          return (
            <FadeIn key={i} delay={(i % 3) * 0.1} className="h-full">
              <div className="inline-flex w-full h-full flex-col justify-start items-center gap-10 p-6 bg-[#1C1C1C] rounded-t-[54px] rounded-b-[16px] [outline:1px_solid_#262626] -outline-offset-1 transition-all duration-300">
                <div className="self-stretch h-69.25 overflow-hidden rounded-t-[30px] rounded-b-[12px] shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
                  <Image
                    src={img}
                    alt={title}
                    className="w-full h-full object-cover"
                    draggable={false}
                    loading="lazy"
                  />
                </div>

                <div className="self-stretch px-6 flex flex-col items-center gap-6">
                  <div className="self-stretch flex items-start justify-between gap-3">
                    <h3 className="text-white text-[20px] leading-7.5 font-lexend font-normal wrap-break-word">
                      {title}
                    </h3>

                    <div className="flex items-start">
                      <div className="bg-[#1A1A1A] rounded-full px-4 py-1.5 [outline:1px_solid_#262626] -outline-offset-1 flex items-center justify-center">
                        <div className="text-pbgreen text-[16px] leading-6 font-lexend font-light">
                          {displayTag}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="self-stretch text-[#B3B3B3] text-[16px] leading-6 font-lexend font-light wrap-break-word">
                    {description}
                  </p>
                </div>
              </div>
            </FadeIn>
          );
        })}
      </div>
    </section>
  );
}
