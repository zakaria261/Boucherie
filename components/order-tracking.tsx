"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Printer } from "lucide-react";
export function TrackingActions() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(timer);
  }, [router]);
  return (
    <div className="tracking-actions">
      <button className="button outline" onClick={() => router.refresh()}>
        <RefreshCw size={16} />
        Actualiser le suivi
      </button>
      <button className="button outline" onClick={() => window.print()}>
        <Printer size={16} />
        Imprimer
      </button>
    </div>
  );
}
