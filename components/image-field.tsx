"use client";
import { useRef, useState } from "react";
import { ImagePlus, Upload } from "lucide-react";
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
  const input = useRef<HTMLInputElement>(null);
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    if (file.size > 8 * 1024 * 1024) {
      setError("La photo doit faire moins de 8 Mo.");
      return;
    }
    setBusy(true);
    onBusy?.(true);
    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onChange(result.image);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      onBusy?.(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className="image-field">
      <span className="field-label">{label}</span>
      <div
        className={`image-upload ${value ? "has-image" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) void upload(e.dataTransfer.files[0]);
        }}
      >
        {value ? (
          <img src={value} alt={label} />
        ) : (
          <div>
            <ImagePlus size={34} />
            <p>Donnez-leur envie de goûter.</p>
          </div>
        )}
        <button
          type="button"
          className="button outline"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <Upload size={16} />
          {busy
            ? "Import en cours…"
            : value
              ? "Changer la photo"
              : "Choisir une photo"}
        </button>
      </div>
      <input
        className="sr-only"
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        aria-label={label}
        onChange={(e) => void upload(e.target.files?.[0])}
      />
      <small>
        Glissez une photo ici ou choisissez un fichier. JPG, PNG, WebP ou AVIF ·
        8 Mo max.
      </small>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
