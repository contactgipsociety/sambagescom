import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Users as UsersIcon, ShieldCheck, Clock, Receipt, TrendingUp, Loader2 } from "lucide-react";
import { fetchAllUsers, setUserActive, setUserRole, deleteUserProfile, type ProfileWithRole, type AppRole } from "@/lib/userRole";
import { usePosSessions } from "@/lib/pos";
import { useStore } from "@/lib/store";
import { xof } from "@/lib/format";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const formatDuration = (ms: number) => {
  if (ms <= 0) return "0h00";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h${String(m).padStart(2, "0")}`;
};
const formatDateTime = (s?: string) => s ? new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

export default function Users() {
  const [users, setUsers] = useState<ProfileWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const sessions = usePosSessions();
  const { documents } = useStore();

  const reload = async () => {
    setLoading(true);
    try { setUsers(await fetchAllUsers()); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("users-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleActive = async (u: ProfileWithRole, val: boolean) => {
    try { await setUserActive(u.id, val); toast.success(val ? "Compte activé" : "Compte désactivé"); reload(); }
    catch (e: any) { toast.error(e.message ?? "Erreur"); }
  };
  const handleRole = async (u: ProfileWithRole, role: AppRole) => {
    try { await setUserRole(u.id, role); toast.success(`Rôle changé en ${role}`); reload(); }
    catch (e: any) { toast.error(e.message ?? "Erreur"); }
  };
  const handleDelete = async (u: ProfileWithRole) => {
    try { await deleteUserProfile(u.id); toast.success("Profil supprimé"); reload(); }
    catch (e: any) { toast.error(e.message ?? "Erreur"); }
  };

  // ===== Stats par vendeur =====
  const stats = useMemo(() => {
    return users.map((u) => {
      const userSessions = sessions.filter((s) => s.userId === u.id);
      let totalMs = 0;
      userSessions.forEach((s) => {
        const start = new Date(s.openedAt).getTime();
        const end = s.closedAt ? new Date(s.closedAt).getTime() : Date.now();
        totalMs += Math.max(0, end - start);
      });
      const sessionIds = new Set(userSessions.map((s) => s.id));
      const sales = documents.filter((d) => d.posSessionId && sessionIds.has(d.posSessionId) && d.status === "payee");
      const ca = sales.reduce((sum, d) => sum + d.lines.reduce((ss, l) => ss + l.quantity * l.unitPriceHT * (1 + l.tvaRate / 100), 0), 0);
      const last = userSessions[0]; // already sorted desc by opened_at
      return { user: u, sessionsCount: userSessions.length, totalMs, ca, salesCount: sales.length, last };
    });
  }, [users, sessions, documents]);

  const totalActive = users.filter((u) => u.is_active).length;
  const totalAdmins = users.filter((u) => u.role === "admin").length;
  const totalCA = stats.reduce((s, x) => s + x.ca, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Utilisateurs & vendeurs" subtitle="Gérez vos vendeurs, leurs rôles, leurs accès et leur pointage." />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><UsersIcon className="h-5 w-5 text-primary" /></div>
          <div><div className="text-xs text-muted-foreground">Utilisateurs</div><div className="text-xl font-bold">{users.length}</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><ShieldCheck className="h-5 w-5 text-success" /></div>
          <div><div className="text-xs text-muted-foreground">Actifs</div><div className="text-xl font-bold">{totalActive}</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center"><ShieldCheck className="h-5 w-5 text-accent" /></div>
          <div><div className="text-xs text-muted-foreground">Administrateurs</div><div className="text-xl font-bold">{totalAdmins}</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-warning" /></div>
          <div><div className="text-xs text-muted-foreground">CA total vendeurs</div><div className="text-xl font-bold">{xof(totalCA)}</div></div>
        </CardContent></Card>
      </div>

      {/* Liste utilisateurs + actions admin */}
      <Card>
        <CardHeader><CardTitle className="text-base">Comptes</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="text-center">Actif</TableHead>
                  <TableHead>Inscrit le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">Aucun utilisateur.</TableCell></TableRow>
                )}
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.display_name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Select value={u.role} onValueChange={(v) => handleRole(u, v as AppRole)}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="vendor">Vendeur</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={u.is_active} onCheckedChange={(v) => handleActive(u, v)} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(u.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce profil ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Le profil et les rôles de <strong>{u.email}</strong> seront supprimés. L'identifiant d'authentification reste actif (à supprimer manuellement si nécessaire).
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(u)}>Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Récap vendeurs : pointage + ventes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Pointage & performance des vendeurs
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendeur</TableHead>
                <TableHead className="text-center">Sessions</TableHead>
                <TableHead className="text-center">Heures totales</TableHead>
                <TableHead>Dernière arrivée</TableHead>
                <TableHead>Dernier départ</TableHead>
                <TableHead className="text-center">Ventes</TableHead>
                <TableHead className="text-right">CA encaissé</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">Aucune donnée.</TableCell></TableRow>
              )}
              {stats.map(({ user, sessionsCount, totalMs, ca, salesCount, last }) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.display_name || user.email}</div>
                    <div className="text-[11px] text-muted-foreground">
                      <Badge variant="outline" className="mr-1 capitalize">{user.role}</Badge>
                      {user.is_active ? <Badge className="bg-success/15 text-success border-success/30">Actif</Badge> : <Badge variant="outline">Inactif</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{sessionsCount}</TableCell>
                  <TableCell className="text-center font-mono">{formatDuration(totalMs)}</TableCell>
                  <TableCell className="text-xs">
                    {last ? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" /> {formatDateTime(last.openedAt)}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {last?.closedAt ? formatDateTime(last.closedAt) : last ? <Badge className="bg-success/15 text-success border-success/30">En poste</Badge> : "—"}
                  </TableCell>
                  <TableCell className="text-center"><Badge variant="outline" className="gap-1"><Receipt className="h-3 w-3" />{salesCount}</Badge></TableCell>
                  <TableCell className="text-right font-semibold">{xof(ca)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
