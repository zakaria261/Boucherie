import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getCompanyByToken, getOrders, getQuotes } from "@/lib/server/db";
import { publicQuote } from "@/lib/server/quotes";
import { amountLabel } from "@/lib/requests";
import { longDate } from "@/lib/shop";
import { ProSpaceTools } from "@/components/site/pro-space";

export const metadata: Metadata = {
  title: "Mon espace professionnel",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Espace d'un client professionnel, ouvert par son lien privé : seules ses
 * propres demandes, commandes et devis sont listés (filtrés côté serveur).
 */
export default async function EspacePro({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) notFound();
  const company = await getCompanyByToken(token);
  if (!company) notFound();
  const orders = (await getOrders()).filter((o) => o.companyId === company.id);
  const stored = (await getQuotes()).filter((q) => q.companyId === company.id);
  const quotes = stored.map((q) => ({ ...publicQuote(q), token: q.token }));
  const contact = company.contacts[0];
  const reusable = [
    ...orders.map((o) => ({ ref: o.id, at: o.createdAt, items: o.items.filter((i) => i.kind === "libre"), notes: o.notes })),
    ...quotes.filter((q) => q.request).map((q) => ({ ref: q.id, at: q.createdAt, items: q.request!.items, notes: q.request!.instructions })),
  ]
    .filter((r) => r.items.length)
    .sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="page narrow">
      <header className="page-head">
        <span className="eyebrow">Espace professionnels</span>
        <h1>{company.name}</h1>
        <p>Vos demandes, commandes et devis auprès de la boucherie.</p>
      </header>

      <section className="card stack-list">
        <h2>Vos commandes</h2>
        {orders.length ? (
          <ul className="my-orders">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/commande/suivi/${o.token}`} className="my-order-link">
                  <span>
                    <strong>{o.id}</strong>
                    <small>
                      Retrait {longDate(o.date)} · {amountLabel(o.total)}
                    </small>
                  </span>
                  <span className="tag soft">{o.status}</span>
                  <ChevronRight size={18} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Aucune commande pour le moment.</p>
        )}
      </section>

      <section className="card stack-list">
        <h2>Vos devis</h2>
        {quotes.length ? (
          <ul className="my-orders">
            {quotes.map((q) => (
              <li key={q.id}>
                <Link href={`/professionnels/devis/${q.token}`} className="my-order-link">
                  <span>
                    <strong>{q.number ? `Devis ${q.number}` : `Demande de devis ${q.id}`}</strong>
                    <small>{new Date(q.createdAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}</small>
                  </span>
                  <span className="tag soft">{q.status}</span>
                  <ChevronRight size={18} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Aucun devis pour le moment.</p>
        )}
      </section>

      <ProSpaceTools
        token={token}
        contact={{
          contactName: contact?.name || "",
          phone: contact?.phone || "",
          email: contact?.email || "",
          vatNumber: company.vatNumber,
          billingAddress: company.billingAddress,
        }}
        company={{ name: company.name, country: company.country, siret: company.siret, noSiret: !!company.noSiretReason, noSiretReason: company.noSiretReason, foreignId: company.foreignId, activity: company.activity }}
        reusable={reusable.slice(0, 8)}
      />
    </div>
  );
}
