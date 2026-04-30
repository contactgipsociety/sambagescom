import { useState } from "react";
import { useStore, upsertParty, deleteParty } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Users, Building2, Mail, Phone } from "lucide-react";
import { xof } from "@/lib/format";
import type { Party, PartyType } from "@/lib/types";
import { toast } from "sonner";

interface Props { type: PartyType; }

export default function PartiesPage({ type }: Props) {
  const s = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);

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
      <PageHeader
        title={title}
        subtitle={`${list.length} ${type}${list.length > 1 ? "s" : ""}`}
        action={
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Nouveau {isClient ? "client" : "fournisseur"}
          </Button>
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
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((p) => (
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
              ))}
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
    </div>
  );
}
