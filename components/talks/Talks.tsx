"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, UploadCloudIcon, XIcon } from "lucide-react";
import { type Talk } from "@/lib/db/models/talks";
import { serializeId } from "@/lib/utils";
import { LinkedIn } from "@/components/Icons";

type TalkForm = {
  title: string;
  description: string;
  images: string[];
  type: "conference" | "talks" | "other";
  name: string;
  date: string;
  speakers: string;
  speakerLinkedins?: string;
  link?: string;
};

type TabType = "all" | "conference" | "talks" | "other";

const blankForm: TalkForm = {
  title: "",
  description: "",
  images: [],
  type: "conference",
  name: "",
  date: "",
  speakers: "",
  speakerLinkedins: "",
  link: "",
};

const TEXT_FIELDS: {
  label: string;
  key: keyof TalkForm;
  type: string;
  required?: boolean;
}[] = [
    { label: "Title", key: "title", type: "text", required: true },
    { label: "Description", key: "description", type: "text", required: true },
    { label: "Venue / Event Name", key: "name", type: "text", required: true },
    { label: "Speakers (Comma separated)", key: "speakers", type: "text", required: true },
    { label: "Speaker LinkedIns (Comma separated)", key: "speakerLinkedins", type: "text", required: false },
    { label: "Date", key: "date", type: "date", required: true },
    { label: "Link (Optional)", key: "link", type: "text", required: false },
  ];

const TABS: TabType[] = ["all", "conference", "talks", "other"];

const headingText = "We Speak. We Share. We Lead.";
const phrases = headingText.split(". ");

