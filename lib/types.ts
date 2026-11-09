export type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  grill: boolean;
  description: string;
  ingredients: string;
  badge: string;
  published: boolean;
  available: boolean;
  featured: boolean;
  version: number;
};
export type Settings = {
  name: string;
  logo: string;
  headline: string;
  intro: string;
  hero: string;
  announcement: string;
  address: string;
  email: string;
  phone: string;
  whatsapp: string;
  hours: string;
  story: string;
  storyImage: string;
  version: number;
};
export const categories = ["Bœuf", "Volailles", "Veau", "Agneau"] as const;
export const statuses = [
  "Nouvelle",
  "Confirmée",
  "En préparation",
  "Prête",
  "Retirée",
  "Annulée",
] as const;
export type OrderStatus = (typeof statuses)[number];
export type OrderItem = {
  id: string;
  name: string;
  grams: number;
  quantity: number;
  price: number;
  total: number;
};
export type Order = {
  id: string;
  token: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  name: string;
  email: string;
  phone: string;
  whatsappOptIn: boolean;
  date: string;
  notes: string;
  items: OrderItem[];
  total: number;
  whatsappNotifications?: {
    owner: "sent" | "not-configured" | "failed";
    customer: "sent" | "not-configured" | "not-requested" | "failed";
    status?: "sent" | "not-configured" | "not-requested" | "failed";
  };
};
