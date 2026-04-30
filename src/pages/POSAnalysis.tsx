import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { usePosSessions, deleteSession, reopenSession } from "@/lib/pos";
import { usePaymentMethods, getPaymentLabel } from "@/lib/payments";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Trash2, RotateCcw, Wallet, ReceiptText, TrendingUp, AlertCircle } from "lucide-react";
import { xof } from "@/lib/format";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function POSAnalysis() {
  const s = useStore();
  const sessions = usePosSessions();
  const methods = usePaymentMethods();
  const [selected, setSelected] = useState<string | null>(null);

  // Codes connus dans la base + ceux trouvés sur les docs (sécurité)
  const allMethodCodes = useMemo(() => {
    const set = new Set<string>(methods.map((m) => m.code));
    s.documents.forEach((d) => { if (d.paymentMethod) set.add(d.paymentMethod); });
    return Array.from(set);
  }, [methods, s.documents]);

  const docTotal = (d: typeof s.documents[number]) =>
    d.lines.reduce((sum, l) => sum + l.quantity * l.unitPriceHT * (1 + l.tvaRate / 100), 0);

  const stats = (sessionId: string) => {
    const docs = s.documents.filter((d) => d.posSessionId === sessionId && d.status === "payee");
    const total = docs.reduce((sum, d) => sum + docTotal(d), 0);
    const byMethod: Record<string, number> = {};
    docs.forEach((d) => {
      const m = d.paymentMethod ?? "especes";
      byMethod[m] = (byMethod[m] ?? 0) + docTotal(d);
    });
    return { docs, total, byMethod, count: docs.length };
  };

  const globalStats = useMemo(() => {
    const closed = sessions.filter((s) => s.status === "closed");
    const totalRevenue = sessions.reduce((sum, sess) => sum + stats(sess.id).total, 0);
    const totalTickets = sessions.reduce((sum, sess) => sum + stats(sess.id).count, 0);
    const totalEcart = closed.reduce((sum, sess) => {
      const { byMethod } = stats(sess.id);
      const expected = sess.openingBalance + (byMethod.especes ?? 0);
      return sum + ((sess.closingBalanceCounted ?? expected) - expected);
    }, 0);
    return { totalRevenue, totalTickets, totalEcart, sessionsCount: sessions.length };
  }, [sessions, s.documents]);

  const detail = selected ? sessions.find((s) => s.id === selected) : null;
  const detailStats = detail ? stats(detail.id) : null;
  const expectedCash = detail ? detail.openingBalance + (detailStats!.byMethod.especes ?? 0) : 0;
  const ecart = detail && detail.closingBalanceCounted != null ? detail.closingBalanceCounted - expectedCash : null;

  // Top produits sur toutes sessions
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; total: number }>();
    s.documents.filter((d) => d.posSessionId && d.status === "payee").forEach((d) => {
      d.lines.forEach((l) => {
        const key = l.productId ?? l.description;
        const cur = map.get(key) ?? { name: l.description, qty: 0, total: 0 };
        cur.qty += l.quantity;
        cur.total += l.quantity * l.unitPriceHT * (1 + l.tvaRate / 100);
        map.set(key, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [s.documents]);

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Analyse caisse"
        subtitle="Historique des sessions de caisse, écarts et performance"
        action={<Button asChild variant="outline" size="sm" className="gap-1.5"><Link to="/pos"><ArrowLeft className="h-4 w-4" /> Retour POS</Link></Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi label="Sessions" value={globalStats.sessionsCount.toString()} icon={Wallet} />
        <Kpi label="Tickets totaux" value={globalStats.totalTickets.toString()} icon={ReceiptText} />
        <Kpi label="Chiffre d'affaires" value={xof(globalStats.totalRevenue)} icon={TrendingUp} highlight />
        <Kpi label="Écart cumulé" value={xof(globalStats.totalEcart)} icon={AlertCircle} alert={globalStats.totalEcart !== 0} />
      </div>

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="products">Top produits</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Caissier</TableHead>
                  <TableHead>Ouverture</TableHead>
                  <TableHead>Fermeture</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                  <TableHead className="text-right">CA TTC</TableHead>
                  <TableHead className="text-right">Écart</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-10">Aucune session enregistrée</TableCell></TableRow>
                )}
                {sessions.map((sess) => {
                  const st = stats(sess.id);
                  const exp = sess.openingBalance + (st.byMethod.especes ?? 0);
                  const ec = sess.closingBalanceCounted != null ? sess.closingBalanceCounted - exp : null;
                  return (
                    <TableRow key={sess.id} onClick={() => setSelected(sess.id)} className="cursor-pointer">
                      <TableCell className="font-medium">{sess.name}</TableCell>
                      <TableCell className="text-muted-foreground">{sess.cashier ?? "—"}</TableCell>
                      <TableCell className="text-xs">{new Date(sess.openedAt).toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="text-xs">{sess.closedAt ? new Date(sess.closedAt).toLocaleString("fr-FR") : "—"}</TableCell>
                      <TableCell className="text-right">{st.count}</TableCell>
                      <TableCell className="text-right font-semibold">{xof(st.total)}</TableCell>
                      <TableCell className={`text-right ${ec == null ? "text-muted-foreground" : ec === 0 ? "text-success" : "text-destructive"}`}>
                        {ec == null ? "—" : xof(ec)}
                      </TableCell>
                      <TableCell>
                        {sess.status === "open"
                          ? <Badge className="bg-success/15 text-success border-success/30">Ouverte</Badge>
                          : <Badge variant="secondary">Fermée</Badge>}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {sess.status === "closed" && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => { await reopenSession(sess.id); toast.success("Session ré-ouverte"); }}>
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={async () => {
                            if (confirm("Supprimer cette session ? Les ventes resteront mais ne seront plus rattachées.")) {
                              await deleteSession(sess.id); toast.success("Session supprimée");
                            }
                          }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {detail && detailStats && (
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-semibold text-lg">{detail.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(detail.openedAt).toLocaleString("fr-FR")}
                    {detail.closedAt && ` → ${new Date(detail.closedAt).toLocaleString("fr-FR")}`}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Fermer le détail</Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Trésorerie</h4>
                  <div className="rounded-lg border border-border p-3 space-y-1.5 text-sm">
                    <Row label="Solde d'ouverture" value={xof(detail.openingBalance)} />
                    <Row label="Encaissements espèces" value={xof(detailStats.byMethod.especes ?? 0)} />
                    <Row label="Espèces théoriques" value={xof(expectedCash)} bold />
                    <Row label="Espèces comptées" value={detail.closingBalanceCounted != null ? xof(detail.closingBalanceCounted) : "—"} />
                    {ecart != null && (
                      <div className={`flex justify-between font-semibold pt-1.5 border-t border-border ${ecart === 0 ? "text-success" : "text-destructive"}`}>
                        <span>Écart</span><span>{xof(ecart)}</span>
                      </div>
                    )}
                  </div>
                  {detail.closingNotes && (
                    <div className="text-xs text-muted-foreground italic border-l-2 border-border pl-3">{detail.closingNotes}</div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Par mode de paiement</h4>
                  <div className="rounded-lg border border-border p-3 space-y-1.5 text-sm">
                    {Object.keys(PAYMENT_LABELS).map((m) => {
                      const amt = detailStats.byMethod[m] ?? 0;
                      if (amt === 0) return null;
                      const pct = detailStats.total > 0 ? (amt / detailStats.total) * 100 : 0;
                      return (
                        <div key={m} className="space-y-1">
                          <div className="flex justify-between"><span>{PAYMENT_LABELS[m as PaymentMethod]}</span><span className="font-medium">{xof(amt)} <span className="text-muted-foreground text-xs">({pct.toFixed(0)}%)</span></span></div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
                        </div>
                      );
                    })}
                    <div className="flex justify-between font-semibold pt-2 border-t border-border"><span>Total</span><span className="text-primary">{xof(detailStats.total)}</span></div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tickets ({detailStats.count})</h4>
                <div className="border border-border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>N°</TableHead><TableHead>Heure</TableHead><TableHead>Paiement</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {detailStats.docs.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono text-xs">{d.number}</TableCell>
                          <TableCell className="text-xs">{new Date(d.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{PAYMENT_LABELS[(d.paymentMethod ?? "especes") as PaymentMethod]}</Badge></TableCell>
                          <TableCell className="text-right font-semibold">{xof(docTotal(d))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="products">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Produit</TableHead><TableHead className="text-right">Quantité</TableHead><TableHead className="text-right">CA TTC</TableHead></TableRow></TableHeader>
              <TableBody>
                {topProducts.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-10">Aucune vente POS</TableCell></TableRow>}
                {topProducts.map((p, i) => (
                  <TableRow key={i}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-right">{p.qty}</TableCell><TableCell className="text-right font-semibold">{xof(p.total)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, highlight, alert }: { label: string; value: string; icon: any; highlight?: boolean; alert?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "bg-primary-soft border-primary/30" : alert ? "bg-destructive/5 border-destructive/30" : "bg-card border-border"}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className={`text-lg font-bold mt-1 ${highlight ? "text-primary" : alert ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div className={`flex justify-between ${bold ? "font-semibold" : "text-muted-foreground"}`}><span>{label}</span><span>{value}</span></div>;
}
