import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppState, Party, Product, InvoiceDoc, DocKind, InvoiceStatus, AccountingEntry } from "./types";

// ========= Mappers DB <-> App =========
const mapPartyRow = (r: any): Party => ({
  id: r.id,
  type: r.type,
  name: r.name,
  email: r.email ?? undefined,
  phone: r.phone ?? undefined,
  address: r.address ?? undefined,
  ninea: r.ninea ?? undefined,
  notes: r.notes ?? undefined,
  createdAt: r.created_at,
});

const mapProductRow = (r: any): Product => ({
  id: r.id,
  sku: r.sku,
  name: r.name,
  description: r.description ?? undefined,
  category: r.category ?? undefined,
  imageUrl: r.image_url ?? undefined,
  costHT: Number(r.cost_ht),
  priceHT: Number(r.price_ht),
  tvaRate: Number(r.tva_rate),
  stock: Number(r.stock),
  stockAlert: Number(r.stock_alert),
  unit: r.unit,
  createdAt: r.created_at,
});

const mapDocRow = (r: any): InvoiceDoc => ({
  id: r.id,
  kind: r.kind,
  number: r.number,
  partyId: r.party_id ?? "",
  date: r.date,
  dueDate: r.due_date ?? undefined,
  lines: Array.isArray(r.lines) ? r.lines : [],
  status: r.status,
  notes: r.notes ?? undefined,
  createdAt: r.created_at,
});

// ========= State global en mémoire =========
let memory: AppState = { parties: [], products: [], documents: [], entries: [] };
let loaded = false;
let loading = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const fetchAll = async () => {
  if (loading) return;
  loading = true;
  try {
    const [p, prod, doc, ent] = await Promise.all([
      supabase.from("parties").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("documents").select("*").order("created_at", { ascending: false }),
      supabase.from("accounting_entries").select("*").order("date", { ascending: false }),
    ]);
    memory = {
      parties: (p.data ?? []).map(mapPartyRow),
      products: (prod.data ?? []).map(mapProductRow),
      documents: (doc.data ?? []).map(mapDocRow),
      entries: (ent.data ?? []).map(mapEntryRow),
    };
    loaded = true;
    notify();
  } finally {
    loading = false;
  }
};

// Init + abonnement realtime
const ensureLoaded = () => {
  if (!loaded && !loading) fetchAll();
};

if (typeof window !== "undefined") {
  ensureLoaded();
  supabase
    .channel("gescom-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "parties" }, () => fetchAll())
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => fetchAll())
    .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, () => fetchAll())
    .on("postgres_changes", { event: "*", schema: "public", table: "accounting_entries" }, () => fetchAll())
    .subscribe();
}

