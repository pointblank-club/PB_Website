"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Pencil, Trash2, Plus, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { AchievementCard } from "@/components/achievements/AchievementsCard";
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
import Image from "next/image";
import { serializeId } from "@/lib/utils";
import {
  supportsLink,
  linkConfig,
  officialLinkWarning,
} from "@/lib/achievementLinkHints";


type AchievementEntry = { title: string; description?: string; url?: string };

type AchievementsDoc = {
  _id: string;
  name: string;
  imageUrl?: string;
  achivements: {
    GSoC?: AchievementEntry[];
    LFX?: AchievementEntry[];
    SIH?: AchievementEntry[];
    LIFT?: AchievementEntry[];
    Hackathons?: AchievementEntry[];
    CP?: AchievementEntry[];
    ACM?: AchievementEntry[];
  };
};

type MemberOption = {
  _id: string;
  name: string;
  imageUrl?: string;
};

const DB_CATEGORIES = [
  "GSoC",
  "LFX",
  "SIH",
  "LIFT",
  "Hackathons",
  "CP",
  "ACM",
] as const;
type DbCategory = (typeof DB_CATEGORIES)[number];

const CATEGORY_FILTER_MAP: Record<DbCategory, string> = {
  GSoC: "GSOC",
  LFX: "LFX",
  SIH: "SIH",
  LIFT: "LIFT",
  Hackathons: "HACKATHONS",
  CP: "CP",
  ACM: "ACM",
};

const FILTER_CATEGORIES = [
  "ALL",
  "HACKATHONS",
  "GSOC",
  "LFX",
  "SIH",
  "LIFT",
  "ACM",
  "CP",
];

const headingText = "We Build. We Ship. We Win.";
const phrases = headingText.split(". ");

function docToDisplayMember(doc: AchievementsDoc) {
  const items: { event: string; result: string; category: string; url?: string }[] = [];

  for (const cat of DB_CATEGORIES) {
    const entries = doc.achivements[cat] ?? [];
    for (const entry of entries) {
      items.push({
        event: entry.title,
        result: entry.description ?? "",
        category: CATEGORY_FILTER_MAP[cat],
        url: entry.url || undefined,
      });
    }
  }

  const achievements: { event: string; result: string; category: string; url?: string; }[][] =
    [];
  for (let i = 0; i < items.length; i += 2) {
    achievements.push(items.slice(i, i + 2));
  }

  return { name: doc.name, avatar: doc.imageUrl, achievements };
}

