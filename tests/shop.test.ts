import { test } from "node:test";
import assert from "node:assert/strict";
import { linePrice, restoreCart, tomorrow } from "../lib/shop.ts";
import {
  orderWhatsAppMessage,
  whatsappLink,
  whatsappNumber,
} from "../lib/whatsapp.ts";
const products = [
  {
    id: "beef",
    name: "Bœuf",
    price: 3499,
    category: "Bœuf",
    image: "",
    grill: false,
  },
];
test("rounds weighed prices to cents before multiplying portions", () => {
  assert.equal(linePrice(3499, 500), 1750);
  assert.equal(linePrice(1099, 250, 3), 825);
});
test("rejects corrupted cart data and unknown products", () => {
  assert.deepEqual(
    restoreCart(
      [
        { id: "beef", grams: 500, quantity: 2 },
        { id: "unknown", grams: 500, quantity: 1 },
        { id: "beef", grams: -500, quantity: 1 },
        { id: "beef", grams: 500, quantity: 99 },
        null,
      ],
      products,
    ),
    [{ id: "beef", grams: 500, quantity: 2 }],
  );
  assert.deepEqual(restoreCart({}, products), []);
});
test("pickup uses the shop timezone near midnight and across year boundaries", () => {
  assert.equal(tomorrow(new Date("2026-09-29T22:30:00Z")), "2026-10-01");
  assert.equal(tomorrow(new Date("2026-12-31T23:30:00Z")), "2027-01-02");
});
test("builds a usable WhatsApp link and an order summary", () => {
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
