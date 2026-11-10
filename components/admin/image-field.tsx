"use client";
import { useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";

/**
 * Réduit la photo dans le navigateur avant l'envoi (photos d'iPhone de 12 à
 * 48 Mpx, format HEIC décodé par Safari). Le serveur l'optimise ensuite.
 */
async function shrink(file: File): Promise<Blob> {
  try {
    if (file.size < 1_500_000 && file.type !== "image/heic") return file;
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.88),
    );
    return blob || file;
  } catch {
    return file;
  }
}

export function ImageField({
  value,
  onChange,
  label = "Photo du produit",
  onBusy,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  onBusy?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);

  async function upload(file?: File) {
    if (!file) return;
    setError("");
    setBusy(true);
    onBusy?.(true);
    try {
      const body = await shrink(file);
      if (body.size > 8 * 1024 * 1024) throw new Error("La photo doit faire moins de 8 Mo.");
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": body.type || "application/octet-stream" },
        body,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Envoi impossible.");
      onChange(result.image);
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Pas de connexion. Réessayez."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
      onBusy?.(false);
      if (gallery.current) gallery.current.value = "";
      if (camera.current) camera.current.value = "";
    }
  }

  return (
    <div className="image-field">
      <div
        className={`image-preview ${value ? "" : "empty"}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) void upload(e.dataTransfer.files[0]);
        }}
      >
        {value ? <img src={value} alt={label} /> : <ImagePlus size={34} />}
        {busy && <span className="image-busy">Envoi…</span>}
      </div>
      <div className="image-buttons">
        <button type="button" className="btn tinted" disabled={busy} onClick={() => camera.current?.click()}>
          <Camera size={18} /> Prendre une photo
        </button>
        <button type="button" className="btn tinted" disabled={busy} onClick={() => gallery.current?.click()}>
          <ImagePlus size={18} /> {value ? "Changer la photo" : "Choisir une photo"}
        </button>
      </div>
      <input
        className="sr-only"
        ref={gallery}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
        aria-label={label}
        tabIndex={-1}
        onChange={(e) => void upload(e.target.files?.[0])}
      />
      <input
        className="sr-only"
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label={`${label} avec l’appareil photo`}
        tabIndex={-1}
        onChange={(e) => void upload(e.target.files?.[0])}
      />
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
