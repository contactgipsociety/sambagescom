// Plan comptable SYSCOHADA simplifié — Sénégal / OHADA
// Utilisé pour la saisie d'écritures et l'agrégation Bilan / Compte de résultat.

import type { EntryType } from "./types";

export interface SyscohadaAccount {
  code: string;
  name: string;
  type: EntryType;
  group: string; // libellé d'agrégation Bilan ou CR
}

export const SYSCOHADA_ACCOUNTS: SyscohadaAccount[] = [
  // ===== CLASSE 6 — CHARGES (Compte de résultat) =====
  { code: "601", name: "Achats de marchandises", type: "charge", group: "Achats" },
  { code: "602", name: "Achats de matières premières", type: "charge", group: "Achats" },
  { code: "604", name: "Achats stockés (fournitures)", type: "charge", group: "Achats" },
  { code: "605", name: "Autres achats (eau, électricité, carburant)", type: "charge", group: "Services extérieurs" },
  { code: "611", name: "Transports", type: "charge", group: "Services extérieurs" },
  { code: "622", name: "Locations et charges locatives (loyer)", type: "charge", group: "Services extérieurs" },
  { code: "624", name: "Entretien, réparations", type: "charge", group: "Services extérieurs" },
  { code: "625", name: "Primes d'assurance", type: "charge", group: "Services extérieurs" },
  { code: "626", name: "Études, recherches, documentation", type: "charge", group: "Services extérieurs" },
  { code: "627", name: "Publicité, publications, relations publiques", type: "charge", group: "Services extérieurs" },
  { code: "628", name: "Frais de télécommunications", type: "charge", group: "Services extérieurs" },
  { code: "631", name: "Frais bancaires", type: "charge", group: "Services extérieurs" },
  { code: "641", name: "Impôts et taxes directs", type: "charge", group: "Impôts et taxes" },
  { code: "646", name: "Droits d'enregistrement", type: "charge", group: "Impôts et taxes" },
  { code: "661", name: "Rémunération du personnel (salaires)", type: "charge", group: "Charges de personnel" },
  { code: "664", name: "Charges sociales (IPRES, CSS)", type: "charge", group: "Charges de personnel" },
  { code: "671", name: "Intérêts des emprunts", type: "charge", group: "Charges financières" },
  { code: "681", name: "Dotations aux amortissements", type: "charge", group: "Dotations" },
  { code: "691", name: "Impôt sur le résultat (IS)", type: "charge", group: "Impôt sur les bénéfices" },

  // ===== CLASSE 7 — PRODUITS (Compte de résultat) =====
  { code: "701", name: "Ventes de marchandises", type: "produit", group: "Ventes" },
  { code: "702", name: "Ventes de produits finis", type: "produit", group: "Ventes" },
  { code: "706", name: "Services vendus", type: "produit", group: "Ventes" },
  { code: "707", name: "Produits accessoires", type: "produit", group: "Ventes" },
  { code: "771", name: "Intérêts de prêts", type: "produit", group: "Produits financiers" },
  { code: "781", name: "Reprises d'amortissements", type: "produit", group: "Reprises" },

  // ===== ACTIF (Bilan) =====
  { code: "211", name: "Terrains", type: "actif", group: "Immobilisations corporelles" },
  { code: "213", name: "Bâtiments", type: "actif", group: "Immobilisations corporelles" },
  { code: "2441", name: "Matériel de bureau et informatique", type: "actif", group: "Immobilisations corporelles" },
  { code: "2451", name: "Matériel de transport", type: "actif", group: "Immobilisations corporelles" },
  { code: "311", name: "Stocks de marchandises", type: "actif", group: "Stocks" },
  { code: "411", name: "Clients", type: "actif", group: "Créances" },
  { code: "521", name: "Banques", type: "actif", group: "Trésorerie - Actif" },
  { code: "571", name: "Caisse", type: "actif", group: "Trésorerie - Actif" },

  // ===== PASSIF (Bilan) =====
  { code: "101", name: "Capital social", type: "passif", group: "Capitaux propres" },
  { code: "121", name: "Report à nouveau", type: "passif", group: "Capitaux propres" },
  { code: "161", name: "Emprunts bancaires", type: "passif", group: "Dettes financières" },
  { code: "401", name: "Fournisseurs", type: "passif", group: "Dettes d'exploitation" },
  { code: "421", name: "Personnel - Rémunérations dues", type: "passif", group: "Dettes d'exploitation" },
  { code: "443", name: "État - TVA collectée", type: "passif", group: "Dettes fiscales" },
  { code: "444", name: "État - Impôts sur les bénéfices", type: "passif", group: "Dettes fiscales" },
];

export const accountByCode = (code: string) =>
  SYSCOHADA_ACCOUNTS.find((a) => a.code === code);
