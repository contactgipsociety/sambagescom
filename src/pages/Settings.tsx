import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Building2, Upload, Save, AlertTriangle, Trash2, ImageIcon, CreditCard, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useCompany, updateCompany, uploadLogo, type CompanySettings } from "@/lib/company";
import { resetDatabase } from "@/lib/reset";
import {
  usePaymentMethods, upsertPaymentMethod, deletePaymentMethod, togglePaymentMethod,
  PAYMENT_KIND_LABELS, type PaymentMethodDef, type PaymentKind,
} from "@/lib/payments";

const MONTHS = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

export default function Settings() {
  const company = useCompany();
  const [form, setForm] = useState<CompanySettings>(company);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setForm(company); }, [company.id, company.name, company.logoUrl]);

  const set = <K extends keyof CompanySettings>(k: K, v: CompanySettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name?.trim()) return toast.error("Le nom de l'entreprise est requis");
    setSaving(true);
    try {
      await updateCompany(form);
      toast.success("Paramètres enregistrés");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const onLogo = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadLogo(file);
      set("logoUrl", url);
      await updateCompany({ ...form, logoUrl: url });
      toast.success("Logo mis à jour");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setUploading(false);
    }
  };

  // Reset DB
  const [resetOpts, setResetOpts] = useState({ documents: true, entries: true, products: false, parties: false });
  const [confirmText, setConfirmText] = useState("");

  const doReset = async () => {
    try {
      await resetDatabase(resetOpts);
      toast.success("Base réinitialisée");
      setConfirmText("");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        subtitle="Informations de l'entreprise, exercice fiscal et maintenance"
      />

      {/* IDENTITÉ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Identité de l'entreprise</CardTitle>
          <CardDescription>Apparaît sur vos factures, devis et tickets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/40 overflow-hidden">
              {form.logoUrl
                ? <img src={form.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm">Logo de l'entreprise</Label>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" disabled={uploading}>
                  <label className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Envoi…" : "Choisir un fichier"}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => onLogo(e.target.files?.[0])} />
                  </label>
                </Button>
                {form.logoUrl && (
                  <Button variant="ghost" size="sm" onClick={() => { set("logoUrl", undefined); updateCompany({ ...form, logoUrl: undefined }); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG ou SVG · max 5 Mo</p>
            </div>
          </div>

          <Separator />

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Raison sociale *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <Label>Forme juridique</Label>
              <Select value={form.legalForm ?? ""} onValueChange={(v) => set("legalForm", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EI">Entreprise individuelle</SelectItem>
                  <SelectItem value="SUARL">SUARL</SelectItem>
                  <SelectItem value="SARL">SARL</SelectItem>
                  <SelectItem value="SA">SA</SelectItem>
                  <SelectItem value="SAS">SAS</SelectItem>
                  <SelectItem value="GIE">GIE</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Adresse</Label>
              <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} placeholder="Ex: Avenue Bourguiba, Lot 12" />
            </div>
            <div>
              <Label>Ville</Label>
              <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} placeholder="Dakar" />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="+221 …" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <Label>Site web</Label>
              <Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} />
            </div>
            <div>
              <Label>NINEA</Label>
              <Input value={form.ninea ?? ""} onChange={(e) => set("ninea", e.target.value)} />
            </div>
            <div>
              <Label>RCCM</Label>
              <Input value={form.rccm ?? ""} onChange={(e) => set("rccm", e.target.value)} placeholder="SN-DKR-2024-…" />
            </div>
            <div>
              <Label>Régime fiscal</Label>
              <Select value={form.taxRegime ?? ""} onValueChange={(v) => set("taxRegime", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Réel normal">Réel normal</SelectItem>
                  <SelectItem value="Réel simplifié">Réel simplifié</SelectItem>
                  <SelectItem value="CGU">Contribution Globale Unique (CGU)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>TVA par défaut (%)</Label>
              <Input type="number" value={form.defaultTva} onChange={(e) => set("defaultTva", Number(e.target.value))} />
            </div>
            <div>
              <Label>Devise</Label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="XOF">FCFA (XOF)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                  <SelectItem value="USD">Dollar (USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Pied de page facture</Label>
              <Textarea
                value={form.invoiceFooter ?? ""}
                onChange={(e) => set("invoiceFooter", e.target.value)}
                placeholder="Conditions de règlement, mentions légales, IBAN…"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EXERCICE FISCAL */}
      <Card>
        <CardHeader>
          <CardTitle>Exercice fiscal</CardTitle>
          <CardDescription>Définissez la durée d'1 an de votre exercice comptable (SYSCOHADA)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Mois de début</Label>
              <Select value={String(form.fiscalYearStartMonth)} onValueChange={(v) => set("fiscalYearStartMonth", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jour de début</Label>
              <Input type="number" min={1} max={31} value={form.fiscalYearStartDay}
                onChange={(e) => set("fiscalYearStartDay", Math.min(31, Math.max(1, Number(e.target.value))))} />
            </div>
            <div>
              <Label>Exercice courant</Label>
              <Input type="number" value={form.currentFiscalYear}
                onChange={(e) => set("currentFiscalYear", Number(e.target.value))} />
            </div>
          </div>
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
            Période actuelle : <strong>du {form.fiscalYearStartDay.toString().padStart(2,"0")}/{form.fiscalYearStartMonth.toString().padStart(2,"0")}/{form.currentFiscalYear}</strong>
            {" "}au{" "}
            <strong>
              {(() => {
                const e = new Date(form.currentFiscalYear + 1, form.fiscalYearStartMonth - 1, form.fiscalYearStartDay);
                e.setDate(e.getDate() - 1);
                return `${String(e.getDate()).padStart(2,"0")}/${String(e.getMonth()+1).padStart(2,"0")}/${e.getFullYear()}`;
              })()}
            </strong>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />{saving ? "Enregistrement…" : "Enregistrer les paramètres"}
        </Button>
      </div>

      {/* MOYENS DE PAIEMENT */}
      <PaymentMethodsCard />

      {/* ZONE DANGER */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />Zone dangereuse
          </CardTitle>
          <CardDescription>Réinitialisation des données métier. Action irréversible.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Données à supprimer</Label>
            <div className="grid sm:grid-cols-2 gap-2">
              {([
                ["documents", "Ventes, achats, devis"],
                ["entries", "Écritures comptables"],
                ["products", "Catalogue produits"],
                ["parties", "Clients & fournisseurs"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 p-2 rounded border hover:bg-muted/40 cursor-pointer">
                  <Checkbox checked={resetOpts[key]} onCheckedChange={(v) => setResetOpts((o) => ({ ...o, [key]: !!v }))} />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={!Object.values(resetOpts).some(Boolean)}>
                <Trash2 className="h-4 w-4 mr-2" />Réinitialiser la base
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la réinitialisation</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action supprimera définitivement les données sélectionnées.
                  Tapez <strong>SUPPRIMER</strong> pour confirmer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="SUPPRIMER" />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmText("")}>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  disabled={confirmText !== "SUPPRIMER"}
                  onClick={doReset}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Confirmer la suppression
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== Moyens de paiement =====================
function PaymentMethodsCard() {
  const methods = usePaymentMethods();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethodDef | null>(null);
  const [form, setForm] = useState<{ code: string; label: string; kind: PaymentKind; isCredit: boolean; accountCode: string; isActive: boolean; sortOrder: number }>({
    code: "", label: "", kind: "cash", isCredit: false, accountCode: "", isActive: true, sortOrder: 99,
  });

  const openNew = () => {
    setEditing(null);
    setForm({ code: "", label: "", kind: "cash", isCredit: false, accountCode: "", isActive: true, sortOrder: (methods.at(-1)?.sortOrder ?? 0) + 1 });
    setOpen(true);
  };
  const openEdit = (m: PaymentMethodDef) => {
    setEditing(m);
    setForm({ code: m.code, label: m.label, kind: m.kind, isCredit: m.isCredit, accountCode: m.accountCode ?? "", isActive: m.isActive, sortOrder: m.sortOrder });
    setOpen(true);
  };
  const save = async () => {
    if (!form.label.trim()) return toast.error("Libellé requis");
    if (!editing && !form.code.trim()) return toast.error("Code requis");
    try {
      await upsertPaymentMethod({
        id: editing?.id,
        code: form.code || form.label,
        label: form.label,
        kind: form.kind,
        isActive: form.isActive,
        isCredit: form.isCredit,
        sortOrder: form.sortOrder,
        accountCode: form.accountCode || undefined,
      });
      toast.success(editing ? "Moyen modifié" : "Moyen ajouté");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    }
  };
  const remove = async (m: PaymentMethodDef) => {
    if (!confirm(`Supprimer « ${m.label} » ? Les ventes existantes garderont leur étiquette.`)) return;
    await deletePaymentMethod(m.id);
    toast.success("Supprimé");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Moyens de paiement</CardTitle>
            <CardDescription>Activez, créez ou désactivez les moyens disponibles sur le POS et les documents</CardDescription>
          </div>
          <Button size="sm" onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />Ajouter</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Libellé</th>
                <th className="text-left px-4 py-2.5 font-medium">Code</th>
                <th className="text-left px-4 py-2.5 font-medium">Type</th>
                <th className="text-left px-4 py-2.5 font-medium">Compte</th>
                <th className="text-center px-4 py-2.5 font-medium">Crédit</th>
                <th className="text-center px-4 py-2.5 font-medium">Actif</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {methods.length === 0 && (
                <tr><td colSpan={7} className="text-center text-sm text-muted-foreground py-6">Aucun moyen de paiement</td></tr>
              )}
              {methods.map((m) => (
                <tr key={m.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium">{m.label}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground font-mono">{m.code}</td>
                  <td className="px-4 py-2"><Badge variant="outline" className="text-xs">{PAYMENT_KIND_LABELS[m.kind]}</Badge></td>
                  <td className="px-4 py-2 text-xs font-mono text-muted-foreground">{m.accountCode ?? "—"}</td>
                  <td className="px-4 py-2 text-center">{m.isCredit ? <Badge className="text-xs bg-warning/15 text-warning border-warning/30">Oui</Badge> : <span className="text-xs text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-2 text-center">
                    <Switch checked={m.isActive} onCheckedChange={(v) => togglePaymentMethod(m.id, v)} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(m)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          💡 Le type <strong>Espèces</strong> est inclus dans le calcul du fond de caisse théorique.
          Le drapeau <strong>Crédit</strong> identifie un règlement différé (compte client / crédit fournisseur).
        </p>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier le moyen de paiement" : "Nouveau moyen de paiement"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Libellé *</Label>
                <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Ex: Free Money" />
              </div>
              <div>
                <Label>Code *</Label>
                <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} disabled={!!editing} placeholder="free_money" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Catégorie</Label>
                <Select value={form.kind} onValueChange={(v) => setForm((f) => ({ ...f, kind: v as PaymentKind }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PAYMENT_KIND_LABELS) as PaymentKind[]).map((k) => (
                      <SelectItem key={k} value={k}>{PAYMENT_KIND_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Compte SYSCOHADA</Label>
                <Input value={form.accountCode} onChange={(e) => setForm((f) => ({ ...f, accountCode: e.target.value }))} placeholder="571 / 521 / 411…" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="cursor-pointer">Règlement à crédit</Label>
                <p className="text-xs text-muted-foreground">Cochez pour les comptes clients / crédits fournisseur</p>
              </div>
              <Switch checked={form.isCredit} onCheckedChange={(v) => setForm((f) => ({ ...f, isCredit: v }))} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="cursor-pointer">Actif</Label>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save}>{editing ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
