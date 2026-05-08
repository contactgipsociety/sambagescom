import { useState } from "react";
import { upsertParty } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { PartyType } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  type: PartyType;
  onCreated?: (id: string) => void;
  initialName?: string;
}

export function QuickCreateParty({ open, onOpenChange, type, onCreated, initialName }: Props) {
  const [name, setName] = useState(initialName ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(""); setPhone(""); setEmail(""); setAddress(""); };

  const submit = async () => {
    if (!name.trim()) return toast.error("Le nom est requis");
    setSaving(true);
    try {
      const id = await upsertParty({ type, name: name.trim(), phone, email, address });
      toast.success(type === "client" ? "Client créé" : "Fournisseur créé");
      if (id) onCreated?.(id);
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const label = type === "client" ? "client" : "fournisseur";
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau {label}</DialogTitle>
          <DialogDescription>Création rapide depuis le document.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nom *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Téléphone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Adresse</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
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
