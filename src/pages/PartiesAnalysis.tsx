import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, Search, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { xof, dateFr, docTotals } from "@/lib/format";
import type { InvoiceDoc, PartyType } from "@/lib/types";

const dayDiff = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

const ageingBucket = (days: number) =>
  days <= 30 ? "0-30 j" : days <= 60 ? "31-60 j" : days <= 90 ? "61-90 j" : "> 90 j";

interface PartySummary {
  id: string;
  name: string;
  totalUnpaid: number;
  totalPaid: number;
  docCount: number;
  oldestDays: number;
  unpaidDocs: InvoiceDoc[];
  paidDocs: InvoiceDoc[];
}

const buildSummary = (
  parties: { id: string; name: string; type: PartyType }[],
  documents: InvoiceDoc[],
  type: PartyType
): PartySummary[] => {
  const kind = type === "client" ? "facture" : "achat";
  return parties
    .filter((p) => p.type === type)
    .map((p) => {
      const docs = documents.filter(
        (d) => d.partyId === p.id && d.kind === kind && d.status !== "annulee" && d.status !== "brouillon"
      );
      const unpaid = docs.filter((d) => d.status === "envoyee");
      const paid = docs.filter((d) => d.status === "payee");
      const totalUnpaid = unpaid.reduce((s, d) => s + docTotals(d).ttc, 0);
      const totalPaid = paid.reduce((s, d) => s + docTotals(d).ttc, 0);
      const oldestDays = unpaid.length
        ? Math.max(...unpaid.map((d) => dayDiff(d.date)))
        : 0;
      return { id: p.id, name: p.name, totalUnpaid, totalPaid, docCount: docs.length, oldestDays, unpaidDocs: unpaid, paidDocs: paid };
    })
    .filter((s) => s.docCount > 0 || s.totalUnpaid > 0)
    .sort((a, b) => b.totalUnpaid - a.totalUnpaid);
};

