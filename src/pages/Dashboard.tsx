import { useStore } from "@/lib/store";
import { eur } from "@/lib/format";
import { docTotals } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Users, Package, Receipt, TrendingUp, AlertTriangle, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";

export default function Dashboard() {
  const s = useStore();
  const factures = s.documents.filter((d) => d.kind === "facture");
  const caTotal = factures.filter((f) => f.status === "payee").reduce((sum, f) => sum + docTotals(f).ttc, 0);
  const caEnAttente = factures.filter((f) => f.status === "envoyee").reduce((sum, f) => sum + docTotals(f).ttc, 0);
  const stockAlerts = s.products.filter((p) => p.stock <= p.stockAlert);
  const clients = s.parties.filter((p) => p.type === "client");

  const stats = [
    { label: "CA encaissé", value: eur(caTotal), icon: TrendingUp, accent: "text-success" },
    { label: "En attente paiement", value: eur(caEnAttente), icon: Receipt, accent: "text-accent" },
    { label: "Clients", value: clients.length.toString(), icon: Users, accent: "text-foreground" },
    { label: "Produits", value: s.products.length.toString(), icon: Package, accent: "text-foreground" },
  ];

  const recent = [...s.documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de votre activité" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-semibold mt-2 ${s.accent}`}>{s.value}</p>
              </div>
              <s.icon className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">Documents récents</h2>
            <Link to="/factures" className="text-xs text-accent hover:underline">Voir tout</Link>
          </div>
          {recent.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Aucun document. <Link to="/factures" className="text-accent hover:underline">Créer une facture</Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((d) => {
                const client = s.parties.find((p) => p.id === d.clientId);
                return (
                  <li key={d.id} className="px-5 py-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                        {d.kind === "devis" ? <FileText className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium">{d.number}</p>
                        <p className="text-xs text-muted-foreground">{client?.name ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{eur(docTotals(d).ttc)}</span>
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
            <div className="p-6 text-center text-sm text-muted-foreground">Aucune alerte 🎉</div>
          ) : (
            <ul className="divide-y divide-border">
              {stockAlerts.map((p) => (
                <li key={p.id} className="px-5 py-3 text-sm flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.sku}</p>
                  </div>
                  <span className="text-warning font-medium text-sm">{p.stock} {p.unit}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
