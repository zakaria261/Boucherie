"use client";
import { Printer } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="button outline small" onClick={() => window.print()}>
      <Printer size={16} /> {label}
    </button>
  );
}
