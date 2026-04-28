import { useState } from "react";
import { useStore, upsertDocument, deleteDocument, setDocStatus, nextDocNumber } from "@/lib/store";
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
import { Plus, Pencil, Trash2, FileText, Receipt, MoreHorizontal, Trash } from "lucide-react";
import { eur, dateFr, docTotals, uid } from "@/lib/format";
import type { InvoiceDoc, InvoiceLine, DocKind, InvoiceStatus } from "@/lib/types";
import { toast } from "sonner";

interface Props { kind: DocKind; }

const emptyLine = (): InvoiceLine => ({ id: uid(), description: "", quantity: 1, unitPriceHT: 0, tvaRate: 20 });

export default function DocumentsPage({ kind }: Props) {
  const s = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceDoc | null>(null);

  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([emptyLine()]);

  const list = s.documents.filter((d) => d.kind === kind).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const clients = s.parties.filter((p) => p.type === "client");

  const isDevis = kind === "devis";
  const title = isDevis ? "Devis" : "Factures";
  const Icon = isDevis ? FileText : Receipt;

  const openNew = () => {
    setEditing(null);
    setClientId(clients[0]?.id ?? "");
    setDate(new Date().toISOString().slice(0, 10));
    setDueDate("");
    setNotes("");
    setLines([emptyLine()]);
    setOpen(true);
  };

  const openEdit = (d: InvoiceDoc) => {
    setEditing(d);
    setClientId(d.clientId);
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
    updateLine(i, { productId, description: p.name, unitPriceHT: p.priceHT, tvaRate: p.tvaRate });
  };

  const totals = (() => {
    const ht = lines.reduce((sum, l) => sum + l.quantity * l.unitPriceHT, 0);
    const tva = lines.reduce((sum, l) => sum + l.quantity * l.unitPriceHT * (l.tvaRate / 100), 0);
    return { ht, tva, ttc: ht + tva };
  })();

  const onSubmit = () => {
    if (!clientId) return toast.error("Sélectionnez un client");
    if (lines.every((l) => !l.description.trim())) return toast.error("Ajoutez au moins une ligne");
    upsertDocument({
      id: editing?.id,
      kind,
      number: editing?.number ?? nextDocNumber(kind),
      clientId,
      date,
      dueDate: dueDate || undefined,
      lines: lines.filter((l) => l.description.trim()),
      status: editing?.status ?? "brouillon",
      notes,
    });
    toast.success(editing ? "Document modifié" : `${isDevis ? "Devis" : "Facture"} créé(e)`);
    setOpen(false);
  };

  const onDelete = (d: InvoiceDoc) => {
    if (!confirm(`Supprimer ${d.number} ?`)) return;
    deleteDocument(d.id);
    toast.success("Supprimé");
  };

  const statusOptions: InvoiceStatus[] = ["brouillon", "envoyee", "payee", "annulee"];

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title={title}
        subtitle={`${list.length} document${list.length > 1 ? "s" : ""}`}
        action={<Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> {isDevis ? "Nouveau devis" : "Nouvelle facture"}</Button>}
      />

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {list.length === 0 ? (
          <EmptyState
            icon={<Icon className="h-5 w-5" />}
            title={`Aucun ${isDevis ? "devis" : "facture"}`}
            description={clients.length === 0 ? "Ajoutez d'abord un client." : `Créez votre premier ${isDevis ? "devis" : "facture"}.`}
            action={clients.length > 0 ? <Button onClick={openNew} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Créer</Button> : undefined}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-medium">N°</th>
                <th className="text-left px-5 py-3 font-medium">Client</th>
                <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Date</th>
                <th className="text-right px-5 py-3 font-medium">Total TTC</th>
                <th className="text-left px-5 py-3 font-medium">Statut</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((d) => {
                const client = s.parties.find((p) => p.id === d.clientId);
                const t = docTotals(d);
                return (
                  <tr key={d.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono text-xs">{d.number}</td>
                    <td className="px-5 py-3 font-medium">{client?.name ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{dateFr(d.date)}</td>
                    <td className="px-5 py-3 text-right font-medium">{eur(t.ttc)}</td>
                    <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-5 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(d)}><Pencil className="h-4 w-4 mr-2" /> Modifier</DropdownMenuItem>
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
            <DialogTitle>{editing ? `Modifier ${editing.number}` : (isDevis ? "Nouveau devis" : "Nouvelle facture")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1">
                <Label>Client *</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une ligne
                </Button>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Description</th>
                      <th className="text-right px-2 py-2 font-medium w-20">Qté</th>
                      <th className="text-right px-2 py-2 font-medium w-28">PU HT</th>
                      <th className="text-right px-2 py-2 font-medium w-20">TVA %</th>
                      <th className="text-right px-3 py-2 font-medium w-28">Total HT</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lines.map((l, i) => (
                      <tr key={l.id}>
                        <td className="px-2 py-1.5">
                          <div className="flex gap-1">
                            <Select value={l.productId ?? ""} onValueChange={(v) => onPickProduct(i, v)}>
                              <SelectTrigger className="w-32 h-9 text-xs"><SelectValue placeholder="Produit…" /></SelectTrigger>
                              <SelectContent>
                                {s.products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input className="h-9" value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} placeholder="Description" />
                          </div>
                        </td>
                        <td className="px-1 py-1.5"><Input className="h-9 text-right" type="number" step="0.01" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} /></td>
                        <td className="px-1 py-1.5"><Input className="h-9 text-right" type="number" step="0.01" value={l.unitPriceHT} onChange={(e) => updateLine(i, { unitPriceHT: Number(e.target.value) })} /></td>
                        <td className="px-1 py-1.5"><Input className="h-9 text-right" type="number" step="0.1" value={l.tvaRate} onChange={(e) => updateLine(i, { tvaRate: Number(e.target.value) })} /></td>
                        <td className="px-3 py-1.5 text-right font-medium">{eur(l.quantity * l.unitPriceHT)}</td>
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
            </div>

            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Total HT</span><span>{eur(totals.ht)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>TVA</span><span>{eur(totals.tva)}</span></div>
                <div className="flex justify-between font-semibold text-base pt-1.5 border-t border-border"><span>Total TTC</span><span>{eur(totals.ttc)}</span></div>
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
