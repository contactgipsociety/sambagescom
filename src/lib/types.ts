export type PartyType = "client" | "fournisseur";

export interface Party {
  id: string;
  type: PartyType;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  ninea?: string; // équivalent SIRET au Sénégal
  notes?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;    // catégorie produit
  costHT: number;       // prix d'achat
  priceHT: number;      // prix de vente
  tvaRate: number;      // % (18 par défaut au Sénégal)
  stock: number;
  stockAlert: number;
  unit: string;
  createdAt: string;
}

export type InvoiceStatus = "brouillon" | "envoyee" | "payee" | "annulee";
export type DocKind = "devis" | "facture" | "achat";

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
  partyId: string;     // client si vente, fournisseur si achat
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
