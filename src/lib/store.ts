import { useEffect, useState } from "react";
import type { AppState, Party, Product, InvoiceDoc, DocKind } from "./types";
import { uid } from "./format";

const KEY = "gescom_state_v2";

const seed = (): AppState => ({
  parties: [
    { id: uid(), type: "client", name: "Boutique Teranga", email: "contact@teranga.sn", phone: "+221 77 123 45 67", address: "Av. Bourguiba, Dakar", ninea: "0042315 2A 2", createdAt: new Date().toISOString() },
    { id: uid(), type: "client", name: "Auberge Saly", email: "saly@example.sn", phone: "+221 76 555 11 22", address: "Saly Portudal, Mbour", createdAt: new Date().toISOString() },
    { id: uid(), type: "fournisseur", name: "Grossiste Sandaga", email: "ventes@sandaga.sn", phone: "+221 78 999 00 11", address: "Marché Sandaga, Dakar", createdAt: new Date().toISOString() },
  ],
  products: [
    { id: uid(), sku: "ART-001", name: "Sac de riz parfumé 25kg", costHT: 12000, priceHT: 15500, tvaRate: 18, stock: 40, stockAlert: 10, unit: "sac", createdAt: new Date().toISOString() },
    { id: uid(), sku: "ART-002", name: "Bidon d'huile 20L", costHT: 18000, priceHT: 22000, tvaRate: 18, stock: 15, stockAlert: 8, unit: "bidon", createdAt: new Date().toISOString() },
    { id: uid(), sku: "ART-003", name: "Carton de sucre 50kg", costHT: 24000, priceHT: 29500, tvaRate: 18, stock: 6, stockAlert: 10, unit: "carton", createdAt: new Date().toISOString() },
  ],
  documents: [],
});

const load = (): AppState => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw);
  } catch {
    return seed();
  }
};

let memory: AppState | null = null;
const listeners = new Set<() => void>();

const getState = () => {
  if (!memory) memory = load();
  return memory;
};

const setState = (updater: (s: AppState) => AppState) => {
  memory = updater(getState());
  localStorage.setItem(KEY, JSON.stringify(memory));
  listeners.forEach((l) => l());
};

export const useStore = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return getState();
};

// Parties
export const upsertParty = (p: Omit<Party, "id" | "createdAt"> & { id?: string }) =>
  setState((s) => {
    if (p.id) return { ...s, parties: s.parties.map((x) => (x.id === p.id ? { ...x, ...p } as Party : x)) };
    return { ...s, parties: [{ ...p, id: uid(), createdAt: new Date().toISOString() } as Party, ...s.parties] };
  });

export const deleteParty = (id: string) =>
  setState((s) => ({ ...s, parties: s.parties.filter((p) => p.id !== id) }));

// Products
export const upsertProduct = (p: Omit<Product, "id" | "createdAt"> & { id?: string }) =>
  setState((s) => {
    if (p.id) return { ...s, products: s.products.map((x) => (x.id === p.id ? { ...x, ...p } as Product : x)) };
    return { ...s, products: [{ ...p, id: uid(), createdAt: new Date().toISOString() } as Product, ...s.products] };
  });

export const deleteProduct = (id: string) =>
  setState((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }));

export const adjustStock = (productId: string, delta: number) =>
  setState((s) => ({
    ...s,
    products: s.products.map((p) => (p.id === productId ? { ...p, stock: Math.max(0, p.stock + delta) } : p)),
  }));

// Documents
export const nextDocNumber = (kind: DocKind) => {
  const s = getState();
  const prefix = kind === "devis" ? "DEV" : kind === "facture" ? "FAC" : "ACH";
  const year = new Date().getFullYear();
  const count = s.documents.filter((d) => d.kind === kind && d.number.includes(`${year}`)).length + 1;
  return `${prefix}-${year}-${String(count).padStart(4, "0")}`;
};

const applyStockMovement = (doc: InvoiceDoc, previous?: InvoiceDoc) => {
  // Annule l'effet du précédent (si payée/envoyée comptait)
  const wasCounted = previous && previous.status !== "annulee" && previous.status !== "brouillon";
  const isCounted = doc.status !== "annulee" && doc.status !== "brouillon";

  if (previous && wasCounted) {
    previous.lines.forEach((l) => {
      if (!l.productId) return;
      const sign = previous.kind === "achat" ? -1 : +1; // on annule : achat retirait, vente ajoutait
      adjustStock(l.productId, sign * l.quantity);
    });
  }
  if (isCounted) {
    doc.lines.forEach((l) => {
      if (!l.productId) return;
      const sign = doc.kind === "achat" ? +1 : -1;
      adjustStock(l.productId, sign * l.quantity);
    });
  }
};

export const upsertDocument = (d: Omit<InvoiceDoc, "id" | "createdAt"> & { id?: string }) => {
  const previous = d.id ? getState().documents.find((x) => x.id === d.id) : undefined;
  let saved!: InvoiceDoc;
  setState((s) => {
    if (d.id) {
      saved = { ...(previous as InvoiceDoc), ...d } as InvoiceDoc;
      return { ...s, documents: s.documents.map((x) => (x.id === d.id ? saved : x)) };
    }
    saved = { ...d, id: uid(), createdAt: new Date().toISOString() } as InvoiceDoc;
    return { ...s, documents: [saved, ...s.documents] };
  });
  applyStockMovement(saved, previous);
};

export const deleteDocument = (id: string) => {
  const previous = getState().documents.find((d) => d.id === id);
  setState((s) => ({ ...s, documents: s.documents.filter((d) => d.id !== id) }));
  if (previous && previous.status !== "annulee" && previous.status !== "brouillon") {
    previous.lines.forEach((l) => {
      if (!l.productId) return;
      const sign = previous.kind === "achat" ? -1 : +1;
      adjustStock(l.productId, sign * l.quantity);
    });
  }
};

export const setDocStatus = (id: string, status: InvoiceDoc["status"]) => {
  const previous = getState().documents.find((d) => d.id === id);
  if (!previous) return;
  const updated = { ...previous, status };
  setState((s) => ({ ...s, documents: s.documents.map((d) => (d.id === id ? updated : d)) }));
  applyStockMovement(updated, previous);
};
