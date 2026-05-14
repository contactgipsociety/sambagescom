import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CompanySettings {
  id: string;
  name: string;
  legalForm?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  ninea?: string;
  rccm?: string;
  taxRegime?: string;
  currency: string;
  defaultTva: number;
  logoUrl?: string;
  invoiceFooter?: string;
  fiscalYearStartMonth: number; // 1-12
  fiscalYearStartDay: number;   // 1-31
  currentFiscalYear: number;
}

const DEFAULTS: CompanySettings = {
  id: "",
  name: "Sama Boutique",
  currency: "XOF",
  defaultTva: 18,
  fiscalYearStartMonth: 1,
  fiscalYearStartDay: 1,
  currentFiscalYear: new Date().getFullYear(),
};

const mapRow = (r: any): CompanySettings => ({
  id: r.id,
  name: r.name ?? "Sama Boutique",
  legalForm: r.legal_form ?? undefined,
  address: r.address ?? undefined,
  city: r.city ?? undefined,
  phone: r.phone ?? undefined,
  email: r.email ?? undefined,
  website: r.website ?? undefined,
  ninea: r.ninea ?? undefined,
  rccm: r.rccm ?? undefined,
  taxRegime: r.tax_regime ?? undefined,
  currency: r.currency ?? "XOF",
  defaultTva: Number(r.default_tva ?? 18),
  logoUrl: r.logo_url ?? undefined,
  invoiceFooter: r.invoice_footer ?? undefined,
  fiscalYearStartMonth: Number(r.fiscal_year_start_month ?? 1),
  fiscalYearStartDay: Number(r.fiscal_year_start_day ?? 1),
  currentFiscalYear: Number(r.current_fiscal_year ?? new Date().getFullYear()),
});

let cache: CompanySettings = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export const fetchCompany = async () => {
  const { data } = await (supabase as any).from("company_settings").select("*").limit(1).maybeSingle();
  if (data) {
    cache = mapRow(data);
    loaded = true;
    notify();
  }
  return cache;
};

if (typeof window !== "undefined") {
  fetchCompany();
  (supabase as any)
    .channel("company-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "company_settings" }, () => fetchCompany())
    .subscribe();
}

export const useCompany = () => {
  const [, force] = useState(0);
  useEffect(() => {
    if (!loaded) fetchCompany();
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return cache;
};

export const getCompany = () => cache;

export const updateCompany = async (patch: Partial<CompanySettings>) => {
  const row: any = {
    name: patch.name,
    legal_form: patch.legalForm ?? null,
    address: patch.address ?? null,
    city: patch.city ?? null,
    phone: patch.phone ?? null,
    email: patch.email ?? null,
    website: patch.website ?? null,
    ninea: patch.ninea ?? null,
    rccm: patch.rccm ?? null,
    tax_regime: patch.taxRegime ?? null,
    currency: patch.currency ?? "XOF",
    default_tva: patch.defaultTva ?? 18,
    logo_url: patch.logoUrl ?? null,
    invoice_footer: patch.invoiceFooter ?? null,
    fiscal_year_start_month: patch.fiscalYearStartMonth ?? 1,
    fiscal_year_start_day: patch.fiscalYearStartDay ?? 1,
    current_fiscal_year: patch.currentFiscalYear ?? new Date().getFullYear(),
    updated_at: new Date().toISOString(),
  };
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);
  if (cache.id) {
    await (supabase as any).from("company_settings").update(row).eq("id", cache.id);
  } else {
    await (supabase as any).from("company_settings").insert(row);
  }
  await fetchCompany();
};

export const uploadLogo = async (file: File): Promise<string> => {
  if (file.size > 5 * 1024 * 1024) throw new Error("Le logo doit faire moins de 5 Mo");
  const ext = file.name.split(".").pop() || "png";
  const path = `logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("company-assets").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("company-assets").getPublicUrl(path);
  return data.publicUrl;
};

// ============ EXERCICE FISCAL ============

export interface FiscalYear {
  year: number;       // ex: 2026 (l'année où l'exercice commence)
  start: Date;
  end: Date;
  label: string;      // ex: "Exercice 2026" ou "Exercice 2026/2027"
}

export const buildFiscalYear = (year: number, startMonth = 1, startDay = 1): FiscalYear => {
  const start = new Date(year, startMonth - 1, startDay);
  const end = new Date(year + 1, startMonth - 1, startDay);
  end.setDate(end.getDate() - 1);
  const label = startMonth === 1 && startDay === 1
    ? `Exercice ${year}`
    : `Exercice ${year}/${year + 1}`;
  return { year, start, end, label };
};

export const fiscalYearOf = (date: string | Date, startMonth = 1, startDay = 1): number => {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const cutoff = new Date(y, startMonth - 1, startDay);
  return d < cutoff ? y - 1 : y;
};

export const isInFiscalYear = (date: string | Date, year: number, startMonth = 1, startDay = 1): boolean => {
  return fiscalYearOf(date, startMonth, startDay) === year;
};
