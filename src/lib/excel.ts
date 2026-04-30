import * as XLSX from "xlsx";
import type { Product } from "./types";
import { upsertProduct } from "./store";
import { generateSku } from "./sku";

export interface ImportRow {
  sku?: string;
  name: string;
  category?: string;
  description?: string;
  costHT: number;
  priceHT: number;
  tvaRate: number;
  stock: number;
  stockAlert: number;
  unit: string;
}

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

export const exportProductsXlsx = (products: Product[]) => {
  const data = products.map((p) => ({
    SKU: p.sku,
    Nom: p.name,
    Catégorie: p.category ?? "",
    Description: p.description ?? "",
    "Prix achat HT": p.costHT,
    "Prix vente HT": p.priceHT,
    "TVA %": p.tvaRate,
    Stock: p.stock,
    "Alerte stock": p.stockAlert,
    Unité: p.unit,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 32 },
    { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 8 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Catalogue");
  XLSX.writeFile(wb, `catalogue-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const downloadTemplateXlsx = () => {
  const sample = [{
    SKU: "", Nom: "Coca-Cola 33cl", Catégorie: "Boissons", Description: "Canette 33cl",
    "Prix achat HT": 250, "Prix vente HT": 500, "TVA %": 18, Stock: 24, "Alerte stock": 6, Unité: "u",
  }];
  const ws = XLSX.utils.json_to_sheet(sample);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Catalogue");
  XLSX.writeFile(wb, "modele-catalogue.xlsx");
};

const norm = (s: string) =>
  s.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const findCol = (row: any, ...keys: string[]): string | undefined => {
  const map: Record<string, string> = {};
  Object.keys(row).forEach((k) => { map[norm(k)] = k; });
  for (const k of keys) {
    const found = map[norm(k)];
    if (found != null) return found;
  }
  return undefined;
};

const num = (v: any, def = 0): number => {
  if (v == null || v === "") return def;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : def;
};

export const parseProductsXlsx = async (file: File): Promise<ImportRow[]> => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
  return json.map((r) => {
    const cName = findCol(r, "Nom", "Name", "Article", "Designation", "Désignation");
    const cSku = findCol(r, "SKU", "Code", "Référence", "Reference");
    const cCat = findCol(r, "Catégorie", "Categorie", "Category");
    const cDesc = findCol(r, "Description");
    const cCost = findCol(r, "Prix achat HT", "Prix achat", "Cout", "Coût", "Cost");
    const cPrice = findCol(r, "Prix vente HT", "Prix vente", "Prix", "Price");
    const cTva = findCol(r, "TVA %", "TVA", "Tva");
    const cStock = findCol(r, "Stock", "Quantité", "Quantite", "Qty");
    const cAlert = findCol(r, "Alerte stock", "Seuil alerte", "Seuil", "Alert");
    const cUnit = findCol(r, "Unité", "Unite", "Unit");
    return {
      sku: cSku ? String(r[cSku] || "").trim() || undefined : undefined,
      name: cName ? String(r[cName] || "").trim() : "",
      category: cCat ? String(r[cCat] || "").trim() || undefined : undefined,
      description: cDesc ? String(r[cDesc] || "").trim() || undefined : undefined,
      costHT: num(cCost ? r[cCost] : 0),
      priceHT: num(cPrice ? r[cPrice] : 0),
      tvaRate: num(cTva ? r[cTva] : 18, 18),
      stock: num(cStock ? r[cStock] : 0),
      stockAlert: num(cAlert ? r[cAlert] : 0),
      unit: (cUnit ? String(r[cUnit] || "").trim() : "") || "u",
    } as ImportRow;
  });
};

export const importProductsXlsx = async (
  rows: ImportRow[],
  existing: Product[],
): Promise<ImportResult> => {
  const result: ImportResult = { total: rows.length, created: 0, updated: 0, errors: [] };
  const bySku = new Map(existing.map((p) => [p.sku.toLowerCase(), p]));
  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      if (!r.name) { result.errors.push({ row: i + 2, message: "Nom vide" }); continue; }
      const existingProd = r.sku ? bySku.get(r.sku.toLowerCase()) : undefined;
      const sku = r.sku?.trim() || existingProd?.sku || generateSku(existing, r.name, r.category);
      await upsertProduct({
        id: existingProd?.id,
        sku,
        name: r.name,
        category: r.category,
        description: r.description,
        costHT: r.costHT,
        priceHT: r.priceHT,
        tvaRate: r.tvaRate,
        stock: r.stock,
        stockAlert: r.stockAlert,
        unit: r.unit || "u",
      });
      if (existingProd) result.updated++;
      else result.created++;
    } catch (e: any) {
      result.errors.push({ row: i + 2, message: e?.message ?? "Erreur" });
    }
  }
  return result;
};
