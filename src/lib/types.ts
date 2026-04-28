export type PartyType = "client" | "fournisseur";

export interface Party {
  id: string;
  type: PartyType;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  siret?: string;
  notes?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  priceHT: number;
  tvaRate: number; // %
  stock: number;
  stockAlert: number;
  unit: string;
  createdAt: string;
}

export type InvoiceStatus = "brouillon" | "envoyee" | "payee" | "annulee";
export type DocKind = "devis" | "facture";

export interface InvoiceLine {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPriceHT: number;
  tvaRate: number;
}

export interface InvoiceDoc {
  id: string;
  kind: DocKind;
  number: string;
  clientId: string;
  date: string;
  dueDate?: string;
  lines: InvoiceLine[];
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
}

export interface AppState {
  parties: Party[];
  products: Product[];
  documents: InvoiceDoc[];
}
