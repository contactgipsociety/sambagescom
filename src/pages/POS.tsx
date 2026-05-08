import { useEffect, useMemo, useState } from "react";
import { useStore, upsertDocument, nextDocNumber } from "@/lib/store";
import { useCurrentSession, openSession, closeSession, usePosSessions } from "@/lib/pos";
import { useAuth } from "@/lib/auth";
import { useActivePaymentMethods, getPaymentLabel } from "@/lib/payments";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Search, Plus, Minus, Trash2, ShoppingBag, Printer, ReceiptText, X, ImageIcon,
  CheckCircle2, LockOpen, Lock, Clock, Wallet, BarChart3, UserPlus,
} from "lucide-react";
import { QuickCreateParty } from "@/components/QuickCreateParty";
import { xof, uid } from "@/lib/format";
import { printInvoice, printTicket } from "@/lib/print";
import type { InvoiceLine, InvoiceDoc } from "@/lib/types";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface CartItem extends InvoiceLine { stock: number; }

export default function POS() {
  const s = useStore();
  const session = useCurrentSession();
  const allSessions = usePosSessions();
  const { user } = useAuth();
  const methods = useActivePaymentMethods();

  // Valeurs auto pour l'ouverture de caisse
  const autoCashier = useMemo(() => {
    if (!user?.email) return "";
    return user.email.split("@")[0];
  }, [user]);

  const autoSessionName = useMemo(() => {
    const d = new Date();
    const date = d.toLocaleDateString("fr-FR");
    const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return `Caisse — ${date} ${time}`;
  }, []);

  const autoOpeningBalance = useMemo(() => {
    const lastClosed = allSessions
      .filter((x) => x.status === "closed" && x.closingBalanceCounted != null)
      .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""))[0];
    return lastClosed?.closingBalanceCounted ?? 0;
  }, [allSessions]);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("__all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [partyId, setPartyId] = useState<string>("__none");
  const [quickClient, setQuickClient] = useState(false);
  const [paid, setPaid] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>("especes");

  // Init payMethod sur le 1er moyen actif dispo
  useEffect(() => {
    if (methods.length > 0 && !methods.some((m) => m.code === payMethod)) {
      setPayMethod(methods[0].code);
    }
  }, [methods, payMethod]);

  // Dialogs
  const [openDlg, setOpenDlg] = useState(false);
  const [closeDlg, setCloseDlg] = useState(false);
  const [openName, setOpenName] = useState("");
  const [openCashier, setOpenCashier] = useState("");
  const [openBalance, setOpenBalance] = useState<number>(0);
  const [closeCounted, setCloseCounted] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState("");

  // Pré-remplit le dialogue à chaque ouverture
  useEffect(() => {
    if (openDlg) {
      if (!openName) setOpenName(autoSessionName);
      if (!openCashier) setOpenCashier(autoCashier);
      if (!openBalance) setOpenBalance(autoOpeningBalance);
    }
  }, [openDlg, autoSessionName, autoCashier, autoOpeningBalance]);

  // Ouverture en un clic avec valeurs auto
  const handleQuickOpen = async () => {
    try {
      await openSession({
        name: autoSessionName,
        cashier: autoCashier || undefined,
        openingBalance: autoOpeningBalance,
      });
      toast.success(`Caisse ouverte — solde initial ${xof(autoOpeningBalance)}`);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    s.products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [s.products]);

  const products = s.products.filter((p) => {
    const matchQ = !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase());
    const matchC = cat === "__all" || (p.category ?? "") === cat;
    return matchQ && matchC;
  });

  const clients = s.parties.filter((p) => p.type === "client");

  // Statistiques de la session courante
  const sessionStats = useMemo(() => {
    if (!session) return { count: 0, total: 0, byMethod: {} as Record<string, number>, cashLike: 0 };
    const docs = s.documents.filter((d) => d.posSessionId === session.id && d.status === "payee");
    const total = docs.reduce((sum, d) => sum + d.lines.reduce((ss, l) => ss + l.quantity * l.unitPriceHT * (1 + l.tvaRate / 100), 0), 0);
    const byMethod: Record<string, number> = {};
    docs.forEach((d) => {
      const m = d.paymentMethod ?? "especes";
      const t = d.lines.reduce((ss, l) => ss + l.quantity * l.unitPriceHT * (1 + l.tvaRate / 100), 0);
      byMethod[m] = (byMethod[m] ?? 0) + t;
    });
    // Somme des moyens de type "cash" (espèces et assimilés)
    const cashCodes = new Set(methods.filter((m) => m.kind === "cash").map((m) => m.code));
    if (cashCodes.size === 0) cashCodes.add("especes");
    const cashLike = Object.entries(byMethod)
      .filter(([code]) => cashCodes.has(code))
      .reduce((sum, [, v]) => sum + v, 0);
    return { count: docs.length, total, byMethod, cashLike };
  }, [s.documents, session, methods]);

  const expectedCash = session ? session.openingBalance + (sessionStats.cashLike ?? 0) : 0;

  const addToCart = (productId: string) => {
    const p = s.products.find((x) => x.id === productId);
    if (!p) return;
    setCart((c) => {
      const existing = c.find((x) => x.productId === productId);
      if (existing) {
        if (existing.quantity + 1 > p.stock) { toast.warning(`Stock insuffisant (${p.stock} ${p.unit})`); return c; }
        return c.map((x) => x.productId === productId ? { ...x, quantity: x.quantity + 1 } : x);
      }
      if (p.stock <= 0) { toast.warning("Article en rupture"); return c; }
      return [...c, { id: uid(), productId, description: p.name, quantity: 1, unitPriceHT: p.priceHT, tvaRate: p.tvaRate, stock: p.stock }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((c) => c.flatMap((x) => {
      if (x.id !== id) return [x];
      const next = x.quantity + delta;
      if (next <= 0) return [];
      if (next > x.stock) { toast.warning(`Stock max ${x.stock}`); return [x]; }
      return [{ ...x, quantity: next }];
    }));
  };

  const removeItem = (id: string) => setCart((c) => c.filter((x) => x.id !== id));

  const totals = useMemo(() => {
    const ht = cart.reduce((s, l) => s + l.quantity * l.unitPriceHT, 0);
    const tva = cart.reduce((s, l) => s + l.quantity * l.unitPriceHT * (l.tvaRate / 100), 0);
    return { ht, tva, ttc: ht + tva };
  }, [cart]);

  const change = paid - totals.ttc;

  const handleOpenSession = async () => {
    if (!openName.trim()) return toast.error("Nom de session requis");
    try {
      await openSession({ name: openName.trim(), cashier: openCashier.trim() || undefined, openingBalance: openBalance });
      toast.success("Session de caisse ouverte");
      setOpenDlg(false);
      setOpenName(""); setOpenCashier(""); setOpenBalance(0);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    }
  };

  const handleCloseSession = async () => {
    if (!session) return;
    await closeSession(session.id, { closingBalanceCounted: closeCounted, closingNotes: closeNotes.trim() || undefined });
    const ecart = closeCounted - expectedCash;
    toast.success(`Session fermée — écart caisse : ${xof(ecart)}`);
    setCloseDlg(false);
    setCloseCounted(0); setCloseNotes("");
  };

  const checkout = async (mode: "validate" | "ticket" | "invoice") => {
    if (!session) return toast.error("Ouvrez d'abord une session de caisse");
    if (cart.length === 0) return toast.error("Panier vide");
    const usePartyId = partyId !== "__none" ? partyId : (clients[0]?.id ?? "");
    if (!usePartyId) return toast.error("Créez d'abord un client (au moins un)");

    const number = nextDocNumber("facture");
    const doc: InvoiceDoc = {
      id: uid(), kind: "facture", number, partyId: usePartyId,
      date: new Date().toISOString().slice(0, 10),
      lines: cart.map(({ stock, ...l }) => l),
      status: "payee",
      posSessionId: session.id,
      paymentMethod: payMethod,
      createdAt: new Date().toISOString(),
    };

    await upsertDocument({
      kind: doc.kind, number: doc.number, partyId: doc.partyId, date: doc.date,
      lines: doc.lines, status: doc.status,
      posSessionId: session.id, paymentMethod: payMethod,
    });

    const party = s.parties.find((p) => p.id === usePartyId);
    if (mode === "ticket") printTicket(doc, party);
    else printInvoice(doc, party);

    toast.success(`Vente ${number} validée — ${getPaymentLabel(payMethod)}`);
    setCart([]); setPaid(0);
  };

  // ===== Vue : pas de session =====
  if (!session) {
    return (
      <div className="max-w-3xl mx-auto">
        <PageHeader title="Point de vente" subtitle="Aucune session de caisse ouverte" />
        <div className="bg-card border border-border rounded-xl p-10 text-center space-y-5">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary-soft flex items-center justify-center">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Caisse fermée</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Ouverture en un clic avec : caissier <strong>{autoCashier || "—"}</strong>, solde initial <strong>{xof(autoOpeningBalance)}</strong>
              {autoOpeningBalance > 0 && " (report de la dernière clôture)"}.
            </p>
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button onClick={handleQuickOpen} className="gap-2"><LockOpen className="h-4 w-4" /> Ouvrir directement</Button>
            <Button onClick={() => setOpenDlg(true)} variant="outline" className="gap-2">Modifier les infos…</Button>
            <Button asChild variant="outline" className="gap-2"><Link to="/pos/analyse"><BarChart3 className="h-4 w-4" /> Voir l'analyse</Link></Button>
          </div>
        </div>

        <Dialog open={openDlg} onOpenChange={setOpenDlg}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ouvrir une session de caisse</DialogTitle>
              <DialogDescription>Renseignez le solde initial présent en caisse.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Nom de la session</Label><Input value={openName} onChange={(e) => setOpenName(e.target.value)} placeholder="Ex: Caisse principale — 29/04" /></div>
              <div><Label>Caissier</Label><Input value={openCashier} onChange={(e) => setOpenCashier(e.target.value)} placeholder="Nom du caissier" /></div>
              <div><Label>Solde d'ouverture (FCFA)</Label><Input type="number" value={openBalance || ""} onChange={(e) => setOpenBalance(Number(e.target.value))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenDlg(false)}>Annuler</Button>
              <Button onClick={handleOpenSession}>Ouvrir la session</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ===== Vue : session ouverte =====
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Point de vente</h1>
          <div className="flex items-center gap-2 flex-wrap mt-1.5">
            <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/15"><LockOpen className="h-3 w-3 mr-1" /> Session ouverte</Badge>
            <span className="text-sm text-muted-foreground">{session.name}{session.cashier && ` · ${session.cashier}`}</span>
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> depuis {new Date(session.openedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5"><Link to="/pos/analyse"><BarChart3 className="h-4 w-4" /> Analyse</Link></Button>
          <Button onClick={() => { setCloseCounted(expectedCash); setCloseDlg(true); }} variant="outline" size="sm" className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"><Lock className="h-4 w-4" /> Fermer la caisse</Button>
        </div>
      </div>

      {/* KPIs session */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Ventes session" value={sessionStats.count.toString()} icon={ReceiptText} />
        <KpiCard label="Total encaissé" value={xof(sessionStats.total)} icon={Wallet} highlight />
        <KpiCard label="Solde initial" value={xof(session.openingBalance)} icon={LockOpen} />
        <KpiCard label="Espèces théoriques" value={xof(expectedCash)} icon={Wallet} />
      </div>

      {/* Paiements du jour par catégorie */}
      {sessionStats.count > 0 && (
        <div className="bg-card border border-border rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Paiements reçus aujourd'hui</h3>
            <span className="text-xs text-muted-foreground">{sessionStats.count} ticket(s)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {methods.map((m) => {
              const amt = sessionStats.byMethod[m.code] ?? 0;
              const pct = sessionStats.total > 0 ? (amt / sessionStats.total) * 100 : 0;
              return (
                <div key={m.code} className={`rounded-md border p-2 ${amt > 0 ? "border-primary/30 bg-primary-soft/30" : "border-border bg-muted/20"}`}>
                  <div className="text-[11px] text-muted-foreground truncate">{m.label}</div>
                  <div className={`text-sm font-bold ${amt > 0 ? "text-primary" : "text-muted-foreground"}`}>{xof(amt)}</div>
                  {amt > 0 && <div className="text-[10px] text-muted-foreground">{pct.toFixed(0)}% du total</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4">
        {/* Catalogue */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher article ou SKU…" className="pl-9" />
            </div>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Toutes catégories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {products.map((p) => {
              const out = p.stock <= 0;
              return (
                <button key={p.id} disabled={out} onClick={() => addToCart(p.id)}
                  className="text-left bg-card border border-border rounded-lg overflow-hidden hover:border-primary hover:shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex flex-col">
                  <div className="aspect-square bg-muted/30 flex items-center justify-center overflow-hidden">
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" /> : <ImageIcon className="h-8 w-8 text-muted-foreground/40" />}
                  </div>
                  <div className="p-2.5 flex-1 flex flex-col">
                    <div className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">{p.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">Stock: {p.stock} {p.unit}</div>
                    <div className="mt-1.5 font-semibold text-primary">{xof(p.priceHT)}</div>
                  </div>
                </button>
              );
            })}
            {products.length === 0 && <div className="col-span-full text-center py-12 text-sm text-muted-foreground">Aucun article</div>}
          </div>
        </div>

        {/* Panier */}
        <div className="bg-card border border-border rounded-lg flex flex-col h-[calc(100vh-280px)] sticky top-4">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold"><ShoppingBag className="h-4 w-4" /> Panier ({cart.length})</div>
            {cart.length > 0 && <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-destructive h-7"><X className="h-3.5 w-3.5 mr-1" /> Vider</Button>}
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Sélectionnez des articles à gauche</div>
            ) : (
              <div className="divide-y divide-border">
                {cart.map((l) => (
                  <div key={l.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium flex-1">{l.description}</div>
                      <button onClick={() => removeItem(l.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="text-xs text-muted-foreground">{xof(l.unitPriceHT)} × {l.quantity}</div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(l.id, -1)}><Minus className="h-3 w-3" /></Button>
                        <span className="w-8 text-center text-sm font-medium">{l.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(l.id, +1)}><Plus className="h-3 w-3" /></Button>
                      </div>
                      <div className="font-semibold text-sm">{xof(l.quantity * l.unitPriceHT * (1 + l.tvaRate / 100))}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border p-4 space-y-3 bg-muted/20">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex gap-1">
                <Select value={partyId} onValueChange={setPartyId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Client comptoir</SelectItem>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setQuickClient(true)} title="Nouveau client">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {methods.map((m) => <SelectItem key={m.code} value={m.code}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Sous-total HT</span><span>{xof(totals.ht)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>TVA</span><span>{xof(totals.tva)}</span></div>
              <div className="flex justify-between font-bold text-base pt-1 border-t border-border"><span>TOTAL</span><span className="text-primary">{xof(totals.ttc)}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-2 items-end">
              <div>
                <label className="text-xs text-muted-foreground">Reçu (FCFA)</label>
                <Input type="number" value={paid || ""} onChange={(e) => setPaid(Number(e.target.value))} className="h-9" />
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">À rendre</div>
                <div className={`font-semibold text-lg ${change >= 0 ? "text-success" : "text-destructive"}`}>{xof(Math.max(0, change))}</div>
              </div>
            </div>

            <Button onClick={() => checkout("validate")} disabled={cart.length === 0} className="w-full gap-2 h-11 text-base font-semibold bg-success hover:bg-success/90 text-success-foreground">
              <CheckCircle2 className="h-5 w-5" /> Valider la vente
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => checkout("ticket")} disabled={cart.length === 0} variant="outline" size="sm" className="gap-1.5"><ReceiptText className="h-4 w-4" /> Ticket</Button>
              <Button onClick={() => checkout("invoice")} disabled={cart.length === 0} variant="outline" size="sm" className="gap-1.5"><Printer className="h-4 w-4" /> Facture</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog fermeture */}
      <Dialog open={closeDlg} onOpenChange={setCloseDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fermer la session de caisse</DialogTitle>
            <DialogDescription>Comptez les espèces réellement présentes en caisse.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-1.5 text-sm">
              <Row label="Solde d'ouverture" value={xof(session.openingBalance)} />
              <Row label="Encaissements espèces" value={xof(sessionStats.cashLike)} />
              <Row label="Espèces théoriques" value={xof(expectedCash)} bold />
              <div className="pt-1.5 border-t border-border text-xs text-muted-foreground">
                Total ventes session : <span className="font-medium text-foreground">{xof(sessionStats.total)}</span> · {sessionStats.count} ticket(s)
              </div>
            </div>
            <div>
              <Label>Espèces comptées en caisse (FCFA)</Label>
              <Input type="number" value={closeCounted || ""} onChange={(e) => setCloseCounted(Number(e.target.value))} />
            </div>
            <div className="rounded-md border border-border p-2.5 text-sm flex justify-between items-center">
              <span className="text-muted-foreground">Écart</span>
              <span className={`font-semibold ${closeCounted - expectedCash === 0 ? "text-success" : "text-destructive"}`}>
                {xof(closeCounted - expectedCash)}
              </span>
            </div>
            <div>
              <Label>Notes (optionnel)</Label>
              <Textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} placeholder="Justification d'écart, observations…" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDlg(false)}>Annuler</Button>
            <Button onClick={handleCloseSession} variant="destructive"><Lock className="h-4 w-4 mr-1" /> Fermer la session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuickCreateParty
        open={quickClient}
        onOpenChange={setQuickClient}
        type="client"
        onCreated={(id) => setPartyId(id)}
      />
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, highlight }: { label: string; value: string; icon: any; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "bg-primary-soft border-primary/30" : "bg-card border-border"}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className={`text-lg font-bold mt-1 ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : "text-muted-foreground"}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
