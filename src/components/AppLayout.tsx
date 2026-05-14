import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useStoreLoaded } from "@/lib/store";
import { useAuth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, LogOut, User as UserIcon } from "lucide-react";
import { useCompany } from "@/lib/company";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  const title = titles[pathname] ?? "Sama Boutique";
  const ready = useStoreLoaded();
  const { user } = useAuth();
  const company = useCompany();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full mesh-bg">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-2 sm:gap-3 border-b border-border/60 bg-card/70 backdrop-blur-xl px-3 sm:px-5 sticky top-0 z-20 safe-top">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground -ml-1" />
            <div className="h-5 w-px bg-border hidden sm:block" />
            <nav className="flex items-center gap-1.5 text-sm min-w-0">
              <span className="text-muted-foreground hidden sm:inline truncate max-w-[140px]">{company.name}</span>
              <span className="text-muted-foreground/40 hidden sm:inline">/</span>
              <span className="font-semibold text-foreground truncate">{title}</span>
            </nav>
            <div className="flex-1" />
            <div className="text-[11px] text-muted-foreground hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border/50">
              <span className={`h-1.5 w-1.5 rounded-full ${ready ? "bg-success animate-pulse" : "bg-warning"}`} />
              {ready ? "Cloud · FCFA" : "Synchronisation…"}
            </div>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 px-1.5 sm:px-2 gap-2 rounded-full hover:bg-muted">
                  <div className="h-7 w-7 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-[12px] font-bold shadow-[var(--shadow-sm)]">
                    {(user?.email?.[0] || "U").toUpperCase()}
                  </div>
                  <span className="hidden md:inline text-xs max-w-[140px] truncate text-muted-foreground">{user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-xs font-medium leading-none">Connecté en tant que</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" /> Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 p-3 sm:p-5 lg:p-8 animate-fade-in overflow-x-hidden safe-bottom">
            {ready ? <Outlet /> : (
              <div className="flex items-center justify-center py-20 text-muted-foreground gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement des données…
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
