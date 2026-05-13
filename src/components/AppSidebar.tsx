import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Package, Building2, Receipt, ShoppingCart, FileText, Boxes, Tag, ScanLine, BookOpen, Settings as SettingsIcon, BarChart3, UserCog } from "lucide-react";
import { useCurrentUser } from "@/lib/userRole";
import { useCompany } from "@/lib/company";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const main = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
];
const operations = [
  { title: "Caisse / POS", url: "/pos", icon: ScanLine },
  { title: "Analyse caisse", url: "/pos/analyse", icon: BarChart3 },
  { title: "Ventes", url: "/ventes", icon: Receipt },
  { title: "Achats", url: "/achats", icon: ShoppingCart },
  { title: "Devis", url: "/devis", icon: FileText },
];
const repertoire = [
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Fournisseurs", url: "/fournisseurs", icon: Building2 },
  { title: "Comptes tiers", url: "/comptes-tiers", icon: BarChart3 },
];
const catalogue = [
  { title: "Catalogue", url: "/catalogue", icon: Tag },
  { title: "Inventaire", url: "/inventaire", icon: Boxes },
];
const finance = [
  { title: "Comptabilité", url: "/comptabilite", icon: BookOpen },
];
const systemeAdmin = [
  { title: "Utilisateurs", url: "/utilisateurs", icon: UserCog },
  { title: "Paramètres", url: "/parametres", icon: SettingsIcon },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const company = useCompany();
  const { isAdmin } = useCurrentUser();
  const isActive = (path: string) => path === "/" ? pathname === "/" : path === "/pos" ? pathname === "/pos" : pathname === path || pathname.startsWith(path + "/");

  const renderGroup = (label: string, items: typeof main) => (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 font-bold px-3 mt-1">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                className="group relative h-10 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-semibold rounded-lg hover:bg-sidebar-accent/60 transition-all"
              >
                <NavLink to={item.url} className="flex items-center gap-3 px-3">
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary opacity-0 group-data-[active=true]:opacity-100 transition-opacity" />
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span className="text-[13.5px]">{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-3">
          {company.logoUrl ? (
            <img src={company.logoUrl} alt={company.name} className="h-10 w-10 rounded-xl object-contain bg-card shrink-0 shadow-[var(--shadow-sm)] ring-1 ring-border/60" />
          ) : (
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0 shadow-[var(--shadow-md)]">
              {(company.name?.[0] || "G").toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-foreground font-bold text-[15px] truncate" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{company.name}</span>
              <span className="text-muted-foreground text-[10.5px] uppercase tracking-wider font-medium">Gestion · SN</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-sidebar">
        {renderGroup("Pilotage", main)}
        {renderGroup("Opérations", operations)}
        {renderGroup("Répertoire", repertoire)}
        {renderGroup("Stock", catalogue)}
        {renderGroup("Finance", finance)}
        {isAdmin && renderGroup("Système", systemeAdmin)}
      </SidebarContent>
    </Sidebar>
  );
}
