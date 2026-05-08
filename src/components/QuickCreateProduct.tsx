import { useState } from "react";
import { useStore, upsertProduct } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { generateSku } from "@/lib/sku";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (id: string) => void;
  initialName?: string;
}

export function QuickCreateProduct({ open, onOpenChange, onCreated, initialName }: Props) {
  const s = useStore();
  const [name, setName] = useState(initialName ?? "");
  const [category, setCategory] = useState("");
  const [priceHT, setPriceHT] = useState<number>(0);
  const [costHT, setCostHT] = useState<number>(0);
  const [tvaRate, setTvaRate] = useState<number>(18);
  const [stock, setStock] = useState<number>(0);
  const [unit, setUnit] = useState("u");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(""); setCategory(""); setPriceHT(0); setCostHT(0);
    setTvaRate(18); setStock(0); setUnit("u");
  };

  const submit = async () => {
    if (!name.trim()) return toast.error("Le nom est requis");
    setSaving(true);
    try {
      const sku = generateSku(s.products, name, category);
      const id = await upsertProduct({
        sku, name: name.trim(), category, costHT, priceHT, tvaRate,
        stock, stockAlert: 0, unit,
      });
      toast.success("Article créé");
      if (id) onCreated?.(id);
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvel article</DialogTitle>
          <DialogDescription>Création rapide depuis le document.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nom *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Catégorie</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div>
              <Label>Unité</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Prix achat HT</Label>
              <Input type="number" value={costHT} onChange={(e) => setCostHT(Number(e.target.value))} />
            </div>
            <div>
              <Label>Prix vente HT</Label>
              <Input type="number" value={priceHT} onChange={(e) => setPriceHT(Number(e.target.value))} />
            </div>
            <div>
              <Label>TVA %</Label>
              <Input type="number" value={tvaRate} onChange={(e) => setTvaRate(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label>Stock initial</Label>
            <Input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "..." : "Créer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
