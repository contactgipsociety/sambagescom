import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Printer, FileText, Scale } from "lucide-react";
import { toast } from "sonner";
import { useStore, upsertEntry, deleteEntry } from "@/lib/store";
import { SYSCOHADA_ACCOUNTS, accountByCode } from "@/lib/syscohada";
import { xof, dateFr } from "@/lib/format";
import { docTotals } from "@/lib/format";
import type { AccountingEntry, EntryType } from "@/lib/types";
import { useCompany, buildFiscalYear, fiscalYearOf } from "@/lib/company";

export default function Accounting() {
  const { entries, documents, products } = useStore();
  const company = useCompany();
  const startMonth = company.fiscalYearStartMonth;
  const startDay = company.fiscalYearStartDay;
  const [year, setYear] = useState<number>(company.currentFiscalYear);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AccountingEntry | null>(null);

  const fy = useMemo(() => buildFiscalYear(year, startMonth, startDay), [year, startMonth, startDay]);

  // ====== Données dérivées des opérations ======
  const yearEntries = useMemo(
    () => entries.filter((e) => fiscalYearOf(e.date, startMonth, startDay) === year),
    [entries, year, startMonth, startDay]
  );

  const yearDocs = useMemo(
    () => documents.filter((d) =>
      fiscalYearOf(d.date, startMonth, startDay) === year
      && d.status !== "annulee" && d.status !== "brouillon"
    ),
    [documents, year, startMonth, startDay]
  );

  // Ventes (701) — HT
  const ventesHT = yearDocs
    .filter((d) => d.kind === "facture")
    .reduce((s, d) => s + docTotals(d).ht, 0);
  const tvaCollectee = yearDocs
    .filter((d) => d.kind === "facture")
    .reduce((s, d) => s + docTotals(d).tva, 0);

  // Achats (601) — HT
  const achatsHT = yearDocs
    .filter((d) => d.kind === "achat")
    .reduce((s, d) => s + docTotals(d).ht, 0);
  const tvaDeductible = yearDocs
    .filter((d) => d.kind === "achat")
    .reduce((s, d) => s + docTotals(d).tva, 0);

  // Stock final estimé (au coût)
  const stockValue = products.reduce((s, p) => s + p.stock * p.costHT, 0);

  // Créances clients (factures envoyées non payées)
  const creancesClients = documents
    .filter((d) => d.kind === "facture" && d.status === "envoyee")
    .reduce((s, d) => s + docTotals(d).ttc, 0);

  // Dettes fournisseurs (achats envoyés non payés)
  const dettesFour = documents
    .filter((d) => d.kind === "achat" && d.status === "envoyee")
    .reduce((s, d) => s + docTotals(d).ttc, 0);

  // ====== Agrégation des écritures manuelles ======
  const sumByType = (t: EntryType) => yearEntries.filter((e) => e.entryType === t).reduce((s, e) => s + e.amount, 0);
  const sumByGroup = (group: string) =>
    yearEntries
      .filter((e) => accountByCode(e.accountCode)?.group === group)
      .reduce((s, e) => s + e.amount, 0);

  // ====== Compte de résultat SYSCOHADA ======
  // Produits d'exploitation
  const produitsExpl = ventesHT + sumByGroup("Ventes");
  const produitsFin = sumByGroup("Produits financiers");
  const reprises = sumByGroup("Reprises");
  const totalProduits = produitsExpl + produitsFin + reprises;

  // Charges
  const achats = achatsHT + sumByGroup("Achats");
  const servicesExt = sumByGroup("Services extérieurs");
  const impotsTaxes = sumByGroup("Impôts et taxes");
  const personnel = sumByGroup("Charges de personnel");
  const dotations = sumByGroup("Dotations");
  const chargesFin = sumByGroup("Charges financières");
  const impotResultat = sumByGroup("Impôt sur les bénéfices");
  const totalCharges = achats + servicesExt + impotsTaxes + personnel + dotations + chargesFin + impotResultat;

  // Indicateurs
  const valeurAjoutee = produitsExpl - achats - servicesExt;
  const ebe = valeurAjoutee - personnel - impotsTaxes;
  const resultatExpl = ebe - dotations;
  const resultatFin = produitsFin - chargesFin;
  const resultatNet = totalProduits - totalCharges;

  // ====== Bilan ======
  // Actif
  const immobilisations = sumByGroup("Immobilisations corporelles");
  const tresorerieActif = sumByGroup("Trésorerie - Actif");
  const totalActif = immobilisations + stockValue + creancesClients + tresorerieActif;

  // Passif
  const capitauxPropres = sumByGroup("Capitaux propres") + resultatNet;
  const dettesFinancieres = sumByGroup("Dettes financières");
  const dettesExpl = sumByGroup("Dettes d'exploitation") + dettesFour;
  const dettesFiscales = sumByGroup("Dettes fiscales") + Math.max(0, tvaCollectee - tvaDeductible);
  const totalPassif = capitauxPropres + dettesFinancieres + dettesExpl + dettesFiscales;

  const ecartBilan = totalActif - totalPassif;

  const years = useMemo(() => {
    const set = new Set<number>([currentYear]);
    entries.forEach((e) => set.add(new Date(e.date).getFullYear()));
    documents.forEach((d) => set.add(new Date(d.date).getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [entries, documents]);

  const handleSave = async (data: Omit<AccountingEntry, "id" | "createdAt"> & { id?: string }) => {
    await upsertEntry(data);
    toast.success("Écriture enregistrée");
    setOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comptabilité"
        subtitle="Bilan annuel et compte de résultat — conforme SYSCOHADA (Sénégal / OHADA)"
        action={
          <div className="flex items-center gap-2">
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />Imprimer
            </Button>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Nouvelle écriture</Button>
              </DialogTrigger>
              <EntryDialog editing={editing} onSave={handleSave} />
            </Dialog>
          </div>
        }
      />

      {/* KPI rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI label="Chiffre d'affaires" value={xof(produitsExpl)} accent="text-primary" />
        <KPI label="Total charges" value={xof(totalCharges)} accent="text-destructive" />
        <KPI label="Résultat net" value={xof(resultatNet)} accent={resultatNet >= 0 ? "text-emerald-600" : "text-destructive"} />
        <KPI label="Trésorerie + créances" value={xof(tresorerieActif + creancesClients)} accent="text-foreground" />
      </div>

      <Tabs defaultValue="resultat">
        <TabsList>
          <TabsTrigger value="resultat"><FileText className="h-4 w-4 mr-2" />Compte de résultat</TabsTrigger>
          <TabsTrigger value="bilan"><Scale className="h-4 w-4 mr-2" />Bilan</TabsTrigger>
          <TabsTrigger value="ecritures">Écritures ({yearEntries.length})</TabsTrigger>
        </TabsList>

        {/* ============== COMPTE DE RÉSULTAT ============== */}
        <TabsContent value="resultat" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Compte de résultat — Exercice {year}</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <Section title="PRODUITS D'EXPLOITATION" />
              <Row label="Ventes (701/702/706)" value={produitsExpl} />
              <Total label="Total produits d'exploitation" value={produitsExpl} />

              <Section title="CHARGES D'EXPLOITATION" />
              <Row label="Achats (601/602/604) + variation stock" value={achats} negative />
              <Row label="Services extérieurs (605, 611, 622, 624…)" value={servicesExt} negative />
              <Row label="Impôts et taxes (641, 646)" value={impotsTaxes} negative />
              <Row label="Charges de personnel (661, 664)" value={personnel} negative />
              <Row label="Dotations aux amortissements (681)" value={dotations} negative />
              <Total label="Total charges d'exploitation" value={achats + servicesExt + impotsTaxes + personnel + dotations} negative />

              <Subtotal label="Valeur Ajoutée (VA)" value={valeurAjoutee} />
              <Subtotal label="Excédent Brut d'Exploitation (EBE)" value={ebe} />
              <Subtotal label="Résultat d'exploitation" value={resultatExpl} />

              <Section title="RÉSULTAT FINANCIER" />
              <Row label="Produits financiers (771)" value={produitsFin} />
              <Row label="Charges financières (671)" value={chargesFin} negative />
              <Subtotal label="Résultat financier" value={resultatFin} />

              <Section title="IMPÔT SUR LES BÉNÉFICES" />
              <Row label="Impôt sur le résultat (691)" value={impotResultat} negative />

              <div className="mt-4 pt-4 border-t-2 border-foreground/20 flex justify-between items-center">
                <span className="text-base font-bold">RÉSULTAT NET DE L'EXERCICE</span>
                <span className={`text-xl font-bold ${resultatNet >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {xof(resultatNet)}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============== BILAN ============== */}
        <TabsContent value="bilan" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>ACTIF — au 31/12/{year}</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <Section title="ACTIF IMMOBILISÉ" />
                <Row label="Immobilisations corporelles (21, 24)" value={immobilisations} />
                <Subtotal label="Total actif immobilisé" value={immobilisations} />

                <Section title="ACTIF CIRCULANT" />
                <Row label="Stocks (311) — au coût d'achat" value={stockValue} />
                <Row label="Clients (411)" value={creancesClients} />
                <Subtotal label="Total actif circulant" value={stockValue + creancesClients} />

                <Section title="TRÉSORERIE - ACTIF" />
                <Row label="Banques + Caisse (521, 571)" value={tresorerieActif} />

                <div className="mt-4 pt-4 border-t-2 border-foreground/20 flex justify-between items-center">
                  <span className="font-bold">TOTAL ACTIF</span>
                  <span className="text-lg font-bold text-primary">{xof(totalActif)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>PASSIF — au 31/12/{year}</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <Section title="CAPITAUX PROPRES" />
                <Row label="Capital + report à nouveau (101, 121)" value={sumByGroup("Capitaux propres")} />
                <Row label="Résultat de l'exercice" value={resultatNet} />
                <Subtotal label="Total capitaux propres" value={capitauxPropres} />

                <Section title="DETTES FINANCIÈRES" />
                <Row label="Emprunts (161)" value={dettesFinancieres} />

                <Section title="PASSIF CIRCULANT" />
                <Row label="Fournisseurs (401)" value={dettesExpl} />
                <Row label="Dettes fiscales (443, 444)" value={dettesFiscales} />
                <Subtotal label="Total passif circulant" value={dettesExpl + dettesFiscales} />

                <div className="mt-4 pt-4 border-t-2 border-foreground/20 flex justify-between items-center">
                  <span className="font-bold">TOTAL PASSIF</span>
                  <span className="text-lg font-bold text-primary">{xof(totalPassif)}</span>
                </div>

                {Math.abs(ecartBilan) > 1 && (
                  <div className="mt-3 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-sm">
                    ⚠️ Écart bilan : <strong>{xof(ecartBilan)}</strong>. Saisissez les capitaux propres et la trésorerie pour équilibrer.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============== ÉCRITURES ============== */}
        <TabsContent value="ecritures">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Compte</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearEntries.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">Aucune écriture pour {year}</TableCell></TableRow>
                  )}
                  {yearEntries.map((e) => (
                    <TableRow key={e.id} className="cursor-pointer" onClick={() => { setEditing(e); setOpen(true); }}>
                      <TableCell>{dateFr(e.date)}</TableCell>
                      <TableCell><span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{e.accountCode}</span> {e.accountName}</TableCell>
                      <TableCell>{e.label}</TableCell>
                      <TableCell><span className="text-xs uppercase tracking-wide text-muted-foreground">{e.entryType}</span></TableCell>
                      <TableCell className="text-right font-medium">{xof(e.amount)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={(ev) => { ev.stopPropagation(); deleteEntry(e.id); toast.success("Supprimée"); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ====== Sous-composants ======
const KPI = ({ label, value, accent }: { label: string; value: string; accent: string }) => (
  <Card><CardContent className="p-4">
    <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
    <div className={`text-2xl font-bold mt-1 ${accent}`}>{value}</div>
  </CardContent></Card>
);

const Section = ({ title }: { title: string }) => (
  <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground pt-3 pb-1">{title}</div>
);
const Row = ({ label, value, negative }: { label: string; value: number; negative?: boolean }) => (
  <div className="flex justify-between text-sm py-1">
    <span className="text-foreground/80">{label}</span>
    <span className={negative ? "text-destructive" : ""}>{negative && value !== 0 ? "(" + xof(value) + ")" : xof(value)}</span>
  </div>
);
const Subtotal = ({ label, value }: { label: string; value: number }) => (
  <div className="flex justify-between text-sm py-1.5 mt-1 border-t font-semibold">
    <span>{label}</span><span>{xof(value)}</span>
  </div>
);
const Total = ({ label, value, negative }: { label: string; value: number; negative?: boolean }) => (
  <div className="flex justify-between text-sm py-1.5 mt-1 border-t font-semibold">
    <span>{label}</span>
    <span className={negative ? "text-destructive" : ""}>{xof(value)}</span>
  </div>
);

// ====== Dialog d'écriture ======
function EntryDialog({ editing, onSave }: { editing: AccountingEntry | null; onSave: (e: any) => void }) {
  const [date, setDate] = useState(editing?.date ?? new Date().toISOString().slice(0, 10));
  const [accountCode, setAccountCode] = useState(editing?.accountCode ?? "");
  const [label, setLabel] = useState(editing?.label ?? "");
  const [amount, setAmount] = useState<number>(editing?.amount ?? 0);
  const [notes, setNotes] = useState(editing?.notes ?? "");

  const account = accountByCode(accountCode);

  const submit = () => {
    if (!accountCode || !label || !amount) return toast.error("Compte, libellé et montant requis");
    if (!account) return toast.error("Compte invalide");
    onSave({
      id: editing?.id,
      date, label, amount,
      accountCode: account.code,
      accountName: account.name,
      entryType: account.type,
      notes,
    });
  };

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>{editing ? "Modifier l'écriture" : "Nouvelle écriture comptable"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Montant (FCFA)</Label><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
        </div>
        <div>
          <Label>Compte SYSCOHADA</Label>
          <Select value={accountCode} onValueChange={setAccountCode}>
            <SelectTrigger><SelectValue placeholder="Choisir un compte" /></SelectTrigger>
            <SelectContent className="max-h-80">
              {(["charge", "produit", "actif", "passif"] as EntryType[]).map((t) => (
                <div key={t}>
                  <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/50">{t}s</div>
                  {SYSCOHADA_ACCOUNTS.filter((a) => a.type === t).map((a) => (
                    <SelectItem key={a.code} value={a.code}>
                      <span className="font-mono mr-2">{a.code}</span>{a.name}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Libellé</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Loyer du mois de mars" /></div>
        <div><Label>Notes (optionnel)</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
      </div>
      <DialogFooter><Button onClick={submit}>Enregistrer</Button></DialogFooter>
    </DialogContent>
  );
}
