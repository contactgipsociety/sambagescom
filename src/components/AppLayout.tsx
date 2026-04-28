import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const titles: Record<string, string> = {
  "/": "Tableau de bord",
  "/ventes": "Ventes",
  "/achats": "Achats",
  "/devis": "Devis",
  "/clients": "Clients",
  "/fournisseurs": "Fournisseurs",
  "/catalogue": "Catalogue",
  "/inventaire": "Inventaire",
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const title = titles[pathname] ?? "Gescom";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center gap-3 border-b border-border bg-card px-3 sticky top-0 z-10 shadow-[var(--shadow-sm)]">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="h-5 w-px bg-border" />
            <nav className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">Gescom</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-medium text-foreground">{title}</span>
            </nav>
            <div className="flex-1" />
            <div className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Local · FCFA
            </div>
          </header>
          <main className="flex-1 p-5 lg:p-7 animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
