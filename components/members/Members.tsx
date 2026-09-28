"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Card from "@/components/members/MembersCard";
import CollapsibleSection from "@/components/members/Collapsible";
import RecruitmentBanner from "@/components/members/RecruitmentBanner";
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
import { UploadCloudIcon, XIcon } from "lucide-react";
import RecruitmentBanner from "@/components/ui/RecruitmentBanner";

interface Member {
  _id: string;
  name: string;
  role: string;
  company?: string;
  year: "first" | "second" | "third" | "fourth" | "alumni";
  linkedInUrl?: string;
  imageUrl?: string;
  tags?: "lead" | "alumni-lead";
  leadDesc?: string;
}

type MemberForm = Omit<Member, "_id">;

const blankForm: MemberForm = {
  name: "",
  role: "",
  year: "first",
  company: "",
  linkedInUrl: "",
  imageUrl: "",
  tags: undefined,
  leadDesc: "",
};

const yearOrder: Record<string, number> = {
  fourth: 0,
  third: 1,
  second: 2,
  first: 3,
  alumni: 4,
};

const headings = [
  "Current Leads",
  "Alumni Leads",
  "Alumni",
  "Fourth Year",
  "Third Year",
  "Second Year",
  "First Year",
];

function groupMembers(members: Member[]): Record<string, Member[]> {
  const groups: Record<string, Member[]> = {
    "Current Leads": [],
    "Alumni Leads": [],
    Alumni: [],
    "Fourth Year": [],
    "Third Year": [],
    "Second Year": [],
    "First Year": [],
  };
  for (const m of members) {
    if (m.tags === "lead") {
      groups["Current Leads"].push(m);
      if (m.year === "fourth") groups["Fourth Year"].push(m);
      else if (m.year === "third") groups["Third Year"].push(m);
      else if (m.year === "second") groups["Second Year"].push(m);
      else if (m.year === "first") groups["First Year"].push(m);
    } else if (m.tags === "alumni-lead") groups["Alumni Leads"].push(m);
    else if (m.year === "alumni") groups["Alumni"].push(m);
    else if (m.year === "fourth") groups["Fourth Year"].push(m);
    else if (m.year === "third") groups["Third Year"].push(m);
    else if (m.year === "second") groups["Second Year"].push(m);
    else if (m.year === "first") groups["First Year"].push(m);
  }
  return groups;
}

const TEXT_FIELDS: {
  label: string;
  key: keyof MemberForm;
  type: string;
  required?: boolean;
}[] = [
  { label: "Name", key: "name", type: "text", required: true },
  { label: "Role", key: "role", type: "text", required: true },
  { label: "LinkedIn URL", key: "linkedInUrl", type: "url" },
  { label: "Company", key: "company", type: "text" },
  { label: "Lead Description", key: "leadDesc", type: "text" },
];

