import { useMemo, useRef, useState } from "react";
import { useStore, upsertProduct, deleteProduct } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Plus, Search, Pencil, Trash2, Package, AlertTriangle, Tag, Upload, ImageIcon, X, FileSpreadsheet, Download, FileDown, ChevronDown } from "lucide-react";
import { xof } from "@/lib/format";
import { generateSku } from "@/lib/sku";
import { exportProductsXlsx, downloadTemplateXlsx, parseProductsXlsx, importProductsXlsx, type ImportRow, type ImportResult } from "@/lib/excel";
import type { Product } from "@/lib/types";
import { toast } from "sonner";

export default function ProductsPage() {
  const s = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("__all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);

  // Import Excel
  const fileRef = useRef<HTMLInputElement>(null);
  const [importDlg, setImportDlg] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const onPickXlsx = async (file?: File) => {
    if (!file) return;
    try {
      const rows = await parseProductsXlsx(file);
      if (rows.length === 0) return toast.error("Fichier vide ou format invalide");
      setPreviewRows(rows);
      setImportResult(null);
      setImportDlg(true);
    } catch (e: any) {
      toast.error(e?.message || "Lecture Excel impossible");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const runImport = async () => {
    setImporting(true);
    try {
      const res = await importProductsXlsx(previewRows, s.products);
      setImportResult(res);
      const ok = res.created + res.updated;
      toast.success(`${ok} article(s) importé(s) · ${res.errors.length} erreur(s)`);
    } catch (e: any) {
      toast.error(e?.message || "Échec de l'import");
    } finally {
      setImporting(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image trop lourde (max 5 Mo)");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success("Image téléversée");
    } catch (e: any) {
      toast.error(e.message || "Échec de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    s.products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [s.products]);

  const list = s.products.filter((p) => {
    const matchQ = p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase());
    const matchC = cat === "__all" || (p.category ?? "") === cat;
    return matchQ && matchC;
  });

  const valeurStock = list.reduce((sum, p) => sum + p.stock * p.costHT, 0);
  const valeurVente = list.reduce((sum, p) => sum + p.stock * p.priceHT, 0);

  const openNew = () => { setEditing(null); setImageUrl(undefined); setOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setImageUrl(p.imageUrl); setOpen(true); };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") || "").trim();
    const category = String(f.get("category") || "").trim() || undefined;
    let sku = String(f.get("sku") || "").trim();
    if (!sku) sku = generateSku(s.products, name, category);
    const data = {
      id: editing?.id,
      sku,
      name,
      category,
      imageUrl,
      description: String(f.get("description") || "").trim(),
      costHT: Number(f.get("costHT") || 0),
      priceHT: Number(f.get("priceHT") || 0),
      tvaRate: Number(f.get("tvaRate") || 18),
      stock: Number(f.get("stock") || 0),
      stockAlert: Number(f.get("stockAlert") || 0),
      unit: String(f.get("unit") || "u").trim(),
    };
    if (!data.name) return toast.error("Le nom est requis");
    upsertProduct(data);
    toast.success(editing ? "Produit modifié" : "Produit ajouté");
    setOpen(false);
  };

  const onDelete = (p: Product) => {
    if (!confirm(`Supprimer ${p.name} ?`)) return;
    deleteProduct(p.id);
    toast.success("Supprimé");
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Catalogue produits"
        subtitle={`${list.length} article${list.length > 1 ? "s" : ""} · Valeur stock ${xof(valeurStock)} · Valeur vente ${xof(valeurVente)}`}
        action={<Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nouvel article</Button>}
      />

      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par nom ou SKU…" className="pl-9" />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Toutes les catégories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {list.length === 0 ? (
          <EmptyState
            icon={<Package className="h-5 w-5" />}
            title="Aucun article"
            description="Créez votre premier article."
            action={<Button onClick={openNew} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Ajouter</Button>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left px-5 py-2.5 font-semibold">Article</th>
                <th className="text-left px-5 py-2.5 font-semibold hidden md:table-cell">Catégorie</th>
                <th className="text-left px-5 py-2.5 font-semibold hidden md:table-cell">SKU</th>
                <th className="text-right px-5 py-2.5 font-semibold hidden sm:table-cell">Achat</th>
                <th className="text-right px-5 py-2.5 font-semibold">Vente</th>
                <th className="text-right px-5 py-2.5 font-semibold hidden lg:table-cell">Marge</th>
                <th className="text-right px-5 py-2.5 font-semibold">Stock</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((p) => {
                const low = p.stock <= p.stockAlert;
                const margeUnit = p.priceHT - p.costHT;
                const margePct = p.priceHT > 0 ? (margeUnit / p.priceHT) * 100 : 0;
                return (
                  <tr key={p.id} className="hover:bg-primary-soft/30 transition-colors">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="h-10 w-10 rounded-md object-cover border border-border flex-shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">{p.name}</div>
                          {p.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 hidden md:table-cell">
                      {p.category ? (
                        <span className="odoo-chip bg-accent-soft text-accent"><Tag className="h-3 w-3" />{p.category}</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground hidden md:table-cell font-mono text-xs">{p.sku}</td>
                    <td className="px-5 py-2.5 text-right text-muted-foreground hidden sm:table-cell">{xof(p.costHT)}</td>
                    <td className="px-5 py-2.5 text-right font-medium">{xof(p.priceHT)}</td>
                    <td className="px-5 py-2.5 text-right hidden lg:table-cell">
                      <span className={margeUnit >= 0 ? "text-success" : "text-destructive"}>
                        {xof(margeUnit)} <span className="text-xs text-muted-foreground">({margePct.toFixed(1)}%)</span>
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <span className={`inline-flex items-center gap-1 ${low ? "text-warning font-semibold" : "text-foreground"}`}>
                        {low && <AlertTriangle className="h-3 w-3" />}
                        {p.stock} {p.unit}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(p)}><Trash2 className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? "Modifier l'article" : "Nouvel article"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <div className="relative">
                  <img src={imageUrl} alt="aperçu" className="h-20 w-20 rounded-md object-cover border border-border" />
                  <button type="button" onClick={() => setImageUrl(undefined)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-20 w-20 rounded-md border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <Label htmlFor="image">Photo du produit</Label>
                <div className="mt-1">
                  <input id="image" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                  <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => document.getElementById("image")?.click()} className="gap-2">
                    <Upload className="h-3.5 w-3.5" /> {uploading ? "Envoi…" : imageUrl ? "Changer" : "Téléverser"}
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label htmlFor="name">Nom *</Label>
                <Input id="name" name="name" defaultValue={editing?.name} required />
              </div>
              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" name="sku" defaultValue={editing?.sku} placeholder="Auto" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="category">Catégorie</Label>
                <Input id="category" name="category" defaultValue={editing?.category} list="cat-list" placeholder="Ex: Boissons" />
                <datalist id="cat-list">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <Label htmlFor="unit">Unité</Label>
                <Input id="unit" name="unit" defaultValue={editing?.unit ?? "u"} />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" defaultValue={editing?.description} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="costHT">Coût d'achat</Label>
                <Input id="costHT" name="costHT" type="number" step="1" defaultValue={editing?.costHT ?? 0} />
              </div>
              <div>
                <Label htmlFor="priceHT">Prix de vente</Label>
                <Input id="priceHT" name="priceHT" type="number" step="1" defaultValue={editing?.priceHT ?? 0} />
              </div>
              <div>
                <Label htmlFor="tvaRate">TVA (%)</Label>
                <Input id="tvaRate" name="tvaRate" type="number" step="0.1" defaultValue={editing?.tvaRate ?? 18} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="stock">Stock</Label>
                <Input id="stock" name="stock" type="number" defaultValue={editing?.stock ?? 0} />
              </div>
              <div>
                <Label htmlFor="stockAlert">Seuil alerte</Label>
                <Input id="stockAlert" name="stockAlert" type="number" defaultValue={editing?.stockAlert ?? 0} />
              </div>
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
