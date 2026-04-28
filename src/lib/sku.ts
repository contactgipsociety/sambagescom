import type { Product } from "./types";

const slug = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 4) || "ART";

/** Génère un SKU unique au format CAT-NOM-#### à partir des produits existants. */
export const generateSku = (products: Product[], name: string, category?: string) => {
  const base = `${slug(category || "GEN")}-${slug(name)}`;
  const used = new Set(products.map((p) => p.sku));
  let i = 1;
  let candidate = `${base}-${String(i).padStart(4, "0")}`;
  while (used.has(candidate)) {
    i += 1;
    candidate = `${base}-${String(i).padStart(4, "0")}`;
  }
  return candidate;
};