export default function Members(props: { members: Member[] }) {
  const [openIndex, setOpenIndex] = useState<number>(-1);
  const [members, setMembers] = useState<Member[]>(props.members);
  const { authenticated, token } = useAuthStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [form, setForm] = useState<MemberForm>(blankForm);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [flippedId, setFlippedId] = useState<string | null>(null);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  const openAdd = () => {
    setEditMember(null);
    setForm(blankForm);
    setUploadError(null);
    setModalOpen(true);
  };

  const openEdit = (member: Member) => {
    setEditMember(member);
    setForm({
      name: member.name,
      role: member.role,
      year: member.year,
      company: member.company ?? "",
      linkedInUrl: member.linkedInUrl ?? "",
      imageUrl: member.imageUrl ?? "",
      tags: member.tags,
      leadDesc: member.leadDesc ?? "",
    });
    setUploadError(null);
    setModalOpen(true);
  };

  const handleFlip = (id: string) => {
    setFlippedId(flippedId === id ? null : id);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("module", "members");
    formData.append("file", file);

    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (res.status === 201)
        setForm((prev) => ({ ...prev, imageUrl: data.url }));
      else setUploadError(data.error ?? "Upload failed");
    } catch {
      setUploadError("Network error during upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearImage = () => {
    setForm((prev) => ({ ...prev, imageUrl: "" }));
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<Member> = { ...form };
      if (!payload.tags) delete payload.tags;

      if (editMember) {
        const res = await fetch(
          "/api/members",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ ...payload, _id: editMember._id }),
          },
        );
        const data = await res.json();
        if (data.success) {
          setMembers((prev) =>
            prev.map((m) => (m._id === editMember._id ? data.member : m)),
          );
          setModalOpen(false);
        }
      } else {
        const res = await fetch(
          "/api/members",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          },
        );
        const data = await res.json();
        if (data.success) {
          setMembers((prev) => [...prev, data.member]);
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
      const res = await fetch(
        `/api/members?id=${deleteTarget._id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (data.success) {
        setMembers((prev) => prev.filter((m) => m._id !== deleteTarget._id));
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const grouped = groupMembers(members);
  const isAnyOpen = openIndex !== -1;

  return (
    <div className="flex flex-col justify-center items-center w-full h-full space-y-4 mt-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center justify-center gap-4 mb-8 md:mb-12"
      >
        <h1 className="text-lexend font-normal text-4xl md:text-6xl leading-tight">
          <span className="text-pbgreen">{"<. > "}</span>
          <span className="text-white">Members</span>
        </h1>
        {authenticated && (
          <button
            onClick={openAdd}
            className="mt-2 px-6 py-2 bg-pbgreen text-black font-medium rounded-full hover:opacity-90 transition-opacity text-sm cursor-pointer"
          >
            + Add Member
          </button>
        )}
      </motion.div>

      {/* Member sections */}

      <div className="w-full max-w-8xl px-4 md:px-6 lg:px-8 md:mt-24 mt-8">
        <div className="rounded-2xl overflow-hidden">
          {headings.map((heading, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.5,
                delay: index * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`transition-colors duration-500 border-b last:border-b-0 border-pbtext ${
                index === headings.length - 1 || openIndex === index
                  ? "border-b-0"
                  : "border-b border-pbtext"
              }`}
            >
              <CollapsibleSection
                heading={heading}
                isOpen={openIndex === index}
                isAnySectionOpen={isAnyOpen}
                onToggle={() => handleToggle(index)}
                content={
                  <div className="flex flex-col items-center space-y-6 w-full pt-4 pb-8">
                    {heading === "First Year" && <RecruitmentBanner />}
                    <div
                      className={`grid justify-items-center gap-y-12 gap-x-6 md:gap-x-8 lg:gap-x-10 w-full max-w-7xl mx-auto grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`}
                    >
                      {grouped[heading]
                        ?.slice()
                        .sort((a, b) => {
                          if (heading === "Current Leads") {
                            const yearDiff =
                              (yearOrder[a.year] ?? 99) -
                              (yearOrder[b.year] ?? 99);
                            if (yearDiff !== 0) return yearDiff;
                          }
                          return a.name.localeCompare(b.name, undefined, {
                            sensitivity: "base",
                          });
                        })
                        .map((profile) => (
                          <Card
                            key={profile._id}
                            name={profile.name}
                            role={profile.role}
                            company={profile.company ?? ""}
                            linkedInUrl={profile.linkedInUrl ?? ""}
                            imageUrl={profile.imageUrl ?? ""}
                            leadDesc={
                              heading === "Current Leads"
                                ? (profile.leadDesc ?? "")
                                : undefined
                            }
                            isAdmin={authenticated}
                            onEdit={() => openEdit(profile)}
                            onDelete={() => setDeleteTarget(profile)}
                            isFlipped={flippedId === profile._id}
                            onFlip={() => handleFlip(profile._id)}
                            isAlumni={heading === "Alumni"}
                          />
                        ))}
                    </div>
                  {heading === "First Year" && <RecruitmentBanner />}
                  </div>
                }
              />
            </motion.div>
          ))}
        </div>
      </div>
      <div className="h-24 w-full shrink-0" />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="dark bg-pbpages border-pbborder text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-base">
              {editMember ? "Edit Member" : "Add Member"}
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
                Year<span className="text-pbgreen ml-0.5">*</span>
              </Label>
              <Select
                value={form.year}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, year: v as Member["year"] }))
                }
              >
                <SelectTrigger className="w-full bg-pbgray border-pbborder text-white h-8 focus:ring-pbgreen/20 focus:border-pbgreen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark bg-pbgray border-pbborder text-white">
                  <SelectItem value="first">First Year</SelectItem>
                  <SelectItem value="second">Second Year</SelectItem>
                  <SelectItem value="third">Third Year</SelectItem>
                  <SelectItem value="fourth">Fourth Year</SelectItem>
                  <SelectItem value="alumni">Alumni</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-pbtext text-xs">Tags</Label>
              <Select
                value={form.tags ?? "none"}
                onValueChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    tags: v === "none" ? undefined : (v as Member["tags"]),
                  }))
                }
              >
                <SelectTrigger className="w-full bg-pbgray border-pbborder text-white h-8 focus:ring-pbgreen/20 focus:border-pbgreen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark bg-pbgray border-pbborder text-white">
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="lead">Lead (Current Leads)</SelectItem>
                  <SelectItem value="alumni-lead">Alumni Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-pbtext text-xs">Profile Image</Label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              {form.imageUrl ? (
                <div className="relative w-full aspect-square max-w-32 mx-auto rounded-xl overflow-hidden border border-pbborder group">
                  <Image
                    src={form.imageUrl}
                    alt="Preview"
                    fill
                    style={{ objectFit: "cover" }}
                    className="rounded-xl"
                    draggable={false}
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-black transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <XIcon className="h-3.5 w-3.5 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <span className="text-[10px] text-white bg-black/70 px-2 py-0.5 rounded-full">
                      Change
                    </span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex flex-col items-center justify-center gap-2 w-full py-6 rounded-xl border border-dashed border-pbborder hover:border-pbgreen transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UploadCloudIcon className="h-6 w-6 text-pbtext" />
                  <span className="text-pbtext text-xs">
                    {uploading ? "Uploading…" : "Click to upload image"}
                  </span>
                  <span className="text-pbtext/50 text-[10px]">
                    PNG, JPG, WEBP — max 10 MB
                  </span>
                </button>
              )}

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
              disabled={saving || uploading || !form.name || !form.role}
              className="bg-pbgreen text-black hover:bg-pbgreen/90 font-medium flex-1"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="dark bg-pbpages border-pbborder text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-base">
              Delete Member
            </DialogTitle>
          </DialogHeader>

          <p className="text-pbtext text-sm py-2">
            Are you sure you want to delete{" "}
            <span className="text-white font-medium">{deleteTarget?.name}</span>
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
    </div>
  );
}
