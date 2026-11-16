import { test } from "node:test";
import assert from "node:assert/strict";
import {
  amountLabel,
  effectiveQuoteStatus,
  freeQuantity,
  indicativeWeight,
  itemLabel,
  lineHT,
  orderTotal,
  parseFreeItems,
  quoteTotals,
  validPhone,
  validSiret,
  validVat,
} from "../lib/requests.ts";
import type { OrderItem } from "../lib/types.ts";

test("devis : montants exacts en centimes, TVA par taux, quantités décimales", () => {
  assert.equal(lineHT({ quantity: 2.5, unitPrice: 1999 }), 4998); // 49,975 → 49,98
  assert.equal(lineHT({ quantity: 12, unitPrice: 2450 }), 29400);
  const totals = quoteTotals([
    { designation: "Gigot", quantity: 12, unit: "pièce", unitPrice: 2450, vatRate: 550 },
    { designation: "Livraison de glace", quantity: 1, unit: "", unitPrice: 1000, vatRate: 2000 },
  ]);
  assert.equal(totals.ht, 30400);
  assert.deepEqual(totals.vat, [
    { rate: 550, base: 29400, amount: 1617 },
    { rate: 2000, base: 1000, amount: 200 },
  ]);
  assert.equal(totals.ttc, 32217);
  // 0,1 + 0,2 : pas d'erreur de flottant.
  assert.equal(lineHT({ quantity: 0.3, unitPrice: 1000 }), 300);
});

test("poids indicatif : quantité totale × poids par pièce, jamais confondus", () => {
  assert.equal(indicativeWeight({ quantity: 40, unit: "piece", portionGrams: 150 }), 6000);
  assert.equal(indicativeWeight({ quantity: 40, unit: "piece", portionGrams: null }), null);
  assert.equal(indicativeWeight({ quantity: 2, unit: "kg", portionGrams: 150 }), 2000);
  assert.equal(freeQuantity(6, "piece"), "6 pièces");
  assert.equal(freeQuantity(1.5, "kg"), "1,5 kg");
});

test("articles libres : refus des lignes vides, quantités nulles ou négatives, unités absentes", () => {
  assert.equal(parseFreeItems([]).error, "Ajoutez au moins un article.");
  const result = parseFreeItems([
    { name: "", quantity: "1", unit: "kg" },
    { name: "Bœuf", quantity: "0", unit: "kg" },
    { name: "Bœuf", quantity: "-1", unit: "g" },
    { name: "Bœuf", quantity: "1", unit: "" },
    { name: "Saucisses", quantity: "1,5", unit: "piece" },
    { name: "Viande hachée", quantity: "500", unit: "g", note: "  Hachée deux fois " },
  ]);
  assert.deepEqual(Object.keys(result.errors), ["0", "1", "2", "3", "4"]);
  assert.deepEqual(result.items, [
    { kind: "libre", name: "Viande hachée", quantity: 500, unit: "g", note: "Hachée deux fois", price: null, total: null },
  ]);
  const pro = parseFreeItems([{ name: "Steak", quantity: "40", unit: "piece", portionGrams: "150", packaging: "Par 10" }], true);
  assert.equal(pro.items[0].portionGrams, 150);
  assert.equal(pro.items[0].packaging, "Par 10");
});

test("aucun prix n'est inventé : total « à confirmer » tant qu'une ligne n'a pas de prix", () => {
  const items: OrderItem[] = [
    { id: "a", name: "Côte", unit: "kg", grams: 500, quantity: 1, price: 3499, total: 1750, options: [] },
    { kind: "libre", name: "Rôti", quantity: 1, unit: "kg", note: "", price: null, total: null },
  ];
  assert.equal(orderTotal(items), null);
  assert.equal(amountLabel(orderTotal(items)), "À confirmer");
  items[1].finalPrice = 2390;
  assert.equal(orderTotal(items), 4140);
  assert.equal(itemLabel(items[1]), "Rôti — 1 kg");
});

test("formats SIRET, TVA et téléphone (contrôle de format uniquement)", () => {
  assert.equal(validSiret("732 829 320 00074"), true);
  assert.equal(validSiret("73282932000075"), false);
  assert.equal(validSiret("1234"), false);
  assert.equal(validVat("FR 40 303 265 045"), true);
  assert.equal(validVat("12345"), false);
  assert.equal(validPhone("06 12 34 56 78"), true);
  assert.equal(validPhone("+32 470 12 34 56"), true);
  assert.equal(validPhone("12"), false);
});

test("devis expiré : établi ou envoyé au-delà de sa validité", () => {
  assert.equal(effectiveQuoteStatus({ status: "Envoyé", validUntil: "2026-01-10" }, "2026-01-11"), "Expiré");
  assert.equal(effectiveQuoteStatus({ status: "Envoyé", validUntil: "2026-01-11" }, "2026-01-11"), "Envoyé");
  assert.equal(effectiveQuoteStatus({ status: "Accepté", validUntil: "2026-01-01" }, "2026-01-11"), "Accepté");
});
