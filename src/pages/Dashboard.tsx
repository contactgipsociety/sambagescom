import { useStore } from "@/lib/store";
import { xof, docTotals } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { TrendingUp, ShoppingCart, Wallet, Package, AlertTriangle, Receipt, FileText, Percent } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";

export default function Dashboard() {
  const s = useStore();

  const ventesValides = s.documents.filter((d) => d.kind === "facture" && (d.status === "envoyee" || d.status === "payee"));
  const achatsValides = s.documents.filter((d) => d.kind === "achat" && (d.status === "envoyee" || d.status === "payee"));

  const caHT = ventesValides.reduce((sum, f) => sum + docTotals(f).ht, 0);
  const caEncaisse = ventesValides.filter((f) => f.status === "payee").reduce((sum, f) => sum + docTotals(f).ttc, 0);
  const caEnAttente = ventesValides.filter((f) => f.status === "envoyee").reduce((sum, f) => sum + docTotals(f).ttc, 0);
  const totalAchatsHT = achatsValides.reduce((sum, f) => sum + docTotals(f).ht, 0);

  // Coût des marchandises vendues : pour chaque ligne de vente, qty × coût d'achat actuel du produit
  const coutMarchVendues = ventesValides.reduce((sum, doc) => {
    return sum + doc.lines.reduce((s2, l) => {
      const p = l.productId ? memoryProduct(l.productId) : undefined;
      return s2 + (p ? l.quantity * p.costHT : 0);
    }, 0);
  }, 0);

  function memoryProduct(id: string) { return s.products.find((p) => p.id === id); }

  const margeBrute = caHT - coutMarchVendues;
  const margePct = caHT > 0 ? (margeBrute / caHT) * 100 : 0;

  const valeurStock = s.products.reduce((sum, p) => sum + p.stock * p.costHT, 0);
  const stockAlerts = s.products.filter((p) => p.stock <= p.stockAlert);

  const stats = [
    { label: "CA encaissé", value: xof(caEncaisse), icon: Wallet, accent: "text-success", soft: "bg-success-soft" },
    { label: "À encaisser", value: xof(caEnAttente), icon: Receipt, accent: "text-accent", soft: "bg-accent-soft" },
    { label: "Total achats", value: xof(totalAchatsHT), icon: ShoppingCart, accent: "text-foreground", soft: "bg-muted" },
    { label: "Marge brute", value: xof(margeBrute), sub: `${margePct.toFixed(1)}%`, icon: Percent, accent: margeBrute >= 0 ? "text-success" : "text-destructive", soft: margeBrute >= 0 ? "bg-success-soft" : "bg-destructive-soft" },
  ];

  const recent = [...s.documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de votre activité commerciale" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
                <p className={`text-xl lg:text-2xl font-semibold mt-2 ${stat.accent} truncate`}>{stat.value}</p>
                {stat.sub && <p className="text-xs text-muted-foreground mt-0.5">Marge : {stat.sub}</p>}
              </div>
              <div className={`h-9 w-9 rounded-lg ${stat.soft} flex items-center justify-center shrink-0`}>
                <stat.icon className={`h-4 w-4 ${stat.accent}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">CA HT</p>
          <p className="text-lg font-semibold mt-1">{xof(caHT)}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Coût marchandises</p>
          <p className="text-lg font-semibold mt-1">{xof(coutMarchVendues)}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Valeur stock</p>
          <p className="text-lg font-semibold mt-1">{xof(valeurStock)}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Articles</p>
          <p className="text-lg font-semibold mt-1">{s.products.length}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">Activité récente</h2>
            <div className="flex gap-3 text-xs">
              <Link to="/ventes" className="text-accent hover:underline">Ventes</Link>
              <Link to="/achats" className="text-accent hover:underline">Achats</Link>
            </div>
          </div>
          {recent.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Aucun mouvement. <Link to="/ventes" className="text-accent hover:underline">Enregistrer une vente</Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((d) => {
                const party = s.parties.find((p) => p.id === d.partyId);
                const Icon = d.kind === "achat" ? ShoppingCart : d.kind === "devis" ? FileText : Receipt;
                const sign = d.kind === "achat" ? "−" : "+";
                const signColor = d.kind === "achat" ? "text-destructive" : "text-success";
                return (
                  <li key={d.id} className="px-5 py-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 rounded-md ${d.kind === "achat" ? "bg-destructive-soft" : "bg-success-soft"} flex items-center justify-center shrink-0`}>
                        <Icon className={`h-4 w-4 ${d.kind === "achat" ? "text-destructive" : "text-success"}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{d.number}</p>
                        <p className="text-xs text-muted-foreground truncate">{party?.name ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`font-medium ${signColor}`}>{sign}{xof(docTotals(d).ttc)}</span>
                      <StatusBadge status={d.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h2 className="font-semibold text-sm">Alertes stock</h2>
          </div>
          {stockAlerts.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Stock OK 🎉
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {stockAlerts.map((p) => (
                <li key={p.id} className="px-5 py-3 text-sm flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.sku}</p>
                  </div>
                  <span className="text-warning font-medium text-sm shrink-0">{p.stock} {p.unit}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
