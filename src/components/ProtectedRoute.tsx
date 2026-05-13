import { Navigate, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert, LogOut } from "lucide-react";
import { useAuth, signOut } from "@/lib/auth";
import { useCurrentUser } from "@/lib/userRole";
import { Button } from "@/components/ui/button";

export default function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { session, loading: authLoading } = useAuth();
  const { loading: userLoading, profile, isAdmin, isActive } = useCurrentUser();
  const location = useLocation();

  if (authLoading || (session && userLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }
  // Compte non encore validé par un admin
  if (profile && !isActive && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-bg p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-5 shadow-[var(--shadow-lg)]">
          <div className="h-16 w-16 mx-auto rounded-full bg-warning/15 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-warning" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Compte en attente de validation</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Votre compte <strong>{profile.email}</strong> a bien été créé. Un administrateur doit l'activer avant que vous puissiez accéder à l'application.
            </p>
          </div>
          <Button variant="outline" onClick={() => signOut()} className="gap-2">
            <LogOut className="h-4 w-4" /> Se déconnecter
          </Button>
        </div>
      </div>
    );
  }
  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