export const useStore = () => {
  const [, force] = useState(0);
  useEffect(() => {
    ensureLoaded();
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return memory;
};

export const useStoreLoaded = () => {
  const [v, setV] = useState(loaded);
  useEffect(() => {
    const fn = () => setV(loaded);
    listeners.add(fn);
    if (loaded) setV(true);
    return () => { listeners.delete(fn); };
  }, []);
  return v;
};

// ========= Parties =========
export const upsertParty = async (p: Omit<Party, "id" | "createdAt"> & { id?: string }) => {
  const row = {
    type: p.type, name: p.name,
    email: p.email || null, phone: p.phone || null,
    address: p.address || null, ninea: p.ninea || null, notes: p.notes || null,
  };
  if (p.id) {
    await supabase.from("parties").update(row).eq("id", p.id);
  } else {
    await supabase.from("parties").insert(row);
  }
  await fetchAll();
};

export const deleteParty = async (id: string) => {
  await supabase.from("parties").delete().eq("id", id);
  await fetchAll();
};

// ========= Products =========
export const upsertProduct = async (p: Omit<Product, "id" | "createdAt"> & { id?: string }) => {
  const row = {
    sku: p.sku, name: p.name,
    description: p.description || null,
    category: p.category || null,
    image_url: p.imageUrl || null,
    cost_ht: p.costHT, price_ht: p.priceHT,
    tva_rate: p.tvaRate, stock: p.stock,
    stock_alert: p.stockAlert, unit: p.unit,
  };
  if (p.id) {
    await supabase.from("products").update(row).eq("id", p.id);
  } else {
    await supabase.from("products").insert(row);
  }
  await fetchAll();
};

export const deleteProduct = async (id: string) => {
  await supabase.from("products").delete().eq("id", id);
  await fetchAll();
};

const adjustStockDB = async (productId: string, delta: number) => {
  const prod = memory.products.find((x) => x.id === productId);
  if (!prod) return;
  const next = Math.max(0, prod.stock + delta);
  await supabase.from("products").update({ stock: next }).eq("id", productId);
};

// ========= Documents =========
export const nextDocNumber = (kind: DocKind) => {
  const prefix = kind === "devis" ? "DEV" : kind === "facture" ? "FAC" : "ACH";
  const year = new Date().getFullYear();
  const count = memory.documents.filter((d) => d.kind === kind && d.number.includes(`${year}`)).length + 1;
  return `${prefix}-${year}-${String(count).padStart(4, "0")}`;
};

const applyStockMovement = async (doc: InvoiceDoc, previous?: InvoiceDoc) => {
  const wasCounted = previous && previous.status !== "annulee" && previous.status !== "brouillon";
  const isCounted = doc.status !== "annulee" && doc.status !== "brouillon";

  if (previous && wasCounted) {
    for (const l of previous.lines) {
      if (!l.productId) continue;
      const sign = previous.kind === "achat" ? -1 : +1;
      await adjustStockDB(l.productId, sign * l.quantity);
    }
  }
  if (isCounted) {
    for (const l of doc.lines) {
      if (!l.productId) continue;
      const sign = doc.kind === "achat" ? +1 : -1;
      await adjustStockDB(l.productId, sign * l.quantity);
    }
  }
};

export const upsertDocument = async (d: Omit<InvoiceDoc, "id" | "createdAt"> & { id?: string }) => {
  const previous = d.id ? memory.documents.find((x) => x.id === d.id) : undefined;
  const row = {
    kind: d.kind, number: d.number,
    party_id: d.partyId || null,
    date: d.date, due_date: d.dueDate || null,
    status: d.status, notes: d.notes || null,
    lines: d.lines as any,
  };

  let savedId = d.id;
  if (d.id) {
    await supabase.from("documents").update(row).eq("id", d.id);
  } else {
    const { data } = await supabase.from("documents").insert(row).select("id").single();
    savedId = data?.id;
  }

  const saved: InvoiceDoc = {
    ...(previous ?? ({} as InvoiceDoc)),
    ...d,
    id: savedId!,
    createdAt: previous?.createdAt ?? new Date().toISOString(),
  } as InvoiceDoc;

  await applyStockMovement(saved, previous);
  await fetchAll();
};

export const deleteDocument = async (id: string) => {
  const previous = memory.documents.find((d) => d.id === id);
  await supabase.from("documents").delete().eq("id", id);
  if (previous && previous.status !== "annulee" && previous.status !== "brouillon") {
    for (const l of previous.lines) {
      if (!l.productId) continue;
      const sign = previous.kind === "achat" ? -1 : +1;
      await adjustStockDB(l.productId, sign * l.quantity);
    }
  }
  await fetchAll();
};

export const setDocStatus = async (id: string, status: InvoiceStatus) => {
  const previous = memory.documents.find((d) => d.id === id);
  if (!previous) return;
  await supabase.from("documents").update({ status }).eq("id", id);
  const updated = { ...previous, status };
  await applyStockMovement(updated, previous);
  await fetchAll();
};

// Compat (non utilisé directement)
export const adjustStock = adjustStockDB;
