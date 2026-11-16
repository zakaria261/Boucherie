"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { freeQuantity } from "@/lib/requests";
import type { FreeItem } from "@/lib/types";
import { emptyItem } from "./list-editor";

type Contact = { contactName: string; phone: string; email: string; vatNumber: string; billingAddress: string };
type CompanyInfo = { name: string; country: string; siret: string; noSiret: boolean; noSiretReason: string; foreignId: string; activity: string };

/** Coordonnées et reprise d'une ancienne demande (à revalider entièrement). */
export function ProSpaceTools({
  token,
  contact,
  company,
  reusable,
}: {
  token: string;
  contact: Contact;
  company: CompanyInfo;
  reusable: { ref: string; at: string; items: FreeItem[]; notes: string }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(contact);
  const [state, setState] = useState<"" | "busy" | "ok">("");
  const [error, setError] = useState("");

  function reuse(items: FreeItem[], notes: string) {
    // Quantités, prix et créneau seront revalidés : la date n'est pas reprise.
    const draft = {
      contactName: form.contactName,
      company: company.name,
      country: company.country,
      siret: company.siret,
      noSiret: company.noSiret,
      noSiretReason: company.noSiretReason,
      foreignId: company.foreignId,
      activity: company.activity,
      phone: form.phone,
      email: form.email,
      billingAddress: form.billingAddress,
      vatNumber: form.vatNumber,
      notes,
      items: items.map((i) => ({
        ...emptyItem(),
        name: i.name,
        quantity: String(i.quantity).replace(".", ","),
        unit: i.unit,
        note: i.note || "",
        cut: i.cut || "",
        portionGrams: i.portionGrams ? String(i.portionGrams) : "",
        packaging: i.packaging || "",
      })),
    };
    try {
      sessionStorage.setItem("faubourg-pro-brouillon", JSON.stringify(draft));
    } catch {}
    router.push("/professionnels/demande?type=devis");
  }

  return (
    <>
      {reusable.length > 0 && (
        <section className="card stack-list">
          <h2>Reprendre une demande</h2>
          <p className="muted small">Les articles sont repris ; quantités, prix et créneau seront à nouveau confirmés par la boucherie.</p>
          <ul className="my-orders">
            {reusable.map((r) => (
              <li key={r.ref}>
                <button type="button" className="my-order-link reuse" onClick={() => reuse(r.items, r.notes)}>
                  <span>
                    <strong>{r.ref}</strong>
                    <small>{r.items.map((i) => `${i.name} (${freeQuantity(i.quantity, i.unit)})`).slice(0, 3).join(", ")}</small>
                  </span>
                  <RotateCcw size={18} aria-label="Reprendre" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <form
        className="card request-form-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setState("busy");
          setError("");
          try {
            const response = await fetch(`/api/pro/espace/${token}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "Enregistrement impossible.");
            setState("ok");
          } catch (err) {
            setError((err as Error).message);
            setState("");
          }
        }}
      >
        <h2>Vos coordonnées</h2>
        <label>
          Contact principal
          <input value={form.contactName} maxLength={120} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
        </label>
        <label>
          Téléphone
          <input type="tel" inputMode="tel" value={form.phone} maxLength={25} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label>
          E-mail professionnel
          <input type="email" value={form.email} maxLength={150} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>
          Adresse de facturation <span className="optional">facultatif</span>
          <input value={form.billingAddress} maxLength={300} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} />
        </label>
        <label>
          TVA intracommunautaire <span className="optional">facultatif</span>
          <input value={form.vatNumber} maxLength={20} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {state === "ok" && <p className="form-success" role="status">Coordonnées enregistrées.</p>}
        <button className="button primary" disabled={state === "busy"}>
          <Save size={17} /> {state === "busy" ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </>
  );
}
