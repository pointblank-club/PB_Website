"use client";

import { useState, useRef } from "react";
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
import { Progress } from "@/components/ui/progress";
import { PlusIcon, Trash2Icon, UploadCloudIcon, XIcon } from "lucide-react";
import LoreCard from "@/components/lore/LoreCard";
import LoreType from "@/types/lore/loreType";
import { serializeId } from "@/lib/utils";

type LoreForm = {
  title: string;
  date: string;
  location: string;
  preview: string;
  story: string[];
  images: string[];
};

const blankForm: LoreForm = {
  title: "",
  date: "",
  location: "",
  preview: "",
  story: [""],
  images: [],
};

const TEXT_FIELDS: {
  label: string;
  key: keyof LoreForm;
  type: string;
  required?: boolean;
}[] = [
  { label: "Title", key: "title", type: "text", required: true },
  { label: "Location", key: "location", type: "text", required: true },
  { label: "Date", key: "date", type: "date", required: true },
  { label: "Preview", key: "preview", type: "text", required: true },
];

export default function Lore(props: { lores: LoreType[] }) {
  const [lores, setLores] = useState<LoreType[]>(props.lores);
  const [hoveredLoreId, setHoveredLoreId] = useState<string | null>(null);
  const { authenticated, token } = useAuthStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editLore, setEditLore] = useState<LoreType | null>(null);
  const [form, setForm] = useState<LoreForm>(blankForm);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<LoreType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openAdd = () => {
    setEditLore(null);
    setForm(blankForm);
    setUploadError(null);
    setModalOpen(true);
  };

  const openEdit = (lore: LoreType) => {
    setEditLore(lore);
    setForm({
      title: lore.title,
      date: lore.date ? new Date(lore.date).toISOString().slice(0, 10) : "",
      location: lore.location,
      preview: lore.preview,
      story: lore.story.length > 0 ? lore.story : [""],
      images: lore.images,
    });
    setUploadError(null);
    setModalOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("module", "lore");
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

  const updateStory = (index: number, value: string) => {
    setForm((prev) => {
      const story = [...prev.story];
      story[index] = value;
      return { ...prev, story };
    });
  };

  const addStoryParagraph = () => {
    setForm((prev) => ({ ...prev, story: [...prev.story, ""] }));
  };

  const removeStoryParagraph = (index: number) => {
    setForm((prev) => ({
      ...prev,
      story: prev.story.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...form,
      story: form.story.filter((s) => s.trim() !== ""),
    };

    try {
      if (editLore) {
        const res = await fetch("/api/lore", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...payload, _id: editLore._id }),
        });
        const data = await res.json();
        if (data.success) {
          setLores((prev) =>
            prev.map((l) =>
              l._id === editLore._id
                ? (serializeId(data.lore) as unknown as LoreType)
                : l,
            ),
          );
          setModalOpen(false);
        }
      } else {
        const res = await fetch("/api/lore", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setLores((prev) => [
            serializeId(data.lore) as unknown as LoreType,
            ...prev,
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
      const res = await fetch(`/api/lore?id=${deleteTarget._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLores((prev) => prev.filter((l) => l._id !== deleteTarget._id));
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const filledStory = form.story.filter((s) => s.trim() !== "");
  const isSaveDisabled =
    saving ||
    uploading ||
    !form.title ||
    !form.location ||
    !form.date ||
    !form.preview ||
    filledStory.length === 0 ||
    form.images.length === 0;

  return (
    <>
      {/* Header */}
      <div className="flex justify-center items-end pb-10 w-full h-55 p-5 text-5xl md:text-6xl text-white">
        <motion.span
          initial={{ opacity: 0, y: 6, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          Our Lore
        </motion.span>
      </div>

      <div className="flex px-5 justify-center w-full mb-10 md:mb-16 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="text-pbtext font-light text-xl md:text-2xl lg:text-3xl max-w-300"
        >
          Every line of code tells a story, but our greatest tales are written
          in the adventures we share. Here are the chronicles of our coding
          club&apos;s journeys, where friendship and innovation intertwine.
        </motion.p>
      </div>

      {authenticated && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="w-full flex justify-center mb-8"
        >
          <button
            onClick={openAdd}
            className="px-8 py-3 bg-pbgreen text-black font-medium rounded-full hover:opacity-90 transition-opacity text-base cursor-pointer"
          >
            + Add Lore
          </button>
        </motion.div>
      )}

      {/* Lore list */}
      <div>
        {lores.length === 0 && (
          <p className="text-pbtext text-lg text-center mt-8 mb-16">
            No lore found.
          </p>
        )}

        {lores.map((lore, index) => (
          <motion.div
            key={lore._id}
            initial={index == 0 ? { opacity: 0, y: 50 } : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={index == 0?{ duration: 0.6, delay: 0.6, ease: [0.22, 1, 0.36, 1]}:{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <LoreCard
              {...lore}
              isPlaying={hoveredLoreId === lore._id}
              onHover={() => setHoveredLoreId(lore._id)}
              onLeave={() =>
                setHoveredLoreId((curr) => (curr === lore._id ? null : curr))
              }
              onEdit={authenticated ? () => openEdit(lore) : undefined}
              onDelete={authenticated ? () => setDeleteTarget(lore) : undefined}
            />
          </motion.div>
        ))}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="dark bg-pbpages border-pbborder text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-base">
              {editLore ? "Edit Lore" : "Add Lore"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* Simple text fields */}
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

            {/* Story paragraphs */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-pbtext text-xs">
                Story<span className="text-pbgreen ml-0.5">*</span>
              </Label>

              {form.story.map((paragraph, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={paragraph}
                    placeholder={`Paragraph ${idx + 1}`}
                    onChange={(e) => updateStory(idx, e.target.value)}
                    className="bg-pbgray border-pbborder text-white placeholder:text-pbtext/50 focus-visible:border-pbgreen focus-visible:ring-pbgreen/20 h-8 flex-1"
                  />
                  {form.story.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStoryParagraph(idx)}
                      className="p-1 rounded-full hover:bg-red-500/20 text-red-400 transition-colors"
                    >
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addStoryParagraph}
                className="flex items-center gap-1.5 text-pbgreen text-xs hover:opacity-80 transition-opacity mt-1 self-start"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add paragraph
              </button>
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
              Delete Lore
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
    </>
  );
}
