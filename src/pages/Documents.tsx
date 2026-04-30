import { useState } from "react";
import { useStore, upsertDocument, deleteDocument, setDocStatus, nextDocNumber } from "@/lib/store";
import { useActivePaymentMethods, getPaymentLabel } from "@/lib/payments";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, FileText, Receipt, ShoppingCart, MoreHorizontal, Trash, Printer, ReceiptText } from "lucide-react";
import { xof, dateFr, docTotals, uid } from "@/lib/format";
import { printInvoice, printTicket } from "@/lib/print";
import type { InvoiceDoc, InvoiceLine, DocKind, InvoiceStatus } from "@/lib/types";
import { toast } from "sonner";

interface Props { kind: DocKind; }

const emptyLine = (): InvoiceLine => ({ id: uid(), description: "", quantity: 1, unitPriceHT: 0, tvaRate: 18 });

const config = {
  devis: { title: "Devis", singular: "devis", icon: FileText, party: "client" as const, partyLabel: "Client" },
  facture: { title: "Ventes / Factures", singular: "facture", icon: Receipt, party: "client" as const, partyLabel: "Client" },
  achat: { title: "Achats", singular: "achat", icon: ShoppingCart, party: "fournisseur" as const, partyLabel: "Fournisseur" },
};

export default function DocumentsPage({ kind }: Props) {
  const s = useStore();
  const methods = useActivePaymentMethods();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceDoc | null>(null);

  const [partyId, setPartyId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [lines, setLines] = useState<InvoiceLine[]>([emptyLine()]);

  const cfg = config[kind];
  const list = s.documents.filter((d) => d.kind === kind).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const parties = s.parties.filter((p) => p.type === cfg.party);

  const openNew = () => {
    setEditing(null);
    setPartyId(parties[0]?.id ?? "");
    setDate(new Date().toISOString().slice(0, 10));
    setDueDate("");
    setNotes("");
    setLines([emptyLine()]);
    setOpen(true);
  };

  const openEdit = (d: InvoiceDoc) => {
    setEditing(d);
    setPartyId(d.partyId);
    setDate(d.date);
    setDueDate(d.dueDate ?? "");
    setNotes(d.notes ?? "");
    setLines(d.lines.length ? d.lines : [emptyLine()]);
    setOpen(true);
  };

  const updateLine = (i: number, patch: Partial<InvoiceLine>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const onPickProduct = (i: number, productId: string) => {
    const p = s.products.find((x) => x.id === productId);
    if (!p) return;
    // pour un achat on pré-remplit avec le coût, pour vente avec le prix
    const unitPrice = kind === "achat" ? p.costHT : p.priceHT;
    updateLine(i, { productId, description: p.name, unitPriceHT: unitPrice, tvaRate: p.tvaRate });
  };

  const totals = (() => {
    const ht = lines.reduce((sum, l) => sum + l.quantity * l.unitPriceHT, 0);
    const tva = lines.reduce((sum, l) => sum + l.quantity * l.unitPriceHT * (l.tvaRate / 100), 0);
    return { ht, tva, ttc: ht + tva };
  })();

  const onSubmit = () => {
    if (!partyId) return toast.error(`Sélectionnez un ${cfg.party}`);
    if (lines.every((l) => !l.description.trim())) return toast.error("Ajoutez au moins une ligne");
    upsertDocument({
      id: editing?.id,
      kind,
      number: editing?.number ?? nextDocNumber(kind),
      partyId,
      date,
      dueDate: dueDate || undefined,
      lines: lines.filter((l) => l.description.trim()),
      status: editing?.status ?? "brouillon",
      notes,
    });
    toast.success(editing ? "Document modifié" : `${cfg.title.split(" ")[0]} créé(e)`);
    setOpen(false);
  };

  const onDelete = (d: InvoiceDoc) => {
    if (!confirm(`Supprimer ${d.number} ?`)) return;
    deleteDocument(d.id);
    toast.success("Supprimé");
  };

  const statusOptions: InvoiceStatus[] = ["brouillon", "envoyee", "payee", "annulee"];
  const Icon = cfg.icon;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title={cfg.title}
        subtitle={`${list.length} document${list.length > 1 ? "s" : ""} · Mouvements de stock automatiques`}
        action={<Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nouveau {cfg.singular}</Button>}
      />

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {list.length === 0 ? (
          <EmptyState
            icon={<Icon className="h-5 w-5" />}
            title={`Aucun ${cfg.singular}`}
            description={parties.length === 0 ? `Ajoutez d'abord un ${cfg.party}.` : `Créez votre premier ${cfg.singular}.`}
            action={parties.length > 0 ? <Button onClick={openNew} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Créer</Button> : undefined}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-medium">N°</th>
                <th className="text-left px-5 py-3 font-medium">{cfg.partyLabel}</th>
                <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Date</th>
                <th className="text-right px-5 py-3 font-medium">Total TTC</th>
                <th className="text-left px-5 py-3 font-medium">Statut</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((d) => {
                const party = s.parties.find((p) => p.id === d.partyId);
                const t = docTotals(d);
                return (
                  <tr key={d.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono text-xs">{d.number}</td>
                    <td className="px-5 py-3 font-medium">{party?.name ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{dateFr(d.date)}</td>
                    <td className="px-5 py-3 text-right font-medium">{xof(t.ttc)}</td>
                    <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-5 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(d)}><Pencil className="h-4 w-4 mr-2" /> Modifier</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => printInvoice(d, party)}><Printer className="h-4 w-4 mr-2" /> Imprimer (A4)</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => printTicket(d, party)}><ReceiptText className="h-4 w-4 mr-2" /> Ticket (80mm)</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {statusOptions.map((st) => (
                            <DropdownMenuItem key={st} onClick={() => setDocStatus(d.id, st)} disabled={d.status === st}>
                              Marquer comme {st}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => onDelete(d)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Modifier ${editing.number}` : `Nouveau ${cfg.singular}`}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1">
                <Label>{cfg.partyLabel} *</Label>
                <Select value={partyId} onValueChange={setPartyId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                  <SelectContent>
                    {parties.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label>Échéance</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Lignes</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                </Button>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Article / Description</th>
                      <th className="text-right px-2 py-2 font-medium w-20">Qté</th>
                      <th className="text-right px-2 py-2 font-medium w-28">PU HT</th>
                      <th className="text-right px-2 py-2 font-medium w-20">TVA %</th>
                      <th className="text-right px-3 py-2 font-medium w-32">Total HT</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lines.map((l, i) => (
                      <tr key={l.id}>
                        <td className="px-2 py-1.5">
                          <div className="flex gap-1">
                            <Select value={l.productId ?? ""} onValueChange={(v) => onPickProduct(i, v)}>
                              <SelectTrigger className="w-32 h-9 text-xs"><SelectValue placeholder="Article…" /></SelectTrigger>
                              <SelectContent>
                                {s.products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input className="h-9" value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} placeholder="Description" />
                          </div>
                        </td>
                        <td className="px-1 py-1.5"><Input className="h-9 text-right" type="number" step="0.01" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} /></td>
                        <td className="px-1 py-1.5"><Input className="h-9 text-right" type="number" step="1" value={l.unitPriceHT} onChange={(e) => updateLine(i, { unitPriceHT: Number(e.target.value) })} /></td>
                        <td className="px-1 py-1.5"><Input className="h-9 text-right" type="number" step="0.1" value={l.tvaRate} onChange={(e) => updateLine(i, { tvaRate: Number(e.target.value) })} /></td>
                        <td className="px-3 py-1.5 text-right font-medium">{xof(l.quantity * l.unitPriceHT)}</td>
                        <td className="px-1">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} disabled={lines.length === 1}>
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Le stock est mis à jour automatiquement quand le statut passe à <strong>envoyée</strong> ou <strong>payée</strong>.
              </p>
            </div>

            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Total HT</span><span>{xof(totals.ht)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>TVA</span><span>{xof(totals.tva)}</span></div>
                <div className="flex justify-between font-semibold text-base pt-1.5 border-t border-border"><span>Total TTC</span><span>{xof(totals.ttc)}</span></div>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Conditions de règlement, mentions légales…" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={onSubmit}>{editing ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
