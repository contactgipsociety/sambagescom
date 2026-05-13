import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PosSessionStatus = "open" | "closed";

export interface PosSession {
  id: string;
  name: string;
  cashier?: string;
  userId?: string;
  status: PosSessionStatus;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  closingBalanceCounted?: number;
  closingNotes?: string;
  createdAt: string;
}

// @deprecated — utiliser src/lib/payments.ts (table payment_methods)
export type PaymentMethod = string;
export const PAYMENT_LABELS: Record<string, string> = {
  especes: "Espèces",
  orange_money: "Orange Money",
  wave: "Wave",
  carte: "Carte bancaire",
  credit_fournisseur: "Crédit fournisseur",
  compte_client: "Compte client",
  mobile: "Mobile Money",
  cheque: "Chèque",
  virement: "Virement",
};

const mapRow = (r: any): PosSession => ({
  id: r.id,
  name: r.name,
  cashier: r.cashier ?? undefined,
  status: r.status,
  openedAt: r.opened_at,
  closedAt: r.closed_at ?? undefined,
  openingBalance: Number(r.opening_balance),
  closingBalanceCounted: r.closing_balance_counted == null ? undefined : Number(r.closing_balance_counted),
  closingNotes: r.closing_notes ?? undefined,
  createdAt: r.created_at,
});

let memory: PosSession[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const fetchAll = async () => {
  const { data } = await supabase.from("pos_sessions").select("*").order("opened_at", { ascending: false });
  memory = (data ?? []).map(mapRow);
  loaded = true;
  notify();
};

if (typeof window !== "undefined") {
  fetchAll();
  supabase
    .channel("pos-sessions-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "pos_sessions" }, () => fetchAll())
    .subscribe();
}

export const usePosSessions = () => {
  const [, force] = useState(0);
  useEffect(() => {
    if (!loaded) fetchAll();
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return memory;
};

export const useCurrentSession = (): PosSession | undefined => {
  const list = usePosSessions();
  return list.find((s) => s.status === "open");
};

export const openSession = async (params: { name: string; cashier?: string; openingBalance: number }) => {
  const existing = memory.find((s) => s.status === "open");
  if (existing) throw new Error("Une session est déjà ouverte");
  await supabase.from("pos_sessions").insert({
    name: params.name,
    cashier: params.cashier || null,
    opening_balance: params.openingBalance,
    status: "open",
  });
  await fetchAll();
};

export const closeSession = async (
  id: string,
  params: { closingBalanceCounted: number; closingNotes?: string },
) => {
  await supabase.from("pos_sessions").update({
    status: "closed",
    closed_at: new Date().toISOString(),
    closing_balance_counted: params.closingBalanceCounted,
    closing_notes: params.closingNotes || null,
  }).eq("id", id);
  await fetchAll();
};

export const reopenSession = async (id: string) => {
  await supabase.from("pos_sessions").update({
    status: "open",
    closed_at: null,
    closing_balance_counted: null,
  }).eq("id", id);
  await fetchAll();
};

export const deleteSession = async (id: string) => {
  await supabase.from("pos_sessions").delete().eq("id", id);
  await fetchAll();
};
