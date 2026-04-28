import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Package, Building2, Receipt, ShoppingCart, FileText, Boxes, Tag, ScanLine } from "lucide-react";
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
  { title: "Ventes", url: "/ventes", icon: Receipt },
  { title: "Achats", url: "/achats", icon: ShoppingCart },
  { title: "Devis", url: "/devis", icon: FileText },
];
const repertoire = [
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Fournisseurs", url: "/fournisseurs", icon: Building2 },
];
const catalogue = [
  { title: "Catalogue", url: "/catalogue", icon: Tag },
  { title: "Inventaire", url: "/inventaire", icon: Boxes },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const isActive = (path: string) => path === "/" ? pathname === "/" : pathname.startsWith(path);

  const renderGroup = (label: string, items: typeof main) => (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-semibold px-3">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                className="data-[active=true]:bg-primary-soft data-[active=true]:text-primary data-[active=true]:font-semibold data-[active=true]:border-l-2 data-[active=true]:border-primary rounded-md"
              >
                <NavLink to={item.url} className="flex items-center gap-3">
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
          <div className="h-9 w-9 rounded-md bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0 shadow-sm">G</div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-foreground font-semibold text-[15px]">Gescom</span>
              <span className="text-muted-foreground text-[11px]">Gestion commerciale · SN</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-sidebar">
        {renderGroup("Pilotage", main)}
        {renderGroup("Opérations", operations)}
        {renderGroup("Répertoire", repertoire)}
        {renderGroup("Stock", catalogue)}
      </SidebarContent>
    </Sidebar>
  );
}
