import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PaymentKind = "cash" | "mobile" | "card" | "credit" | "bank" | "other";

export interface PaymentMethodDef {
  id: string;
  code: string;
  label: string;
  kind: PaymentKind;
  isActive: boolean;
  isCredit: boolean;
  sortOrder: number;
  icon?: string;
  accountCode?: string;
}

const mapRow = (r: any): PaymentMethodDef => ({
  id: r.id,
  code: r.code,
  label: r.label,
  kind: r.kind,
  isActive: r.is_active,
  isCredit: r.is_credit,
  sortOrder: r.sort_order,
  icon: r.icon ?? undefined,
  accountCode: r.account_code ?? undefined,
});

let memory: PaymentMethodDef[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const fetchAll = async () => {
  const { data } = await supabase
    .from("payment_methods")
    .select("*")
    .order("sort_order", { ascending: true });
  memory = (data ?? []).map(mapRow);
  loaded = true;
  notify();
};

if (typeof window !== "undefined") {
  fetchAll();
  supabase
    .channel("payment-methods-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "payment_methods" }, () => fetchAll())
    .subscribe();
}

export const usePaymentMethods = () => {
  const [, force] = useState(0);
  useEffect(() => {
    if (!loaded) fetchAll();
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return memory;
};

export const useActivePaymentMethods = () => usePaymentMethods().filter((m) => m.isActive);

export const getPaymentLabel = (code?: string): string => {
  if (!code) return "—";
  const m = memory.find((x) => x.code === code);
  return m?.label ?? code;
};

export const getPaymentMethod = (code?: string): PaymentMethodDef | undefined =>
  code ? memory.find((x) => x.code === code) : undefined;

export const upsertPaymentMethod = async (
  m: Omit<PaymentMethodDef, "id"> & { id?: string },
) => {
  const row = {
    code: m.code.trim().toLowerCase().replace(/\s+/g, "_"),
    label: m.label,
    kind: m.kind,
    is_active: m.isActive,
    is_credit: m.isCredit,
    sort_order: m.sortOrder,
    icon: m.icon || null,
    account_code: m.accountCode || null,
  };
  if (m.id) {
    await supabase.from("payment_methods").update(row).eq("id", m.id);
  } else {
    await supabase.from("payment_methods").insert(row);
  }
  await fetchAll();
};

export const deletePaymentMethod = async (id: string) => {
  await supabase.from("payment_methods").delete().eq("id", id);
  await fetchAll();
};

export const togglePaymentMethod = async (id: string, isActive: boolean) => {
  await supabase.from("payment_methods").update({ is_active: isActive }).eq("id", id);
  await fetchAll();
};

export const PAYMENT_KIND_LABELS: Record<PaymentKind, string> = {
  cash: "Espèces",
  mobile: "Mobile Money",
  card: "Carte",
  credit: "Crédit / À régler",
  bank: "Virement / Chèque",
  other: "Autre",
};
