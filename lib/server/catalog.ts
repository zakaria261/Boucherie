import { categories, type Product, type Settings } from "../types";
import { HttpError, textField, validImage } from "./security";
import { whatsappNumber } from "../whatsapp";
export function validateProduct(
  body: Record<string, unknown>,
): Omit<Product, "id" | "version"> {
  const name = textField(body.name, "Nom", 120);
  const category = textField(body.category, "Catégorie", 40);
  if (!(categories as readonly string[]).includes(category))
    throw new HttpError(400, "Catégorie invalide.");
  if (
    !Number.isInteger(body.price) ||
    Number(body.price) < 1 ||
    Number(body.price) > 100000
  )
    throw new HttpError(
      400,
      "Le prix doit être compris entre 0,01 € et 1 000 € par kg.",
    );
  for (const flag of ["published", "available", "featured", "grill"])
    if (typeof body[flag] !== "boolean")
      throw new HttpError(400, "État du produit invalide.");
  return {
    name,
    category,
    price: Number(body.price),
    image: validImage(body.image),
    description: textField(body.description, "Description", 3000, 0),
    ingredients: textField(body.ingredients, "Informations produit", 2000, 0),
    badge: textField(body.badge, "Étiquette", 50, 0),
    published: body.published as boolean,
    available: body.available as boolean,
    featured: body.featured as boolean,
    grill: body.grill as boolean,
  };
}
export function validateSettings(
  body: Record<string, unknown>,
): Omit<Settings, "version"> {
  const email = textField(body.email, "E-mail", 150);
  const whatsapp = textField(body.whatsapp || "", "WhatsApp", 35, 0);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new HttpError(400, "E-mail invalide.");
  if (
    whatsapp &&
    (whatsappNumber(whatsapp).length < 8 ||
      whatsappNumber(whatsapp).length > 15)
  )
    throw new HttpError(400, "Numéro WhatsApp invalide.");
  return {
    name: textField(body.name, "Nom de la boutique", 100),
    logo: validImage(body.logo),
    headline: textField(body.headline, "Titre", 200),
    intro: textField(body.intro, "Introduction", 700),
    hero: validImage(body.hero),
    announcement: textField(body.announcement, "Bandeau", 150),
    address: textField(body.address, "Adresse", 250),
    email,
    phone: textField(body.phone, "Téléphone", 35, 0),
    whatsapp,
    hours: textField(body.hours, "Horaires", 1000),
    story: textField(body.story, "Histoire", 6000),
    storyImage: validImage(body.storyImage),
  };
}
