import { useRef, useState } from "react";
import { useStore, upsertParty, deleteParty } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Pencil, Trash2, Users, Building2, Mail, Phone, Upload, Download, FileSpreadsheet, BarChart3 } from "lucide-react";
import { xof } from "@/lib/format";
import type { Party, PartyType } from "@/lib/types";
import { toast } from "sonner";
import { exportPartiesXlsx, downloadPartiesTemplateXlsx, parsePartiesXlsx, importPartiesXlsx, type PartyImportRow, type PartyImportResult } from "@/lib/excel";
import { Link } from "react-router-dom";

interface Props { type: PartyType; }

export default function PartiesPage({ type }: Props) {
  const s = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewRows, setPreviewRows] = useState<PartyImportRow[] | null>(null);
  const [importResult, setImportResult] = useState<PartyImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  // Solde dû par tiers : factures (vente) ou achats avec statut "envoyee" (= non payés)
  const balanceOf = (partyId: string) => {
    return s.documents
      .filter((d) => d.partyId === partyId && d.status === "envoyee" && (type === "client" ? d.kind === "facture" : d.kind === "achat"))
      .reduce((sum, d) => sum + d.lines.reduce((ss, l) => ss + l.quantity * l.unitPriceHT * (1 + l.tvaRate / 100), 0), 0);
  };

  const list = s.parties
    .filter((p) => p.type === type)
    .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || (p.email ?? "").toLowerCase().includes(q.toLowerCase()));

  const isClient = type === "client";
  const Icon = isClient ? Users : Building2;
  const title = isClient ? "Clients" : "Fournisseurs";
  const totalBalance = list.reduce((s, p) => s + balanceOf(p.id), 0);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (p: Party) => { setEditing(p); setOpen(true); };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parsePartiesXlsx(file);
      setPreviewRows(rows);
      setImportResult(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Fichier illisible");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const confirmImport = async () => {
    if (!previewRows) return;
    setImporting(true);
    try {
      const res = await importPartiesXlsx(previewRows, s.parties, type);
      setImportResult(res);
      toast.success(`${res.created} créé(s), ${res.updated} mis à jour`);
    } finally {
      setImporting(false);
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      id: editing?.id,
      type,
      name: String(f.get("name") || "").trim(),
      email: String(f.get("email") || "").trim(),
      phone: String(f.get("phone") || "").trim(),
      address: String(f.get("address") || "").trim(),
      ninea: String(f.get("ninea") || "").trim(),
      notes: String(f.get("notes") || "").trim(),
    };
    if (!data.name) return toast.error("Le nom est requis");
    upsertParty(data);
    toast.success(editing ? "Modifications enregistrées" : `${isClient ? "Client" : "Fournisseur"} ajouté`);
    setOpen(false);
  };

  const onDelete = (p: Party) => {
    if (!confirm(`Supprimer ${p.name} ?`)) return;
    deleteParty(p.id);
    toast.success("Supprimé");
  };

  return (
    <div className="max-w-6xl mx-auto">
      <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onPickFile} />
      <PageHeader
        title={title}
        subtitle={`${list.length} ${type}${list.length > 1 ? "s" : ""}${totalBalance > 0 ? ` · Solde dû total : ${xof(totalBalance)}` : ""}`}
        action={
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/comptes-tiers"><BarChart3 className="h-4 w-4" /> Analyse comptes</Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2"><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-2" /> Importer (.xlsx)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportPartiesXlsx(s.parties, type)}><Download className="h-4 w-4 mr-2" /> Exporter</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => downloadPartiesTemplateXlsx(type)}>Télécharger le modèle</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> Nouveau {isClient ? "client" : "fournisseur"}
            </Button>
          </div>
        }
      />

      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="pl-9" />
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {list.length === 0 ? (
          <EmptyState
            icon={<Icon className="h-5 w-5" />}
            title={`Aucun ${type}`}
            description={`Commencez par ajouter votre premier ${type}.`}
            action={<Button onClick={openNew} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Ajouter</Button>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Nom</th>
                <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Contact</th>
                <th className="text-left px-5 py-3 font-medium hidden lg:table-cell">Adresse</th>
                <th className="text-right px-5 py-3 font-medium">{isClient ? "Créance" : "Dette"}</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((p) => {
                const bal = balanceOf(p.id);
                return (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <div className="font-medium">{p.name}</div>
                    {p.ninea && <div className="text-xs text-muted-foreground mt-0.5">NINEA : {p.ninea}</div>}
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">
                    {p.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {p.email}</div>}
                    {p.phone && <div className="flex items-center gap-1.5 mt-0.5"><Phone className="h-3 w-3" /> {p.phone}</div>}
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell text-muted-foreground">{p.address}</td>
                  <td className="px-5 py-3 text-right">
                    {bal > 0 ? <span className={`font-semibold ${isClient ? "text-warning" : "text-destructive"}`}>{xof(bal)}</span> : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(p)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier" : "Nouveau"} {isClient ? "client" : "fournisseur"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nom / Raison sociale *</Label>
              <Input id="name" name="name" defaultValue={editing?.name} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={editing?.email} />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" name="phone" defaultValue={editing?.phone} />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" name="address" defaultValue={editing?.address} />
            </div>
            <div>
              <Label htmlFor="ninea">NINEA</Label>
              <Input id="ninea" name="ninea" defaultValue={editing?.ninea} />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={2} defaultValue={editing?.notes} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit">{editing ? "Enregistrer" : "Créer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewRows} onOpenChange={(o) => { if (!o) { setPreviewRows(null); setImportResult(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aperçu de l'import — {previewRows?.length ?? 0} ligne(s)</DialogTitle>
          </DialogHeader>
          {!importResult ? (
            <>
              <div className="max-h-80 overflow-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs uppercase sticky top-0">
                    <tr>
                      <th className="text-left p-2">Nom</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Téléphone</th>
                      <th className="text-left p-2">NINEA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewRows ?? []).slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{r.name || <span className="text-destructive">vide</span>}</td>
                        <td className="p-2 text-muted-foreground">{r.email}</td>
                        <td className="p-2 text-muted-foreground">{r.phone}</td>
                        <td className="p-2 text-muted-foreground">{r.ninea}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">Les tiers existants (même nom) sont mis à jour automatiquement.</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewRows(null)}>Annuler</Button>
                <Button onClick={confirmImport} disabled={importing}>{importing ? "Import…" : "Confirmer l'import"}</Button>
              </DialogFooter>
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-md border p-3"><div className="text-2xl font-bold text-emerald-600">{importResult.created}</div><div className="text-xs text-muted-foreground">Créés</div></div>
                <div className="rounded-md border p-3"><div className="text-2xl font-bold text-primary">{importResult.updated}</div><div className="text-xs text-muted-foreground">Mis à jour</div></div>
                <div className="rounded-md border p-3"><div className="text-2xl font-bold text-destructive">{importResult.errors.length}</div><div className="text-xs text-muted-foreground">Erreurs</div></div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="max-h-40 overflow-auto border rounded-md p-2 text-xs space-y-1">
                  {importResult.errors.map((e, i) => <div key={i}>Ligne {e.row} : {e.message}</div>)}
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => { setPreviewRows(null); setImportResult(null); }}>Fermer</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
