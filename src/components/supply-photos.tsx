"use client";

import { Camera, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { removeOfficePhoto, setOfficeSupplyNote, uploadOfficePhoto } from "@/app/actions/admin";
import { useI18n } from "@/lib/i18n/client";

const MAX_SIDE = 1200;

async function resize(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.82));
}

export function SupplyPhotos({
  officeSupplyId,
  note,
  photos,
}: {
  officeSupplyId: string;
  note: string | null;
  photos: { id: string }[];
}) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = [...files];
    startTransition(async () => {
      for (const file of list) {
        const blob = await resize(file);
        const data = new FormData();
        data.set("office_supply_id", officeSupplyId);
        data.set("photo", new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" }));
        const res = await uploadOfficePhoto(data).catch(() => ({ error: t("photos.failed") }));
        if (res.error) {
          setError(res.error);
          break;
        }
      }
      if (input.current) input.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        name="note"
        rows={2}
        defaultValue={note ?? ""}
        placeholder={t("photos.notePlaceholder")}
        aria-label={t("photos.note")}
        onBlur={(e) => {
          const next = e.target.value;
          if (next.trim() === (note ?? "").trim()) return;
          startTransition(() => setOfficeSupplyNote(officeSupplyId, next));
        }}
        className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-4 gap-2">
        {photos.map((p) => (
          <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-canvas">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/photos/${p.id}`} alt={t("photos.altSupply")} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => startTransition(() => removeOfficePhoto(p.id))}
              className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/55 text-white"
              aria-label={t("photos.remove")}
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={pending}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-xs text-muted"
        >
          <Camera className="size-5" />
          {pending ? t("photos.uploading") : t("photos.add")}
        </button>
      </div>
      <input ref={input} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      {error && <p className="text-sm text-danger-700">{error}</p>}
    </div>
  );
}