export default function PartiesAnalysis() {
  const { parties, documents } = useStore();
  const [q, setQ] = useState("");

  const clientsSum = useMemo(() => buildSummary(parties, documents, "client"), [parties, documents]);
  const fournSum = useMemo(() => buildSummary(parties, documents, "fournisseur"), [parties, documents]);

  const totalCreances = clientsSum.reduce((s, x) => s + x.totalUnpaid, 0);
  const totalDettes = fournSum.reduce((s, x) => s + x.totalUnpaid, 0);
  const caClients = clientsSum.reduce((s, x) => s + x.totalPaid + x.totalUnpaid, 0);
  const achatsFour = fournSum.reduce((s, x) => s + x.totalPaid + x.totalUnpaid, 0);

  // Vieillissement créances
  const ageingClients = clientsSum.flatMap((s) =>
    s.unpaidDocs.map((d) => ({ bucket: ageingBucket(dayDiff(d.date)), amount: docTotals(d).ttc }))
  );
  const buckets = ["0-30 j", "31-60 j", "61-90 j", "> 90 j"] as const;
  const ageingTotals = buckets.map((b) => ({
    bucket: b,
    amount: ageingClients.filter((x) => x.bucket === b).reduce((s, x) => s + x.amount, 0),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analyse comptes tiers"
        subtitle="Créances clients, dettes fournisseurs, vieillissement"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI label="Créances clients (à encaisser)" value={xof(totalCreances)} icon={<TrendingUp className="h-4 w-4" />} accent="text-emerald-600" />
        <KPI label="Dettes fournisseurs (à payer)" value={xof(totalDettes)} icon={<TrendingDown className="h-4 w-4" />} accent="text-destructive" />
        <KPI label="CA clients (cumul)" value={xof(caClients)} accent="text-primary" />
        <KPI label="Achats fournisseurs (cumul)" value={xof(achatsFour)} accent="text-foreground" />
      </div>

      {/* Vieillissement créances */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Vieillissement des créances clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ageingTotals.map((b) => {
              const pct = totalCreances > 0 ? (b.amount / totalCreances) * 100 : 0;
              const danger = b.bucket === "> 90 j" || b.bucket === "61-90 j";
              return (
                <div key={b.bucket} className="border rounded-md p-3">
                  <div className="text-xs text-muted-foreground">{b.bucket}</div>
                  <div className={`text-lg font-bold mt-1 ${danger && b.amount > 0 ? "text-destructive" : ""}`}>{xof(b.amount)}</div>
                  <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                    <div className={`h-full ${danger ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">{pct.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="clients">
        <TabsList>
          <TabsTrigger value="clients" className="gap-2"><Users className="h-4 w-4" /> Clients ({clientsSum.length})</TabsTrigger>
          <TabsTrigger value="fournisseurs" className="gap-2"><Building2 className="h-4 w-4" /> Fournisseurs ({fournSum.length})</TabsTrigger>
        </TabsList>

        <div className="my-3 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un tiers…" className="pl-9" />
        </div>

        <TabsContent value="clients">
          <PartyTable list={clientsSum.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()))} type="client" />
        </TabsContent>
        <TabsContent value="fournisseurs">
          <PartyTable list={fournSum.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()))} type="fournisseur" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const KPI = ({ label, value, accent, icon }: { label: string; value: string; accent: string; icon?: React.ReactNode }) => (
  <Card><CardContent className="p-4">
    <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">{icon}{label}</div>
    <div className={`text-2xl font-bold mt-1 ${accent}`}>{value}</div>
  </CardContent></Card>
);

function PartyTable({ list, type }: { list: PartySummary[]; type: PartyType }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const isClient = type === "client";
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isClient ? "Client" : "Fournisseur"}</TableHead>
              <TableHead className="text-right">{isClient ? "Créance" : "Dette"}</TableHead>
              <TableHead className="text-right hidden md:table-cell">{isClient ? "Encaissé" : "Payé"}</TableHead>
              <TableHead className="text-center hidden md:table-cell">Docs</TableHead>
              <TableHead className="text-center">Plus ancien</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">Aucun tiers avec opérations</TableCell></TableRow>
            )}
            {list.map((s) => {
              const isOpen = openId === s.id;
              return (
                <>
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => setOpenId(isOpen ? null : s.id)}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-right">
                      {s.totalUnpaid > 0
                        ? <span className={`font-semibold ${isClient ? "text-warning" : "text-destructive"}`}>{xof(s.totalUnpaid)}</span>
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell text-muted-foreground">{xof(s.totalPaid)}</TableCell>
                    <TableCell className="text-center hidden md:table-cell">{s.docCount}</TableCell>
                    <TableCell className="text-center">
                      {s.oldestDays > 0 ? (
                        <Badge variant={s.oldestDays > 60 ? "destructive" : "secondary"}>{s.oldestDays} j</Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted/30 p-4">
                        <div className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-2">Documents non réglés</div>
                        {s.unpaidDocs.length === 0 ? (
                          <div className="text-sm text-muted-foreground">Aucun document en attente</div>
                        ) : (
                          <table className="w-full text-sm">
                            <thead className="text-xs text-muted-foreground">
                              <tr><th className="text-left pb-1">N°</th><th className="text-left pb-1">Date</th><th className="text-left pb-1">Échéance</th><th className="text-right pb-1">TTC</th><th className="text-right pb-1">Âge</th></tr>
                            </thead>
                            <tbody>
                              {s.unpaidDocs.map((d) => (
                                <tr key={d.id} className="border-t">
                                  <td className="py-1 font-mono">{d.number}</td>
                                  <td className="py-1">{dateFr(d.date)}</td>
                                  <td className="py-1 text-muted-foreground">{d.dueDate ? dateFr(d.dueDate) : "—"}</td>
                                  <td className="py-1 text-right font-medium">{xof(docTotals(d).ttc)}</td>
                                  <td className="py-1 text-right">{dayDiff(d.date)} j</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
