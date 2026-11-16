// Lecture et validation des demandes publiques : liste de courses et
// demandes professionnelles (devis ou commande). Toute décision est prise ici,
// côté serveur ; la validation du navigateur ne sert qu'à guider la saisie.
import { randomBytes } from "node:crypto";
import { HttpError, textField } from "./security";
import { getCompanies, saveCompany } from "./db";
import {
  parseFreeItems,
  validEmail,
  validPhone,
  validSiret,
  validVat,
} from "../requests";
import { parisNow } from "../shop";
import {
  proActivities,
  recurrences,
  type Company,
  type FreeItem,
  type ProActivity,
  type ProDetails,
  type Recurrence,
} from "../types";

function requestKey(value: unknown) {
  const key = textField(value, "Identifiant", 50);
  if (!/^[a-f0-9-]{36}$/.test(key)) throw new HttpError(400, "Identifiant invalide.");
  return key;
}

function items(raw: unknown, pro: boolean): FreeItem[] {
  const result = parseFreeItems(raw, pro);
  if (result.error) throw new HttpError(400, result.error);
  const [index, message] = Object.entries(result.errors)[0] || [];
  if (message) throw new HttpError(400, `Article ${Number(index) + 1} : ${message}`);
  return result.items;
}

function phone(value: unknown) {
  const text = textField(value, "Téléphone", 25, 8);
  if (!validPhone(text)) throw new HttpError(400, "Vérifiez le numéro de téléphone.");
  return text;
}
function email(value: unknown, required: boolean) {
  const text = textField(value ?? "", "E-mail", 150, required ? 3 : 0);
  if (text && !validEmail(text)) throw new HttpError(400, "Vérifiez l’adresse e-mail.");
  return text;
}
const isoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export type ListeRequest = {
  key: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  notes: string;
  items: FreeItem[];
};

export function parseListeRequest(body: Record<string, unknown>): ListeRequest {
  return {
    key: requestKey(body.requestKey),
    firstName: textField(body.firstName, "Prénom", 60),
    lastName: textField(body.lastName, "Nom", 60),
    phone: phone(body.phone),
    email: email(body.email, false),
    date: textField(body.date, "Date de récupération", 10),
    time: textField(body.time ?? "", "Heure de récupération", 5, 0),
    notes: textField(body.notes ?? "", "Instructions", 1500, 0),
    items: items(body.items, false),
  };
}

export type ProRequest = {
  key: string;
  details: ProDetails;
  date: string;
  time: string;
  notes: string;
  items: FreeItem[];
};

