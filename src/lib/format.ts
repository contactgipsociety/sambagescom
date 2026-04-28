export const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);

export const dateFr = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

import type { InvoiceDoc, InvoiceLine } from "./types";

export const lineHT = (l: InvoiceLine) => l.quantity * l.unitPriceHT;
export const lineTVA = (l: InvoiceLine) => lineHT(l) * (l.tvaRate / 100);
export const lineTTC = (l: InvoiceLine) => lineHT(l) + lineTVA(l);

export const docTotals = (doc: InvoiceDoc) => {
  const ht = doc.lines.reduce((s, l) => s + lineHT(l), 0);
  const tva = doc.lines.reduce((s, l) => s + lineTVA(l), 0);
  return { ht, tva, ttc: ht + tva };
};
