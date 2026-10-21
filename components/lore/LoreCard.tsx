"use client";

import { useState, useEffect } from "react";
import LoreType from "@/types/lore/loreType";
import Image from "next/image";
import LoreStoryComp from "./LoreStoryComp";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type LoreCardProps = LoreType & {
  isPlaying?: boolean;
  onHover?: () => void;
  onLeave?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};
export default function LoreCard({
  id,
  title,
  date,
  location,
  preview,
  images,
  story,
  isPlaying = false,
  onHover,
  onLeave,
  onEdit,
  onDelete,
}: LoreCardProps) {
  const [currentImg, setCurrentImg] = useState<number>(0);
  const [isSelfHovered, setIsSelfHovered] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(false);

  const shouldPlay = isPlaying || (onHover ? false : isSelfHovered);
  const activeImg = images && images.length > 0 ? currentImg % images.length : 0;

  useEffect(() => {
    if (!images || images.length <= 1 || !shouldPlay) return;

    const timer = setInterval(() => {
      setCurrentImg((curr) => (curr + 1) % images.length);
    }, 2000);

    return () => clearInterval(timer);
  }, [images, shouldPlay, currentImg]);

  return (
    <div
      className="mb-6 md:mb-9"
      data-lore-id={id ?? undefined}
      onMouseEnter={() => {
        setIsSelfHovered(true);
        onHover?.();
      }}
      onMouseLeave={() => {
        setIsSelfHovered(false);
        onLeave?.();
      }}
      onTouchStart={() => {
        setIsSelfHovered(true);
        onHover?.();
      }}
    >
      <div className="w-full flex justify-center px-4 sm:px-6">
        <div className="w-full max-w-7xl bg-[#1C1C1C] rounded-2xl overflow-hidden flex flex-col">
          <div className="w-full flex flex-col-reverse md:flex-row min-h-100">
            <div className="w-full md:w-[50%]">
              <div className="min-h-18 w-full pt-8 pl-5 md:pl-12.5 ">
                <h2 className="text-3xl sm:text-5xl md:text-5xl text-[#37FF00] font-medium">
                  {title}
                </h2>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 w-full pl-5 md:pl-12.5">
                <div className="bg-pbdarkgray py-1.5 mr-3 border border-pbborder rounded-4xl px-3 flex items-center ">
                  <CalendarDays
                    className="mr-2 h-4 w-4 text-pbgreen"
                    aria-hidden="true"
                  />
                  <p className={`text-pbtext font-light text-xs`}>
                    {new Date(date).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="bg-pbdarkgray py-1.5 border border-pbborder rounded-4xl px-3 flex items-center ">
                  <MapPin
                    className="mr-2 h-4 w-4 text-pbgreen"
                    aria-hidden="true"
                  />
                  <p className={`text-pbtext font-light text-xs`}>{location}</p>
                </div>
              </div>

              <div className="min-h-25 w-full pl-6 md:pl-12.5 pt-5">
                <p className="text-[1.1rem] min-h-18 max-w-full md:max-w-136 text-pbtext font-light">
                  {preview}
                </p>
              </div>

              <div className="md:pl-12.5 lg:mb-0 md:mb-2 mb-4 sm:pl-6 p-0 h-14 w-full mt-7 flex flex-wrap items-center gap-3 justify-center sm:justify-start">
                <button
                  className="bg-pbsurface border border-[#37ff0014] cursor-pointer h-14 w-49.5 hover:border-pbgreen/70  ease-in-out duration-200 rounded-2xl text-center select-none text-white text-[1.1rem]"
                  onClick={() => setExpanded((prev) => !prev)}
                >
                  {expanded ? "Read Less" : "Read More"}
                </button>

                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-full transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-center mt-4 md:mt-0 overflow-hidden items-center md:p-3 lg:p-5 p-1 relative min-h-64 md:h-full w-full md:w-[50%]">
              {/* Dotted Background */}
              <Image
                width={334}
                className="absolute top-0 right-0"
                height={317}
                src={"/top-right-dot.svg"}
                alt="dotted-BG"
              />

              <div className="h-64 md:h-full md:min-h-96 w-[95%] md:w-full overflow-hidden relative rounded-[5px] bg-cover bg-pbgray bg-center">
                {/* Image nav prev */}
                {images.length > 1 && (
                  <button
                    type="button"
                    aria-label="Previous image"
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center h-7 w-7 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImg(
                        (curr) => (curr - 1 + images.length) % images.length,
                      );
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}

                {/*Image nav next*/}
                {images.length > 1 && (
                  <button
                    type="button"
                    aria-label="Next image"
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center h-7 w-7 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImg((curr) => (curr + 1) % images.length);
                    }}
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}

                {/*dots */}
                {images.length > 1 && (
                  <div className="absolute bottom-3 w-full flex justify-center items-center gap-1.5 z-10">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        aria-label={`Go to slide ${idx + 1}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImg(idx);
                        }}
                        className={`rounded-full transition-all cursor-pointer ${
                          activeImg === idx
                            ? "w-4 h-2 bg-pbgreen"
                            : "w-2 h-2 bg-white/40 hover:bg-white/60"
                        }`}
                      />
                    ))}
                  </div>
                )}

                {images.map((src, idx) => (
                  <Image
                    key={idx}
                    src={src}
                    alt={`${location} ${idx + 1}`}
                    fill
                    className={`w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
                      idx === activeImg ? "opacity-100" : "opacity-0"
                    }`}
                    priority={idx === 0}
                    sizes="w-full"
                    draggable={false}
                  />
                ))}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <div className="pt-4 pb-10 flex flex-col items-center">
                  {story.map((s, idx) => (
                    <LoreStoryComp key={idx} story={s} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
