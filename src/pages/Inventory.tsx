import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Boxes, AlertTriangle, TrendingUp, ArrowUpRight, ArrowDownRight, Layers } from "lucide-react";
import { xof, dateFr } from "@/lib/format";
import type { Product, InvoiceDoc } from "@/lib/types";
import { Link } from "react-router-dom";

interface ProductMovement {
  date: string;
  kind: "in" | "out";
  qty: number;
  doc: InvoiceDoc;
}

function buildMovements(productId: string, docs: InvoiceDoc[]): ProductMovement[] {
  const counted = docs.filter((d) => d.status !== "brouillon" && d.status !== "annulee");
  const moves: ProductMovement[] = [];
  counted.forEach((d) => {
    d.lines.forEach((l) => {
      if (l.productId !== productId) return;
      moves.push({
        date: d.date,
        kind: d.kind === "achat" ? "in" : "out",
        qty: l.quantity,
        doc: d,
      });
    });
  });
  return moves.sort((a, b) => b.date.localeCompare(a.date));
}

export default function Inventory() {
  const s = useStore();
  const [q, setQ] = useState("");

  // Stats globales
  const valeurAchat = s.products.reduce((sum, p) => sum + p.stock * p.costHT, 0);
  const valeurVente = s.products.reduce((sum, p) => sum + p.stock * p.priceHT, 0);
  const margePotentielle = valeurVente - valeurAchat;
  const totalArticles = s.products.length;
  const totalUnites = s.products.reduce((s2, p) => s2 + p.stock, 0);
  const alerts = s.products.filter((p) => p.stock <= p.stockAlert);

  // Groupé par catégorie
  const byCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    s.products.forEach((p) => {
      const k = p.category || "Sans catégorie";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    });
    return Array.from(map.entries())
      .map(([name, items]) => {
        const stockUnits = items.reduce((sum, p) => sum + p.stock, 0);
        const valAchat = items.reduce((sum, p) => sum + p.stock * p.costHT, 0);
        const valVente = items.reduce((sum, p) => sum + p.stock * p.priceHT, 0);
        const lowCount = items.filter((p) => p.stock <= p.stockAlert).length;
        return { name, items, stockUnits, valAchat, valVente, lowCount };
      })
      .sort((a, b) => b.valAchat - a.valAchat);
  }, [s.products]);

  const filteredProducts = s.products.filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()) || (p.category ?? "").toLowerCase().includes(q.toLowerCase())
  );

  const stats = [
    { label: "Articles référencés", value: totalArticles.toString(), icon: Boxes, color: "text-primary", bg: "bg-primary-soft" },
    { label: "Unités en stock", value: totalUnites.toLocaleString("fr-FR"), icon: Layers, color: "text-accent", bg: "bg-accent-soft" },
    { label: "Valeur stock (coût)", value: xof(valeurAchat), icon: TrendingUp, color: "text-foreground", bg: "bg-muted" },
    { label: "Marge potentielle", value: xof(margePotentielle), icon: ArrowUpRight, color: "text-success", bg: "bg-success-soft" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Inventaire"
        subtitle="Suivi détaillé du stock par produit et par catégorie"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((st) => (
          <div key={st.label} className="stat-card">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{st.label}</p>
                <p className={`text-lg lg:text-xl font-semibold mt-1.5 ${st.color} truncate`}>{st.value}</p>
              </div>
              <div className={`h-8 w-8 rounded-md ${st.bg} flex items-center justify-center shrink-0`}>
                <st.icon className={`h-4 w-4 ${st.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {alerts.length > 0 && (
        <div className="mb-4 bg-warning-soft border border-warning/30 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <div className="text-sm flex-1">
            <span className="font-semibold text-warning">{alerts.length} article{alerts.length > 1 ? "s" : ""}</span>
            <span className="text-muted-foreground"> sous le seuil d'alerte</span>
          </div>
        </div>
      )}

      <Tabs defaultValue="produits" className="w-full">
        <TabsList className="bg-card border border-border h-10 p-1">
          <TabsTrigger value="produits" className="data-[state=active]:bg-primary-soft data-[state=active]:text-primary">Par produit</TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-primary-soft data-[state=active]:text-primary">Par catégorie</TabsTrigger>
          <TabsTrigger value="alertes" className="data-[state=active]:bg-primary-soft data-[state=active]:text-primary">
            Alertes {alerts.length > 0 && <span className="ml-1.5 text-[10px] bg-warning text-warning-foreground rounded-full px-1.5 py-0.5">{alerts.length}</span>}
          </TabsTrigger>
        </TabsList>

        {/* PAR PRODUIT */}
        <TabsContent value="produits" className="mt-4 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un article…" className="pl-9 h-9" />
          </div>

          <div className="space-y-3">
            {filteredProducts.length === 0 ? (
              <div className="text-sm text-muted-foreground bg-card border border-border rounded-lg p-8 text-center">
                Aucun article. <Link to="/catalogue" className="text-primary underline">Ajouter un article</Link>
              </div>
            ) : filteredProducts.map((p) => {
              const moves = buildMovements(p.id, s.documents);
              const totalIn = moves.filter((m) => m.kind === "in").reduce((s2, m) => s2 + m.qty, 0);
              const totalOut = moves.filter((m) => m.kind === "out").reduce((s2, m) => s2 + m.qty, 0);
              const low = p.stock <= p.stockAlert;
              return (
                <details key={p.id} className="group bg-card border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-colors">
                  <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-4 hover:bg-muted/30">
                    <div className="h-10 w-10 rounded-md bg-primary-soft flex items-center justify-center text-primary font-mono text-[11px] shrink-0">
                      {p.sku.slice(-3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{p.name}</span>
                        {p.category && <span className="odoo-chip bg-accent-soft text-accent shrink-0">{p.category}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{p.sku}</div>
                    </div>
                    <div className="hidden md:flex items-center gap-1 text-xs">
                      <span className="text-success flex items-center gap-0.5"><ArrowDownRight className="h-3 w-3" />{totalIn}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-destructive flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3" />{totalOut}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-base font-semibold ${low ? "text-warning" : "text-foreground"}`}>
                        {p.stock} <span className="text-xs font-normal text-muted-foreground">{p.unit}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">{xof(p.stock * p.costHT)}</div>
                    </div>
                  </summary>

                  <div className="border-t border-border bg-muted/20 p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                      <div><div className="text-[11px] text-muted-foreground uppercase">Coût unit.</div><div className="font-medium">{xof(p.costHT)}</div></div>
                      <div><div className="text-[11px] text-muted-foreground uppercase">Vente unit.</div><div className="font-medium">{xof(p.priceHT)}</div></div>
                      <div><div className="text-[11px] text-muted-foreground uppercase">Marge unit.</div><div className="font-medium text-success">{xof(p.priceHT - p.costHT)}</div></div>
                      <div><div className="text-[11px] text-muted-foreground uppercase">Seuil alerte</div><div className="font-medium">{p.stockAlert} {p.unit}</div></div>
                    </div>

                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Mouvements de stock</div>
                    {moves.length === 0 ? (
                      <div className="text-xs text-muted-foreground italic">Aucun mouvement enregistré.</div>
                    ) : (
                      <div className="bg-card border border-border rounded-md overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/40 text-muted-foreground">
                            <tr>
                              <th className="text-left px-3 py-1.5 font-medium">Date</th>
                              <th className="text-left px-3 py-1.5 font-medium">Document</th>
                              <th className="text-left px-3 py-1.5 font-medium">Type</th>
                              <th className="text-right px-3 py-1.5 font-medium">Qté</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {moves.slice(0, 10).map((m, i) => (
                              <tr key={i}>
                                <td className="px-3 py-1.5 text-muted-foreground">{dateFr(m.date)}</td>
                                <td className="px-3 py-1.5 font-mono">{m.doc.number}</td>
                                <td className="px-3 py-1.5">
                                  {m.kind === "in" ? (
                                    <span className="odoo-chip bg-success-soft text-success"><ArrowDownRight className="h-3 w-3" />Entrée</span>
                                  ) : (
                                    <span className="odoo-chip bg-destructive-soft text-destructive"><ArrowUpRight className="h-3 w-3" />Sortie</span>
                                  )}
                                </td>
                                <td className={`px-3 py-1.5 text-right font-semibold ${m.kind === "in" ? "text-success" : "text-destructive"}`}>
                                  {m.kind === "in" ? "+" : "−"}{m.qty}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </TabsContent>

        {/* PAR CATÉGORIE */}
        <TabsContent value="categories" className="mt-4 space-y-3">
          {byCategory.length === 0 ? (
            <div className="text-sm text-muted-foreground bg-card border border-border rounded-lg p-8 text-center">Aucune catégorie.</div>
          ) : byCategory.map((c) => (
            <details key={c.name} className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-colors" open>
              <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-4 hover:bg-muted/30">
                <div className="h-10 w-10 rounded-md bg-accent-soft flex items-center justify-center text-accent shrink-0">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.items.length} article{c.items.length > 1 ? "s" : ""} · {c.stockUnits} unités
                    {c.lowCount > 0 && <span className="text-warning ml-2">⚠ {c.lowCount} en alerte</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-semibold">{xof(c.valAchat)}</div>
                  <div className="text-[11px] text-muted-foreground">vente : {xof(c.valVente)}</div>
                </div>
              </summary>
              <div className="border-t border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold">Article</th>
                      <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">SKU</th>
                      <th className="text-right px-4 py-2 font-semibold">Stock</th>
                      <th className="text-right px-4 py-2 font-semibold hidden sm:table-cell">Coût</th>
                      <th className="text-right px-4 py-2 font-semibold">Valeur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {c.items.map((p) => {
                      const low = p.stock <= p.stockAlert;
                      return (
                        <tr key={p.id} className="hover:bg-primary-soft/30">
                          <td className="px-4 py-2 font-medium">{p.name}</td>
                          <td className="px-4 py-2 text-muted-foreground hidden md:table-cell font-mono text-xs">{p.sku}</td>
                          <td className="px-4 py-2 text-right">
                            <span className={low ? "text-warning font-semibold" : ""}>{p.stock} {p.unit}</span>
                          </td>
                          <td className="px-4 py-2 text-right text-muted-foreground hidden sm:table-cell">{xof(p.costHT)}</td>
                          <td className="px-4 py-2 text-right font-medium">{xof(p.stock * p.costHT)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </TabsContent>

        {/* ALERTES */}
        <TabsContent value="alertes" className="mt-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Boxes className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Tous les stocks sont au-dessus du seuil 🎉
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-2.5 font-semibold">Article</th>
                    <th className="text-left px-5 py-2.5 font-semibold hidden md:table-cell">Catégorie</th>
                    <th className="text-right px-5 py-2.5 font-semibold">Stock</th>
                    <th className="text-right px-5 py-2.5 font-semibold">Seuil</th>
                    <th className="text-right px-5 py-2.5 font-semibold">À recommander</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {alerts.map((p) => (
                    <tr key={p.id} className="hover:bg-warning-soft/30">
                      <td className="px-5 py-2.5 font-medium">{p.name}</td>
                      <td className="px-5 py-2.5 hidden md:table-cell">
                        {p.category ? <span className="odoo-chip bg-accent-soft text-accent">{p.category}</span> : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-right text-warning font-semibold">{p.stock} {p.unit}</td>
                      <td className="px-5 py-2.5 text-right text-muted-foreground">{p.stockAlert} {p.unit}</td>
                      <td className="px-5 py-2.5 text-right font-semibold">{Math.max(0, p.stockAlert * 2 - p.stock)} {p.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
