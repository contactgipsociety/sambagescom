import { useMemo, useState } from "react";
import { useStore, upsertDocument, nextDocNumber } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Minus, Trash2, ShoppingBag, Printer, ReceiptText, X, ImageIcon, CheckCircle2 } from "lucide-react";
import { xof, uid } from "@/lib/format";
import { printInvoice, printTicket } from "@/lib/print";
import type { InvoiceLine, InvoiceDoc } from "@/lib/types";
import { toast } from "sonner";

interface CartItem extends InvoiceLine { stock: number; }

export default function POS() {
  const s = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("__all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [partyId, setPartyId] = useState<string>("__none");
  const [paid, setPaid] = useState<number>(0);

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

  const addToCart = (productId: string) => {
    const p = s.products.find((x) => x.id === productId);
    if (!p) return;
    setCart((c) => {
      const existing = c.find((x) => x.productId === productId);
      if (existing) {
        if (existing.quantity + 1 > p.stock) {
          toast.warning(`Stock insuffisant (${p.stock} ${p.unit})`);
          return c;
        }
        return c.map((x) => x.productId === productId ? { ...x, quantity: x.quantity + 1 } : x);
      }
      if (p.stock <= 0) {
        toast.warning("Article en rupture");
        return c;
      }
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

  const checkout = async (mode: "validate" | "ticket" | "invoice") => {
    if (cart.length === 0) return toast.error("Panier vide");
    const usePartyId = partyId !== "__none" ? partyId : (clients[0]?.id ?? "");
    if (!usePartyId) return toast.error("Créez d'abord un client (au moins un)");

    const number = nextDocNumber("facture");
    const doc: InvoiceDoc = {
      id: uid(),
      kind: "facture",
      number,
      partyId: usePartyId,
      date: new Date().toISOString().slice(0, 10),
      lines: cart.map(({ stock, ...l }) => l),
      status: "payee",
      createdAt: new Date().toISOString(),
    };

    await upsertDocument({
      kind: doc.kind,
      number: doc.number,
      partyId: doc.partyId,
      date: doc.date,
      lines: doc.lines,
      status: doc.status,
    });

    const party = s.parties.find((p) => p.id === usePartyId);
    if (mode === "ticket") printTicket(doc, party);
    else if (mode === "invoice") printInvoice(doc, party);
    else printInvoice(doc, party); // "validate" → facture auto

    toast.success(`Vente ${number} validée — facture générée`);
    setCart([]);
    setPaid(0);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Point de vente" subtitle="Encaissez rapidement et imprimez tickets ou factures" />

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
                <button
                  key={p.id}
                  disabled={out}
                  onClick={() => addToCart(p.id)}
                  className="text-left bg-card border border-border rounded-lg overflow-hidden hover:border-primary hover:shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex flex-col"
                >
                  <div className="aspect-square bg-muted/30 flex items-center justify-center overflow-hidden">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="p-2.5 flex-1 flex flex-col">
                    <div className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">{p.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">Stock: {p.stock} {p.unit}</div>
                    <div className="mt-1.5 font-semibold text-primary">{xof(p.priceHT)}</div>
                  </div>
                </button>
              );
            })}
            {products.length === 0 && (
              <div className="col-span-full text-center py-12 text-sm text-muted-foreground">Aucun article</div>
            )}
          </div>
        </div>

        {/* Panier */}
        <div className="bg-card border border-border rounded-lg flex flex-col h-[calc(100vh-200px)] sticky top-4">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold"><ShoppingBag className="h-4 w-4" /> Panier ({cart.length})</div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-destructive h-7"><X className="h-3.5 w-3.5 mr-1" /> Vider</Button>
            )}
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
            <Select value={partyId} onValueChange={setPartyId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Client (optionnel)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Client comptoir</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

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

            <Button
              onClick={() => checkout("validate")}
              disabled={cart.length === 0}
              className="w-full gap-2 h-11 text-base font-semibold bg-success hover:bg-success/90 text-success-foreground"
            >
              <CheckCircle2 className="h-5 w-5" /> Valider la vente
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => checkout("ticket")} disabled={cart.length === 0} variant="outline" size="sm" className="gap-1.5"><ReceiptText className="h-4 w-4" /> Ticket</Button>
              <Button onClick={() => checkout("invoice")} disabled={cart.length === 0} variant="outline" size="sm" className="gap-1.5"><Printer className="h-4 w-4" /> Facture</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
