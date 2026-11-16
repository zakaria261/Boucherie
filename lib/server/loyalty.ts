// Programme de fidélité. Désactivé par défaut : aucune règle commerciale n'est
// supposée. Les points ne sont crédités que sur un montant réellement encaissé
// au retrait, une seule fois par commande.
import { randomBytes } from "node:crypto";
import {
  audit,
  getLoyaltyAccount,
  getSettings,
  saveLoyaltyAccount,
  transaction,
} from "./db";
import { HttpError, textField } from "./security";
import type { LoyaltyAccount, LoyaltySettings, LoyaltyTransaction, Order } from "../types";

/** Clé d'un compte : numéro de téléphone normalisé (+33 6… → 06…). */
export function loyaltyKey(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("33") && digits.length === 11) digits = `0${digits.slice(2)}`;
  if (digits.startsWith("0033")) digits = `0${digits.slice(4)}`;
  return digits;
}

const sum = (account: LoyaltyAccount) => account.transactions.reduce((s, t) => s + t.points, 0);

/** Le solde a-t-il expiré faute d'achat pendant la durée configurée ? */
function expired(account: LoyaltyAccount, rules: LoyaltySettings, now = new Date()) {
  if (!rules.validityMonths || !account.lastPurchaseAt) return false;
  const limit = new Date(account.lastPurchaseAt);
  limit.setMonth(limit.getMonth() + rules.validityMonths);
  return limit < now;
}

export function balance(account: LoyaltyAccount, rules: LoyaltySettings, now = new Date()) {
  return expired(account, rules, now) ? 0 : Math.max(0, sum(account));
}

const tx = (t: Omit<LoyaltyTransaction, "id" | "at">): LoyaltyTransaction => ({
  id: randomBytes(6).toString("hex"),
  at: new Date().toISOString(),
  ...t,
});

/** Solde expiré : on l'inscrit dans l'historique avant toute nouvelle opération. */
function settleExpiry(account: LoyaltyAccount, rules: LoyaltySettings) {
  const current = sum(account);
  if (expired(account, rules) && current > 0)
    account.transactions.push(tx({ type: "ajustement", points: -current, reason: "Points expirés (absence d’achat)", by: "système" }));
}

/**
 * Crédite une commande retirée. À appeler dans la transaction du changement de
 * statut. Sans effet si le programme est désactivé, si aucun montant n'a été
 * saisi, ou si cette commande a déjà été créditée.
 */
export async function creditOrder(order: Order, paidAmount: number | undefined, by: string) {
  const { loyalty } = await getSettings();
  if (!loyalty.enabled || !paidAmount || !order.phone) return null;
  const phone = loyaltyKey(order.phone);
  if (phone.length < 9) return null;
  const account: LoyaltyAccount = (await getLoyaltyAccount(phone)) || {
    phone,
    name: order.name,
    transactions: [],
    lastPurchaseAt: "",
  };
  if (account.transactions.some((t) => t.type === "gain" && t.orderId === order.id)) return null;
  const points = Math.floor((paidAmount / 100) * loyalty.pointsPerEuro);
  if (points <= 0) return null;
  settleExpiry(account, loyalty);
  account.transactions.push(
    tx({ type: "gain", points, orderId: order.id, reason: `Commande ${order.id} retirée`, by }),
  );
  account.lastPurchaseAt = new Date().toISOString();
  account.name = order.name || account.name;
  await saveLoyaltyAccount(account);
  await audit(by, "fidelite.gain", "loyalty", phone, { order: order.id, points });
  return points;
}

/** Ajustement manuel motivé, ou utilisation de la récompense. */
export function adjustLoyalty(
  phoneInput: string,
  action: { type: "ajustement"; points: number; reason: string } | { type: "utilisation" },
  by: string,
) {
  return transaction(async () => {
    const { loyalty } = await getSettings();
    if (!loyalty.enabled) throw new HttpError(409, "Le programme de fidélité est désactivé.");
    const phone = loyaltyKey(phoneInput);
    const account = await getLoyaltyAccount(phone);
    if (!account) throw new HttpError(404, "Aucun compte fidélité pour ce numéro.");
    settleExpiry(account, loyalty);
    if (action.type === "utilisation") {
      if (sum(account) < loyalty.threshold)
        throw new HttpError(409, `Solde insuffisant : ${loyalty.threshold} points sont nécessaires.`);
      account.transactions.push(
        tx({ type: "utilisation", points: -loyalty.threshold, reason: loyalty.reward, by }),
      );
    } else {
      if (!Number.isInteger(action.points) || action.points === 0 || Math.abs(action.points) > 100000)
        throw new HttpError(400, "Nombre de points invalide.");
      if (sum(account) + action.points < 0) throw new HttpError(409, "Le solde ne peut pas devenir négatif.");
      account.transactions.push(tx({ type: "ajustement", points: action.points, reason: action.reason, by }));
    }
    await saveLoyaltyAccount(account);
    await audit(by, `fidelite.${action.type}`, "loyalty", phone, action);
    return account;
  });
}

/** Règles saisies par le propriétaire. L'activation exige des règles complètes. */
export function parseLoyaltySettings(body: Record<string, unknown>, current: LoyaltySettings): LoyaltySettings {
  const int = (v: unknown, label: string, min: number, max: number) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `${label} : valeur invalide.`);
    return n;
  };
  const next: LoyaltySettings = {
    enabled: body.enabled === true,
    pointsPerEuro: Math.round(int(body.pointsPerEuro ?? 0, "Points par euro", 0, 100) * 100) / 100,
    threshold: Math.round(int(body.threshold ?? 0, "Seuil", 0, 1_000_000)),
    reward: textField(body.reward ?? "", "Récompense", 200, 0),
    validityMonths: Math.round(int(body.validityMonths ?? 0, "Validité", 0, 120)),
    exclusions: textField(body.exclusions ?? "", "Exclusions", 600, 0),
    approvedAt: current.approvedAt,
  };
  if (next.enabled) {
    if (next.pointsPerEuro <= 0 || next.threshold <= 0 || next.reward.length < 3)
      throw new HttpError(400, "Pour activer le programme, renseignez les points par euro, le seuil et la récompense.");
    if (body.approved !== true)
      throw new HttpError(400, "Confirmez que ces règles sont validées avant de les publier.");
    if (!current.enabled) next.approvedAt = new Date().toISOString();
  }
  return next;
}
