import { useEffect, useState, useCallback } from "react";
import type { AppState, Party, Product, InvoiceDoc } from "./types";
import { uid } from "./format";

const KEY = "gescom_state_v1";

const seed = (): AppState => ({
  parties: [
    { id: uid(), type: "client", name: "Atelier Dupont", email: "contact@dupont.fr", phone: "01 23 45 67 89", address: "12 rue de Lyon, Paris", siret: "812 345 678 00012", createdAt: new Date().toISOString() },
    { id: uid(), type: "client", name: "SARL Martin & Co", email: "hello@martin.co", phone: "02 11 22 33 44", address: "5 av. Foch, Nantes", createdAt: new Date().toISOString() },
    { id: uid(), type: "fournisseur", name: "Distri Pro", email: "sales@distripro.com", phone: "03 88 99 00 11", address: "ZI Nord, Strasbourg", createdAt: new Date().toISOString() },
  ],
  products: [
    { id: uid(), sku: "PRD-001", name: "Prestation de conseil", priceHT: 650, tvaRate: 20, stock: 999, stockAlert: 0, unit: "jour", createdAt: new Date().toISOString() },
    { id: uid(), sku: "PRD-002", name: "Licence logicielle annuelle", priceHT: 1200, tvaRate: 20, stock: 50, stockAlert: 10, unit: "u", createdAt: new Date().toISOString() },
    { id: uid(), sku: "PRD-003", name: "Module formation", priceHT: 350, tvaRate: 20, stock: 8, stockAlert: 10, unit: "u", createdAt: new Date().toISOString() },
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

// Documents
export const nextDocNumber = (kind: "devis" | "facture") => {
  const s = getState();
  const prefix = kind === "devis" ? "DEV" : "FAC";
  const year = new Date().getFullYear();
  const count = s.documents.filter((d) => d.kind === kind && d.number.includes(`${year}`)).length + 1;
  return `${prefix}-${year}-${String(count).padStart(4, "0")}`;
};

export const upsertDocument = (d: Omit<InvoiceDoc, "id" | "createdAt"> & { id?: string }) =>
  setState((s) => {
    if (d.id) return { ...s, documents: s.documents.map((x) => (x.id === d.id ? { ...x, ...d } as InvoiceDoc : x)) };
    return { ...s, documents: [{ ...d, id: uid(), createdAt: new Date().toISOString() } as InvoiceDoc, ...s.documents] };
  });

export const deleteDocument = (id: string) =>
  setState((s) => ({ ...s, documents: s.documents.filter((d) => d.id !== id) }));

export const setDocStatus = (id: string, status: InvoiceDoc["status"]) =>
  setState((s) => ({ ...s, documents: s.documents.map((d) => (d.id === id ? { ...d, status } : d)) }));

export const useStoreActions = () => useCallback(() => ({}), []);