const SpeakerTube = ({ name, linkedin }: { name: string; linkedin?: string }) => {
  const [isHovered, setIsHovered] = useState(false);

  const sizingText = (
    <div className="invisible px-3 py-1.5 text-base font-light font-lexend-300 whitespace-nowrap">
      {name}
    </div>
  );

  const front = (
    <div className="absolute inset-0 flex items-center justify-center text-pbgreen font-light font-lexend-300 bg-black/40 rounded-full px-3 py-1.5 text-base text-center border border-transparent whitespace-nowrap">
      {name}
    </div>
  );

  if (!linkedin) {
    return (
      <div className="relative w-fit">
        {sizingText}
        {front}
      </div>
    );
  }

  return (
    <div
      className="relative w-fit cursor-pointer"
      style={{ perspective: "1000px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => { e.stopPropagation(); window.open(linkedin, "_blank"); }}
    >
      {sizingText}
      <motion.div
        className="w-full h-full absolute inset-0"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateX: isHovered ? 180 : 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      >
        <div style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }} className="absolute inset-0">
          {front}
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-full border border-pbgreen/50 hover:border-pbgreen transition-colors"
          style={{ transform: "rotateX(180deg)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          <LinkedIn className="h-5 w-5 text-pbgreen" />
        </div>
      </motion.div>
    </div>
  );
};

const getLinkedinUsername = (url: string) => {
  try {
    const parsed = new URL(url.trim());
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[0] === "in" && parts[1]
      ? parts[1].toLowerCase()
      : "";
  } catch {
    return "";
  }
};

const TalkImageSlideshow = ({
  images,
  title,
  isPlaying = false,
}: {
  images: string[];
  title: string;
  isPlaying?: boolean;
}) => {
  const [currentImg, setCurrentImg] = useState<number>(0);
  const [isSelfHovered, setIsSelfHovered] = useState<boolean>(false);

  const shouldPlay = isPlaying || isSelfHovered;
  const activeImg = images.length > 0 ? currentImg % images.length : 0;

  useEffect(() => {
    if (images.length <= 1 || !shouldPlay) return;

    const timer = setInterval(() => {
      setCurrentImg((curr) => (curr + 1) % images.length);
    }, 2000);

    return () => clearInterval(timer);
  }, [images.length, shouldPlay, currentImg]);

  if (!images || images.length === 0) return null;

  return (
    <div
      className="w-full aspect-3/2 overflow-hidden rounded-xl relative bg-pbgray"
      onMouseEnter={() => setIsSelfHovered(true)}
      onMouseLeave={() => setIsSelfHovered(false)}
      onTouchStart={() => setIsSelfHovered(true)}
    >
      {/* Image nav prev */}
      {images.length > 1 && (
        <button
          type="button"
          aria-label="Previous image"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 backdrop-blur-sm text-white transition-all cursor-pointer"
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

      {/* Image nav next */}
      {images.length > 1 && (
        <button
          type="button"
          aria-label="Next image"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 backdrop-blur-sm text-white transition-all cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setCurrentImg((curr) => (curr + 1) % images.length);
          }}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {/* Dots */}
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
          alt={`${title} ${idx + 1}`}
          fill
          className={`w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
            idx === activeImg ? "opacity-100" : "opacity-0"
          }`}
          priority={idx === 0}
          sizes="(max-width: 1024px) 100vw, 600px"
          draggable={false}
        />
      ))}
    </div>
  );
};



export default function Talks(props: { talks: Talk[] }) {
  const [talks, setTalks] = useState<Talk[]>(props.talks);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const { authenticated, token } = useAuthStore();
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTalk, setEditTalk] = useState<Talk | null>(null);
  const [form, setForm] = useState<TalkForm>(blankForm);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Talk | null>(null);
  const [deleting, setDeleting] = useState(false);

  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [searchQuery, setSearchQuery] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const firstKey = params.keys().next().value;
    return firstKey || null;
  });

  const openAdd = () => {
    setEditTalk(null);
    setForm(blankForm);
    setUploadError(null);
    setModalOpen(true);
  };

  const openEdit = (talk: Talk) => {
    setEditTalk(talk);
    setForm({
      title: talk.title,
      description: talk.description,
      images: talk.images,
      type: talk.type,
      name: talk.name,
      date: talk.date ? new Date(talk.date).toISOString().slice(0, 10) : "",
      speakers: talk.speakers,
      speakerLinkedins: talk.speakerLinkedins || "",
      link: talk.link || "",
    });
    setUploadError(null);
    setModalOpen(true);
  };


  const filteredTalks = useMemo(() => {
    return (activeTab === "all" ? talks : talks.filter((t) => t.type === activeTab))
      .filter((talk) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        if (talk.title.toLowerCase().includes(q)) return true;
        if (talk.description.toLowerCase().includes(q)) return true;
        if (talk.name.toLowerCase().includes(q)) return true;
        return talk.speakers.split(",").some((s, i) => {
          const name = s.trim().toLowerCase();
          const username = getLinkedinUsername(talk.speakerLinkedins?.split(",")[i] || "");
          return name.includes(q) || username.includes(q);
        });
      })
      .slice()
      .sort((a, b) => Number(new Date(b.date)) - Number(new Date(a.date)));
  }, [talks, activeTab, searchQuery]);


  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("module", "talks");
    formData.append("file", file);

    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (res.status === 201)
        setForm((prev) => ({ ...prev, images: [...prev.images, data.url] }));
      else setUploadError(data.error ?? "Upload failed");
    } catch {
      setUploadError("Network error during upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editTalk) {
        const res = await fetch("/api/talks", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...form, _id: editTalk._id }),
        });
        const data = await res.json();
        if (data.success) {
          setTalks((prev) =>
            prev.map((t) =>
              t._id === editTalk._id
                ? (serializeId(data.talk) as unknown as Talk)
                : t,
            ),
          );
          setModalOpen(false);
        }
      } else {
        const res = await fetch("/api/talks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (data.success) {
          setTalks((prev) => [
            ...prev,
            serializeId(data.talk) as unknown as Talk,
          ]);
          setModalOpen(false);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/talks?id=${deleteTarget._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTalks((prev) => prev.filter((t) => t._id !== deleteTarget._id));
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const isSaveDisabled =
    saving ||
    uploading ||
    !form.title ||
    !form.description ||
    !form.name ||
    !form.date ||
    !form.speakers ||
    form.images.length === 0;

  useEffect(() => {
    let ticking = false;
    const totalCards = filteredTalks.length;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const windowHeight = window.innerHeight;
          const centerY = windowHeight / 2;

          cardsRef.current.forEach((card, index) => {
            if (!card) return;
            const parent = card.parentElement;
            const rect = parent ? parent.getBoundingClientRect() : card.getBoundingClientRect();
            const targetCenter = centerY + window.scrollY;
            const distanceFromCenter =
              rect.top + window.scrollY + rect.height / 2 - targetCenter;

            const normalizedDistance = distanceFromCenter / windowHeight;

            const clampedDistance = Math.max(
              -1.5,
              Math.min(1.5, normalizedDistance),
            );

            const rotation = clampedDistance * 35;
            const zTranslation = Math.max(
              -200,
              Math.min(0, Math.abs(clampedDistance) * -200),
            );

            const opacity =
              1 - Math.min(Math.abs(clampedDistance) * 0.8, 1);

            const isFirstCard = index === 0;
            const isLastCard = index === totalCards - 1;
            const shouldBeFlat =
              (isFirstCard && clampedDistance > 0) ||
              (isLastCard && clampedDistance < 0);
            const finalRotation = shouldBeFlat ? 0 : -rotation;
            const finalZ = shouldBeFlat ? 0 : zTranslation;
            const finalOpacity = shouldBeFlat ? 1 : opacity;

            card.style.transform = `perspective(1000px) rotateX(${finalRotation}deg) translate3d(0, 0, ${finalZ}px)`;
            card.style.opacity = String(finalOpacity);
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [filteredTalks.length]);

  return (
    <section className="overflow-x-hidden rounded-xl text-white py-8 md:py-12 text-lexend-300 min-h-xl">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-10 lg:px-20 py-12 text-center">
        {/* Heading */}
        <div className="text-3xl md:text-5xl lg:text-6xl font-medium mb-6 px-4 md:px-10 flex flex-wrap justify-center gap-2">
          {phrases.map((phrase, idx) => (
            <motion.span
              key={idx}
              initial={{ opacity: 0, y: 6, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                duration: 1,
                delay: idx * 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {phrase}
              {idx < phrases.length - 1 ? "." : ""}
            </motion.span>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-gray-400 text-base md:text-lg lg:text-xl text-lexend-300 font-light mb-6"
        >
          A showcase of talks and conferences by the talented members of
          <br />
          Point Blank.
        </motion.p>

        {authenticated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.8 }}
            className="flex justify-center mb-4"
          >
            <button
              onClick={openAdd}
              className="px-6 py-2 bg-pbgreen text-black font-medium rounded-full hover:opacity-90 transition-opacity text-sm cursor-pointer"
            >
              + Add Talk
            </button>
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center justify-between gap-2 md:gap-3 mb-8 py-4 md:py-6"
        >
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 md:px-5 py-1.5 md:py-2.5 rounded-full text-sm md:text-base uppercase cursor-pointer ${activeTab === tab
                  ? "bg-pbgreen text-black"
                  : "bg-white/5 text-white/60"
                  }`}
              >
                {tab === "all" ? "All" : tab}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="search"
            value={searchQuery ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              const nextUrl = value
                ? `${window.location.pathname}?${encodeURIComponent(value)}${window.location.hash}`
                : `${window.location.pathname}${window.location.hash}`;
              window.history.replaceState({}, "", nextUrl);
              setSearchQuery(value || null);
            }}
            className="h-[42px] w-[200px] sm:w-[260px] rounded-full border border-transparent bg-[#222222] px-5 py-3 text-xs/relaxed font-medium text-white outline-none"
          />
        </motion.div>

        {/* Talks list */}
        <div>
          {filteredTalks.length === 0 && (
            <p className="text-gray-400 text-lg mt-8">No talks found.</p>
          )}

          {filteredTalks.map((talk, idx) => (
            <motion.div
              key={String(talk._id)}
              initial={searchQuery ? false : { opacity: 0 }}
              whileInView={searchQuery ? undefined : { opacity: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.25,
                delay: idx === 0 ? 2 : 0.25,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative"
            >
              <div
                key={String(talk._id)}
                ref={(el) => {
                  cardsRef.current[idx] = el;
                }}
                className="bg-pbgray rounded-xl max-w-screen-2xl mx-auto flex justify-center mb-16 px-4 md:px-10 lg:px-4"
                onMouseEnter={() => setHoveredCardId(String(talk._id))}
                onMouseLeave={() =>
                  setHoveredCardId((curr) =>
                    curr === String(talk._id) ? null : curr,
                  )
                }
                onTouchStart={() => setHoveredCardId(String(talk._id))}
                style={{
                  willChange: 'transform, opacity',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <div className="flex flex-col lg:flex-row items-start py-4 w-full">
                  <div className="flex flex-col items-center w-full lg:w-125 xl:w-150 shrink-0">
                    <TalkImageSlideshow
                      images={talk.images}
                      title={talk.title}
                      isPlaying={hoveredCardId === String(talk._id)}
                    />
                    <div className="flex flex-row flex-wrap justify-center w-full gap-2 mt-4">
                      {talk.speakers.split(",").map((speakerName, i) => {
                        const linkedins = talk.speakerLinkedins ? talk.speakerLinkedins.split(",") : [];
                        const linkedin = linkedins[i] && linkedins[i].trim() ? linkedins[i].trim() : undefined;
                        return <SpeakerTube key={i} name={speakerName.trim()} linkedin={linkedin} />;
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col items-start w-full px-0 lg:px-8 lg:min-h-[333px] xl:min-h-[400px] justify-between mt-6 lg:mt-0">
                    <div>
                      <h2 className="text-pbgreen font-normal text-2xl md:text-3xl lg:text-4xl leading-snug mb-4 max-w-4xl text-left break-words">
                        {talk.title}
                      </h2>
                      <div className="flex-1 text-gray-400 text-sm md:text-base leading-relaxed max-w-3xl text-left break-words">
                        <motion.div
                          animate={{
                            maxHeight: expanded === String(talk._id) ? 1000 : 120,
                          }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          style={{ overflow: "hidden" }}
                        >
                          <p className={expanded === String(talk._id) ? "" : "line-clamp-4"}>
                            {talk.description}
                          </p>
                        </motion.div>
                      </div>
                    </div>

                    <div className="w-full">
                      <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4">
                        <button
                          className="bg-pbsurface min-h-[40px] py-2.5 px-5 md:min-h-[44px] md:px-8 md:py-3.5 text-xs md:text-sm text-white rounded-2xl cursor-pointer border border-transparent hover:border-pbgreen transition-colors active:scale-95 inline-flex items-center justify-center"
                          onClick={() =>
                            setExpanded(
                              expanded === String(talk._id)
                                ? null
                                : String(talk._id),
                            )
                          }
                        >
                          {expanded === String(talk._id)
                            ? "Read Less"
                            : "Read More"}
                        </button>

                        {expanded === String(talk._id) && talk.link ? (
                          <a
                            href={talk.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-pbsurface min-h-[40px] py-2.5 px-5 md:min-h-[44px] md:px-8 md:py-3.5 text-xs md:text-sm text-pbgreen rounded-2xl font-medium hover:opacity-90 transition-opacity inline-flex items-center justify-center"
                          >
                            Watch here
                          </a>
                        ) : (
                          <span className="bg-pbsurface min-h-[40px] py-2.5 px-5 md:min-h-[44px] md:px-8 md:py-3.5 text-xs md:text-sm text-white rounded-2xl inline-flex items-center justify-center">
                            {talk.name} | {new Date(talk.date).toLocaleDateString("en-US", {
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      </div>

                      {authenticated && (
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => openEdit(talk)}
                            className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(talk)}
                            className="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-full transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="dark bg-pbpages border-pbborder text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-base">
              {editTalk ? "Edit Talk" : "Add Talk"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {TEXT_FIELDS.map(({ label, key, type, required }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <Label className="text-pbtext text-xs">
                  {label}
                  {required && <span className="text-pbgreen ml-0.5">*</span>}
                </Label>
                <Input
                  type={type}
                  value={(form[key] as string) ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="bg-pbgray border-pbborder text-white placeholder:text-pbtext/50 focus-visible:border-pbgreen focus-visible:ring-pbgreen/20 h-8"
                />
              </div>
            ))}

            <div className="flex flex-col gap-1.5">
              <Label className="text-pbtext text-xs">
                Type<span className="text-pbgreen ml-0.5">*</span>
              </Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, type: v as Talk["type"] }))
                }
              >
                <SelectTrigger className="w-full bg-pbgray border-pbborder text-white h-8 focus:ring-pbgreen/20 focus:border-pbgreen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark bg-pbgray border-pbborder text-white">
                  <SelectItem value="conference">Conference</SelectItem>
                  <SelectItem value="talks">Talk</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Images */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-pbtext text-xs">
                Images<span className="text-pbgreen ml-0.5">*</span>
              </Label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              {form.images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.images.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative w-20 h-20 rounded-xl overflow-hidden border border-pbborder group"
                    >
                      <Image
                        src={url}
                        alt={`Image ${idx + 1}`}
                        fill
                        style={{ objectFit: "cover" }}
                        className="rounded-xl"
                        draggable={false}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70 hover:bg-black transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <XIcon className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex flex-col items-center justify-center gap-2 w-full py-4 rounded-xl border border-dashed border-pbborder hover:border-pbgreen transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UploadCloudIcon className="h-5 w-5 text-pbtext" />
                <span className="text-pbtext text-xs">
                  {uploading ? "Uploading…" : "Click to upload image"}
                </span>
                <span className="text-pbtext/50 text-[10px]">
                  PNG, JPG, WEBP — max 10 MB
                </span>
              </button>

              {uploading && (
                <div className="flex flex-col gap-1">
                  <Progress
                    value={null}
                    className="h-1.5 bg-pbborder *:data-[slot=progress-indicator]:bg-pbgreen animate-pulse"
                  />
                  <span className="text-pbtext/60 text-[10px] text-right">
                    Uploading…
                  </span>
                </div>
              )}

              {uploadError && (
                <p className="text-red-400 text-xs">{uploadError}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="border-pbborder text-pbtext hover:text-white hover:border-white bg-transparent flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="bg-pbgreen text-black hover:bg-pbgreen/90 font-medium flex-1"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="dark bg-pbpages border-pbborder text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-base">
              Delete Talk
            </DialogTitle>
          </DialogHeader>

          <p className="text-pbtext text-sm py-2">
            Are you sure you want to delete{" "}
            <span className="text-white font-medium">
              {deleteTarget?.title}
            </span>
            ? This action cannot be undone.
          </p>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-pbborder text-pbtext hover:text-white hover:border-white bg-transparent flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white font-medium flex-1"
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
