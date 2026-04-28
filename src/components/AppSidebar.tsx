import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Package, FileText, Building2, Receipt } from "lucide-react";
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
const ventes = [
  { title: "Devis", url: "/devis", icon: FileText },
  { title: "Factures", url: "/factures", icon: Receipt },
];
const repertoire = [
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Fournisseurs", url: "/fournisseurs", icon: Building2 },
];
const catalogue = [
  { title: "Produits & Stock", url: "/produits", icon: Package },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const isActive = (path: string) => path === "/" ? pathname === "/" : pathname.startsWith(path);

  const renderGroup = (label: string, items: typeof main) => (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-sidebar-foreground/50">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium"
              >
                <NavLink to={item.url} className="flex items-center gap-3">
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center text-accent-foreground font-bold text-sm shrink-0">G</div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sidebar-foreground font-semibold text-sm">Gescom</span>
              <span className="text-sidebar-foreground/50 text-[11px]">Gestion commerciale</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Pilotage", main)}
        {renderGroup("Ventes", ventes)}
        {renderGroup("Répertoire", repertoire)}
        {renderGroup("Catalogue", catalogue)}
      </SidebarContent>
    </Sidebar>
  );
}