export default function Achievements({
  initialDocs,
}: {
  initialDocs: AchievementsDoc[];
}) {
  const [docs, setDocs] = useState<AchievementsDoc[]>(initialDocs);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { authenticated, token } = useAuthStore();

  const [addOpen, setAddOpen] = useState(false);
  const [allMembers, setAllMembers] = useState<MemberOption[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(
    null,
  );
  const [addCategory, setAddCategory] = useState<DbCategory>("GSoC");
  const [addTitle, setAddTitle] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  const [editDoc, setEditDoc] = useState<AchievementsDoc | null>(null);
  const [editAchivements, setEditAchivements] = useState<
    AchievementsDoc["achivements"]
  >({});
  const [newEntryCategory, setNewEntryCategory] = useState<DbCategory>("GSoC");
  const [newEntryTitle, setNewEntryTitle] = useState("");
  const [newEntryDesc, setNewEntryDesc] = useState("");
  const [newEntryUrl, setNewEntryUrl] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [deleteDoc, setDeleteDoc] = useState<AchievementsDoc | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        memberDropdownRef.current &&
        !memberDropdownRef.current.contains(e.target as Node)
      ) {
        setMemberDropdownOpen(false);
      }
    };
    if (memberDropdownOpen) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [memberDropdownOpen]);

  const handleSearchToggle = () => {
    if (searchOpen) {
      setSearchQuery("");
      setSearchOpen(false);
    } else {
      setSearchOpen(true);
    }
  };

  const openAdd = async () => {
    setSelectedMember(null);
    setMemberSearch("");
    setAddCategory("GSoC");
    setAddTitle("");
    setAddDesc("");
    setAddUrl("");
    setAddError("");
    setAddOpen(true);

    if (allMembers.length === 0) {
      try {
        const res = await fetch("/api/members");
        const data = await res.json();
        setAllMembers(
          (data.members ?? []).map(
            (m: { _id: string; name: string; imageUrl?: string }) => ({
              _id: m._id,
              name: m.name,
              imageUrl: m.imageUrl,
            }),
          ),
        );
      } catch {
        // silently fail — dropdown will be empty
      }
    }
  };

  const openEdit = (doc: AchievementsDoc) => {
    setEditDoc(doc);
    setEditAchivements(JSON.parse(JSON.stringify(doc.achivements)));
    setNewEntryCategory("GSoC");
    setNewEntryTitle("");
    setNewEntryDesc("");
    setNewEntryUrl("");
    setEditError("");
  };

  const handleAddSave = async () => {
    if (!selectedMember || !addTitle) return;
    setAddSaving(true);
    try {
      const existingDoc = docs.find((d) => d.name === selectedMember.name);

      if (existingDoc) {
        const updatedDoc: AchievementsDoc = {
          ...existingDoc,
          achivements: {
            ...existingDoc.achivements,
            [addCategory]: [
              ...(existingDoc.achivements[addCategory] ?? []),
              { title: addTitle, description: addDesc, url: supportsLink(addCategory) ? addUrl.trim() : undefined },
            ],
          },
        };
        const res = await fetch("/api/achievements", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatedDoc),
        });
        const data = await res.json();
        if (data.success) {
          setDocs((prev) =>
            prev.map((d) => (d._id === existingDoc._id ? updatedDoc : d)),
          );
          setAddOpen(false);
        } 
        else {
+          setAddError(data.error ?? "Failed to save");
        }
      } else {
        const payload = {
          name: selectedMember.name,
          imageUrl: selectedMember.imageUrl ?? "",
          achivements: {
            [addCategory]: [{ title: addTitle, description: addDesc, url: supportsLink(addCategory) ? addUrl.trim() : undefined }],
          },
        };
        const res = await fetch("/api/achievements", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success && data.achievement) {
          const newDoc: AchievementsDoc = serializeId(
            data.achievement,
          ) as AchievementsDoc;
          setDocs((prev) => [...prev, newDoc]);
          setAddOpen(false);
          } else {
+          setAddError(data.error ?? "Failed to save");
        }
      }
    } finally {
      setAddSaving(false);
    }
  };

  const handleAddNewEntry = () => {
    if (!newEntryTitle) return;
    setEditAchivements((prev) => ({
      ...prev,
      [newEntryCategory]: [
        ...(prev[newEntryCategory] ?? []),
        { title: newEntryTitle, description: newEntryDesc, url:
            supportsLink(newEntryCategory) && newEntryUrl.trim() ? newEntryUrl.trim(): undefined, },
      ],
    }));
    setNewEntryTitle("");
    setNewEntryDesc("");
    setNewEntryUrl("");
  };

  const handleEntryUrlChange = (
    cat: DbCategory,
    idx: number,
    value: string,
  ) => {
    setEditAchivements((prev) => ({
      ...prev,
      [cat]: (prev[cat] ?? []).map((entry, i) =>
        i === idx ? { ...entry, url: value } : entry,
      ),
    }));
   };

  // entries that still have no link (shown as a nudge in the editor)
  const missingLinkCount = DB_CATEGORIES.filter(supportsLink).reduce(
    (sum, cat) =>
      sum + (editAchivements[cat] ?? []).filter((e) => !e.url?.trim()).length,
    0,
  );

  const handleRemoveEntry = (cat: DbCategory, idx: number) => {
    setEditAchivements((prev) => ({
      ...prev,
      [cat]: (prev[cat] ?? []).filter((_, i) => i !== idx),
    }));
  };

  const handleEditSave = async () => {
    if (!editDoc) return;
    setEditSaving(true);
    try {
      const payload = { ...editDoc, achivements: editAchivements };
      const res = await fetch("/api/achievements", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setDocs((prev) =>
          prev.map((d) => (d._id === editDoc._id ? payload : d)),
        );
        setEditDoc(null);
         } else {
            setEditError(data.error ?? "Failed to save");
      }
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/achievements?id=${deleteDoc._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDocs((prev) => prev.filter((d) => d._id !== deleteDoc._id));
        setDeleteDoc(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const countAchievements = (doc: AchievementsDoc) =>
    DB_CATEGORIES.reduce(
      (sum, cat) => sum + (doc.achivements[cat]?.length ?? 0),
      0,
    );

  const filteredDocs = docs
    .filter((doc) => {
      const member = docToDisplayMember(doc);
      const matchesCategory =
        activeCategory === "ALL" ||
        member.achievements.some((row) =>
          row.some((item) => item.category === activeCategory),
        );
      const matchesSearch =
        searchQuery.trim() === "" ||
        doc.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      const diff = countAchievements(b) - countAchievements(a);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });

  const filteredMemberOptions = allMembers.filter((m) =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase()),
  );

  return (
    <main className="min-h-screen text-white">
      {/* Heading */}
      <div className="flex flex-col items-center justify-center pt-20 pb-12 px-4 text-center">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-medium mb-6 px-4 md:px-10 flex flex-wrap justify-center gap-2">
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
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-gray-400 text-base md:text-lg lg:text-xl text-lexend-300 font-light mb-6"
        >
          A showcase of achievements by the talented members of PointBlank
        </motion.p>

        {authenticated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.5 }}
          >
            <button
              onClick={openAdd}
              className="mb-4 px-6 py-2 bg-pbgreen text-black font-medium rounded-full hover:opacity-90 transition-opacity text-sm cursor-pointer"
            >
              + Add Achievement
            </button>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center justify-center gap-2 px-4 py-2.5 rounded-full"
        >
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 md:px-5 py-1.5 md:py-2.5 rounded-full text-sm md:text-base uppercase cursor-pointer transition-colors duration-200
                ${activeCategory === cat ? "bg-pbgreen text-black" : "bg-pbgray text-white/60"}`}
            >
              {cat}
            </button>
          ))}

          <div className="flex items-center gap-2">
            <div
              className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out bg-pbgray rounded-full ${
                searchOpen ? "w-48 px-3" : "w-0 px-0"
              }`}
            >
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search members..."
                className="bg-transparent text-white text-xs placeholder-white/40 outline-none w-full py-2"
              />
            </div>
            <button
              onClick={handleSearchToggle}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-pbgray text-white/60 hover:bg-pbgreen hover:text-black transition-all duration-200 cursor-pointer shrink-0"
              aria-label={searchOpen ? "Close search" : "Open search"}
            >
              {searchOpen ? <X size={16} /> : <Search size={16} />}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Achievement Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 2, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-8 lg:px-15 pb-8 sm:pb-12 lg:pb-15"
      >
        {filteredDocs.length > 0 ? (
          filteredDocs.map((doc, i) => (
            <motion.div
              key={doc._id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.55,
                delay: (i % 3) * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative group"
            >
              <AchievementCard
                member={docToDisplayMember(doc)}
                filterCategory={activeCategory}
              />
              {authenticated && (
                <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(doc)}
                    className="p-1.5 rounded-full bg-black/60 hover:bg-pbgreen hover:text-black text-white transition-colors cursor-pointer"
                    title="Edit achievements"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => setDeleteDoc(doc)}
                    className="p-1.5 rounded-full bg-black/60 hover:bg-red-500 text-white transition-colors cursor-pointer"
                    title="Delete achievements"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <p className="col-span-full text-center text-gray-400 py-12 text-lg">
            No members found{searchQuery ? ` for "${searchQuery}"` : ""}.
          </p>
        )}
      </motion.div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="dark bg-pbpages border-pbborder text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-base">
              Add Achievement
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* Member searchable dropdown */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-pbtext text-xs">
                Member<span className="text-pbgreen ml-0.5">*</span>
              </Label>
              <div className="relative" ref={memberDropdownRef}>
                <button
                  type="button"
                  onClick={() => setMemberDropdownOpen((o) => !o)}
                  className="w-full flex items-center justify-between bg-pbgray border border-pbborder text-white text-sm rounded-md px-3 h-9 hover:border-pbgreen transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {selectedMember ? (
                      <>
                        <div className="w-5 h-5 rounded-full shrink-0 overflow-hidden bg-white/10 flex items-center justify-center text-[9px] font-bold text-white">
                          {selectedMember.imageUrl ? (
                            <Image
                              src={selectedMember.imageUrl}
                              alt={selectedMember.name}
                              className="w-full h-full object-cover"
                              width={20}
                              height={20}
                            />
                          ) : (
                            selectedMember.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                          )}
                        </div>
                        <span className="text-white truncate">
                          {selectedMember.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-white/40 text-xs">
                        Select a member...
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    size={14}
                    className="text-pbtext shrink-0 ml-2"
                  />
                </button>

                {memberDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-pbgray border border-pbborder rounded-md shadow-lg flex flex-col max-h-60">
                    <div className="p-2 border-b border-pbborder shrink-0">
                      <input
                        type="text"
                        placeholder="Search members..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="w-full bg-transparent text-white text-xs placeholder-white/40 outline-none px-1 py-0.5"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto">
                      {filteredMemberOptions.length === 0 ? (
                        <p className="text-pbtext text-xs text-center py-3">
                          No members found
                        </p>
                      ) : (
                        filteredMemberOptions.map((m) => (
                          <button
                            key={m._id}
                            type="button"
                            onClick={() => {
                              setSelectedMember(m);
                              setMemberDropdownOpen(false);
                              setMemberSearch("");
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <div className="w-6 h-6 rounded-full shrink-0 overflow-hidden bg-white/10 flex items-center justify-center text-[9px] font-bold text-white">
                              {m.imageUrl ? (
                                <Image
                                  src={m.imageUrl}
                                  alt={m.name}
                                  className="w-full h-full object-cover"
                                  width={20}
                                  height={20}
                                />
                              ) : (
                                m.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)
                              )}
                            </div>
                            <span className="truncate">{m.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-pbtext text-xs">
                Category<span className="text-pbgreen ml-0.5">*</span>
              </Label>
              <Select
                value={addCategory}
                onValueChange={(v) => {
                  setAddCategory(v as DbCategory);
                  if (!supportsLink(v)) setAddUrl("");
                  setAddError("");
                }}
              >
                <SelectTrigger className="w-full bg-pbgray border-pbborder text-white h-8 focus:ring-pbgreen/20 focus:border-pbgreen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark bg-pbgray border-pbborder text-white">
                  {DB_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-pbtext text-xs">
                Title / Event<span className="text-pbgreen ml-0.5">*</span>
              </Label>
              <Input
                type="text"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                placeholder="e.g. GSoC '24"
                className="bg-pbgray border-pbborder text-white placeholder:text-pbtext/50 focus-visible:border-pbgreen focus-visible:ring-pbgreen/20 h-8"
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-pbtext text-xs">
                Description / Result
              </Label>
              <Input
                type="text"
                value={addDesc}
                onChange={(e) => setAddDesc(e.target.value)}
                placeholder="e.g. @Keploy, Winner, Top 5%"
                className="bg-pbgray border-pbborder text-white placeholder:text-pbtext/50 focus-visible:border-pbgreen focus-visible:ring-pbgreen/20 h-8"
              />
            </div>
            {/* Proof link — GSoC and LFX only */}
            {supportsLink(addCategory) && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-pbtext text-xs">
                  {linkConfig(addCategory).label}
                </Label>
                <Input
                  type="url"
                  value={addUrl}
                  onChange={(e) => setAddUrl(e.target.value)}
                  placeholder={linkConfig(addCategory).placeholder}
                  className="bg-pbgray border-pbborder text-white placeholder:text-pbtext/50 focus-visible:border-pbgreen focus-visible:ring-pbgreen/20 h-8"
                />
                {officialLinkWarning(addCategory, addUrl) && (
                  <p className="text-[11px] text-yellow-500/90">
                    {officialLinkWarning(addCategory, addUrl)}
                  </p>
                )}
              </div>
            )}
            {addError && <p className="text-xs text-red-400">{addError}</p>}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              className="border-pbborder text-pbtext hover:text-white hover:border-white bg-transparent flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSave}
              disabled={addSaving || !selectedMember || !addTitle}
              className="bg-pbgreen text-black hover:bg-pbgreen/90 font-medium flex-1"
            >
              {addSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editDoc}
        onOpenChange={(open) => !open && setEditDoc(null)}
      >
        <DialogContent className="dark bg-pbpages border-pbborder text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-base">
              Edit Achievements — {editDoc?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {missingLinkCount > 0 && (
              <p className="text-[11px] text-yellow-500/90">
                {missingLinkCount} {" "}
                {missingLinkCount === 1 ? "entry has" : "entries have"} no
                links yet.
              </p>
            )}
            {/* Existing entries per category */}
            {DB_CATEGORIES.map((cat) => {
              const entries = editAchivements[cat] ?? [];
              if (entries.length === 0) return null;
              return (
                <div key={cat} className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-pbgreen uppercase tracking-wide">
                    {cat}
                  </p>
                  {entries.map((entry, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-pbgray border border-pbborder rounded-lg px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                          {entry.title}
                        </p>
                        {entry.description && (
                          <p className="text-xs text-pbtext truncate">
                            {entry.description}
                          </p>
                        )}
                        {supportsLink(cat) && (
                          <div className="mt-1.5">
                            <Input
                              type="url"
                              value={entry.url ?? ""}
                              onChange={(e) =>
                                handleEntryUrlChange(cat, idx, e.target.value)
                              }
                              placeholder={linkConfig(cat).placeholder}
                              aria-label={`${linkConfig(cat).label} for ${entry.title}`}
                              className="bg-pbpages border-pbborder text-white text-xs placeholder:text-pbtext/40 focus-visible:border-pbgreen focus-visible:ring-pbgreen/20 h-7"
                            />
                            {officialLinkWarning(cat, entry.url) && (
                              <p className="text-[10px] text-yellow-500/90 mt-1">
                                {officialLinkWarning(cat, entry.url)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveEntry(cat, idx)}
                        className="shrink-0 p-1 rounded hover:bg-red-500/20 text-pbtext hover:text-red-400 transition-colors cursor-pointer"
                        title="Remove entry"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Add new entry section */}
            <div className="border border-dashed border-pbborder rounded-lg p-3 flex flex-col gap-3">
              <p className="text-xs text-pbtext font-medium">Add Entry</p>
              <Select
                value={newEntryCategory}
                onValueChange={(v) => {
                  setNewEntryCategory(v as DbCategory);
                  if (!supportsLink(v)) setNewEntryUrl("");
                }}
              >
                <SelectTrigger className="w-full bg-pbgray border-pbborder text-white h-8 focus:ring-pbgreen/20 focus:border-pbgreen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark bg-pbgray border-pbborder text-white">
                  {DB_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="text"
                value={newEntryTitle}
                onChange={(e) => setNewEntryTitle(e.target.value)}
                placeholder="Title / Event *"
                className="bg-pbgray border-pbborder text-white placeholder:text-pbtext/50 focus-visible:border-pbgreen focus-visible:ring-pbgreen/20 h-8"
              />
              <Input
                type="text"
                value={newEntryDesc}
                onChange={(e) => setNewEntryDesc(e.target.value)}
                placeholder="Description / Result"
                className="bg-pbgray border-pbborder text-white placeholder:text-pbtext/50 focus-visible:border-pbgreen focus-visible:ring-pbgreen/20 h-8"
              />
              {supportsLink(newEntryCategory) && (
                <>
                  <Input
                    type="url"
                    value={newEntryUrl}
                    onChange={(e) => setNewEntryUrl(e.target.value)}
                    placeholder={linkConfig(newEntryCategory).placeholder}
                    aria-label={linkConfig(newEntryCategory).label}
                    className="bg-pbgray border-pbborder text-white placeholder:text-pbtext/50 focus-visible:border-pbgreen focus-visible:ring-pbgreen/20 h-8"
                  />
                  {officialLinkWarning(newEntryCategory, newEntryUrl) && (
                    <p className="text-[11px] text-yellow-500/90 -mt-1">
                      {officialLinkWarning(newEntryCategory, newEntryUrl)}
                    </p>
                  )}
                </>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddNewEntry}
                disabled={!newEntryTitle}
                className="border-pbborder text-pbtext hover:text-white hover:border-pbgreen bg-transparent h-8 text-xs cursor-pointer"
              >
                <Plus size={12} className="mr-1" />
                Add Entry
              </Button>
            </div>
          </div>

        {editError && <p className="text-xs text-red-400">{editError}</p>}
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setEditDoc(null)}
              className="border-pbborder text-pbtext hover:text-white hover:border-white bg-transparent flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={editSaving}
              className="bg-pbgreen text-black hover:bg-pbgreen/90 font-medium flex-1"
            >
              {editSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteDoc}
        onOpenChange={(open) => !open && setDeleteDoc(null)}
      >
        <DialogContent className="dark bg-pbpages border-pbborder text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-base">
              Delete Achievement
            </DialogTitle>
          </DialogHeader>
          <p className="text-pbtext text-sm py-2">
            Are you sure you want to delete all achievements for{" "}
            <span className="text-white font-medium">{deleteDoc?.name}</span>?
            This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDoc(null)}
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
    </main>
  );
}