export function parseProRequest(body: Record<string, unknown>): ProRequest {
  const requestType = body.requestType;
  if (requestType !== "devis" && requestType !== "commande")
    throw new HttpError(400, "Type de demande invalide.");
  const country = textField(body.country ?? "France", "Pays", 60);
  const french = country.toLowerCase() === "france";
  const noSiret = body.noSiret === true;
  const siret = french && !noSiret ? textField(body.siret, "SIRET", 20).replace(/\s/g, "") : "";
  if (french && !noSiret && !validSiret(siret))
    throw new HttpError(400, "Le SIRET doit comporter 14 chiffres valides.");
  const noSiretReason = noSiret
    ? textField(body.noSiretReason, "Précision sur l’absence de SIRET", 300, 3)
    : "";
  const activity = body.activity as ProActivity;
  if (!proActivities.includes(activity)) throw new HttpError(400, "Type d’activité invalide.");
  const vatNumber = textField(body.vatNumber ?? "", "TVA intracommunautaire", 20, 0)
    .replace(/[\s.-]/g, "")
    .toUpperCase();
  if (vatNumber && !validVat(vatNumber))
    throw new HttpError(400, "Le numéro de TVA intracommunautaire n’a pas un format valide.");
  const recurrence = (body.recurrence ?? "ponctuel") as Recurrence;
  if (!(recurrence in recurrences)) throw new HttpError(400, "Fréquence invalide.");
  const slotMode = body.slotMode === "flexible" ? "flexible" : "impératif";
  const contactPreference = ["téléphone", "e-mail", "indifférent"].includes(
    body.contactPreference as string,
  )
    ? (body.contactPreference as ProDetails["contactPreference"])
    : "indifférent";
  let covers: number | null = null;
  if (body.covers !== undefined && body.covers !== null && body.covers !== "") {
    covers = Number(body.covers);
    if (!Number.isInteger(covers) || covers < 1 || covers > 100000)
      throw new HttpError(400, "Nombre de couverts invalide.");
  }
  const eventDate = textField(body.eventDate ?? "", "Date de l’événement", 10, 0);
  if (eventDate && !isoDate(eventDate)) throw new HttpError(400, "Date de l’événement invalide.");

  const date = textField(body.date ?? "", "Date de retrait", 10, requestType === "commande" ? 10 : 0);
  const time = textField(body.time ?? "", "Heure de retrait", 5, 0);
  // Devis : la date souhaitée est indicative, mais jamais dans le passé.
  if (requestType === "devis" && date && (!isoDate(date) || date < parisNow().date))
    throw new HttpError(400, "La date de retrait souhaitée ne peut pas être passée.");

  const details: ProDetails = {
    requestType,
    contactName: textField(body.contactName, "Prénom et nom du contact", 120, 3),
    company: textField(body.company, "Entreprise ou structure", 160, 2),
    country,
    siret,
    foreignId: french ? "" : textField(body.foreignId ?? "", "Identifiant de l’entreprise", 40, 0),
    noSiret: french && noSiret,
    noSiretReason,
    activity,
    activityOther: activity === "Autre" ? textField(body.activityOther ?? "", "Activité", 80, 0) : "",
    phone: phone(body.phone),
    email: email(body.email, true),
    billingAddress: textField(body.billingAddress ?? "", "Adresse de facturation", 300, 0),
    vatNumber,
    poReference: textField(body.poReference ?? "", "Référence interne", 60, 0),
    slotMode,
    pickupContact: textField(body.pickupContact ?? "", "Contact de retrait", 120, 0),
    eventDate,
    covers,
    recurrence,
    recurrenceDetail: textField(body.recurrenceDetail ?? "", "Fréquence", 200, 0),
    contactPreference,
  };
  return {
    key: requestKey(body.requestKey),
    details,
    date,
    time,
    notes: textField(body.notes ?? "", "Consignes de préparation", 3000, 0),
    items: items(body.items, true),
  };
}

/**
 * Rattache la demande à la fiche de l'entreprise : même SIRET, sinon même
 * e-mail de contact. Une nouvelle fiche est créée « À vérifier ».
 * À appeler dans une transaction.
 */
export async function upsertCompany(details: ProDetails): Promise<Company> {
  const companies = await getCompanies();
  const email = details.email.toLowerCase();
  const found =
    (details.siret && companies.find((c) => c.siret === details.siret)) ||
    companies.find((c) => c.contacts.some((k) => k.email.toLowerCase() === email));
  const now = new Date().toISOString();
  const contact = { name: details.contactName, phone: details.phone, email: details.email };
  if (found) {
    const next: Company = {
      ...found,
      contacts: found.contacts.some((k) => k.email.toLowerCase() === email)
        ? found.contacts
        : [...found.contacts, contact],
      vatNumber: found.vatNumber || details.vatNumber,
      billingAddress: found.billingAddress || details.billingAddress,
      updatedAt: now,
    };
    await saveCompany(next);
    return next;
  }
  const company: Company = {
    id: `CP-${randomBytes(4).toString("hex").toUpperCase()}`,
    name: details.company,
    country: details.country,
    siret: details.siret,
    foreignId: details.foreignId,
    noSiretReason: details.noSiretReason,
    activity: details.activity,
    vatNumber: details.vatNumber,
    billingAddress: details.billingAddress,
    contacts: [contact],
    status: "À vérifier",
    conditions: "",
    internalNotes: [],
    accessToken: randomBytes(24).toString("hex"),
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  await saveCompany(company);
  return company;
}
