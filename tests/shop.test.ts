import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatStock,
  formatTime,
  linePrice,
  restoreCart,
  stockNeed,
  tomorrow,
} from "../lib/shop.ts";
import { daySlots, hour, pickupDates, pickupError } from "../lib/pickup.ts";
import {
  orderWhatsAppMessage,
  whatsappLink,
  whatsappNumber,
} from "../lib/whatsapp.ts";
import type { PickupSettings } from "../lib/types.ts";

const products = [
  { id: "beef", price: 3499, unit: "kg" as const, weights: [] },
  { id: "chicken", price: 1290, unit: "piece" as const, weights: [] },
];

test("prix au poids arrondis au centime par portion, pièce et 100 g", () => {
  assert.equal(linePrice(3499, 500), 1750);
  assert.equal(linePrice(1099, 250, 3), 825);
  assert.equal(linePrice(1290, 0, 2, "piece"), 2580);
  assert.equal(linePrice(299, 200, 1, "100g"), 598);
  assert.equal(stockNeed("kg", 500, 3), 1500);
  assert.equal(stockNeed("piece", 0, 3), 3);
  assert.equal(formatStock("kg", 1500), "1,5 kg");
  assert.equal(formatStock("piece", 1), "1 pièce");
});

test("le panier refuse les données corrompues et garde les options", () => {
  assert.deepEqual(
    restoreCart(
      [
        { id: "beef", grams: 500, quantity: 2 },
        { id: "beef", grams: 1000, quantity: 1, options: ["Épaisseur : 2 cm"] },
        { id: "chicken", grams: 0, quantity: 1 },
        { id: "chicken", grams: 500, quantity: 1 },
        { id: "unknown", grams: 500, quantity: 1 },
        { id: "beef", grams: -500, quantity: 1 },
        { id: "beef", grams: 500, quantity: 99 },
        null,
      ],
      products,
    ),
    [
      { id: "beef", grams: 500, quantity: 2, options: [] },
      { id: "beef", grams: 1000, quantity: 1, options: ["Épaisseur : 2 cm"] },
      { id: "chicken", grams: 0, quantity: 1, options: [] },
    ],
  );
  assert.deepEqual(restoreCart({}, products), []);
});

test("le retrait suit le fuseau d’Amiens, même autour de minuit", () => {
  assert.equal(tomorrow(new Date("2026-09-29T22:30:00Z")), "2026-10-01");
  assert.equal(tomorrow(new Date("2026-12-31T23:30:00Z")), "2027-01-02");
  assert.equal(formatTime("09:30"), "9h30");
  assert.equal(hour("09:00"), "9h");
});

const pickup: PickupSettings = {
  slotsEnabled: true,
  slotMinutes: 30,
  capacity: 4,
  leadDays: 1,
  sameDay: true,
  sameDayLeadMinutes: 60,
  maxDays: 14,
  week: [
    { day: 0, ranges: [] },
    { day: 1, ranges: [] },
    { day: 2, ranges: [["09:00", "12:00"]] },
    { day: 3, ranges: [["09:00", "12:00"]] },
    { day: 4, ranges: [["09:00", "12:00"]] },
    { day: 5, ranges: [["09:00", "12:00"]] },
    { day: 6, ranges: [["09:00", "12:00"], ["14:00", "15:00"]] },
  ],
  closed: ["2026-11-13"],
  verified: true,
};
// Mardi 10 novembre 2026, 10 h à Paris.
const now = new Date("2026-11-10T09:00:00Z");

test("créneaux : jours fermés, fermetures exceptionnelles et délai du jour même", () => {
  const dates = pickupDates(pickup, false, now);
  assert.equal(dates[0], "2026-11-11");
  assert.ok(!dates.includes("2026-11-10"), "pas de jour même sans produit prêt");
  assert.ok(!dates.includes("2026-11-13"), "fermeture exceptionnelle");
  assert.ok(!dates.includes("2026-11-15") && !dates.includes("2026-11-16"), "dimanche et lundi fermés");
  assert.deepEqual(daySlots(pickup, "2026-11-14", now), [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30",
  ]);
  // Jour même : uniquement après 11 h (10 h + 60 min de préparation).
  assert.deepEqual(daySlots(pickup, "2026-11-10", now), ["11:00", "11:30"]);
  assert.equal(pickupDates(pickup, true, now)[0], "2026-11-10");
  assert.match(pickupError(pickup, "2026-11-10", "11:00", false, now) || "", /jour même/);
  assert.equal(pickupError(pickup, "2026-11-10", "11:00", true, now), null);
  assert.match(pickupError(pickup, "2026-11-10", "09:30", true, now) || "", /créneau/);
  assert.match(pickupError(pickup, "2026-11-13", "09:00", false, now) || "", /date/);
  assert.equal(pickupError({ ...pickup, slotsEnabled: false }, "2026-11-11", "", false, now), null);
});

test("lien WhatsApp et récapitulatif de commande", () => {
  assert.equal(whatsappNumber("06 12 34 56 78"), "33612345678");
  const message = orderWhatsAppMessage({
    id: "FB-TEST",
    name: "Camille",
    date: "2 octobre 2026",
    total: "18,50 €",
    items: ["1 × Saucisse (500 g)"],
  });
  assert.match(message, /FB-TEST/);
  assert.match(message, /Saucisse/);
  assert.equal(
    whatsappLink("+33 6 12 34 56 78", "Bonjour"),
    "https://wa.me/33612345678?text=Bonjour",
  );
  assert.equal(whatsappLink("12", "Bonjour"), null);
});
