import { useEffect, useState, FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Loader2, LogIn, UserPlus, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { signIn, signUp, useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";

export default function AuthPage() {
  const { session, loading } = useAuth();
  const company = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || "/";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session) navigate(from, { replace: true });
  }, [session, from, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (session) return <Navigate to={from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
        toast({ title: "Connexion réussie" });
      } else {
        await signUp(email.trim(), password);
        toast({ title: "Compte créé", description: "Vous êtes connecté." });
      }
    } catch (err: any) {
      const msg = err?.message || "Erreur";
      toast({
        title: mode === "signin" ? "Connexion impossible" : "Inscription impossible",
        description: msg.includes("Invalid login") ? "Email ou mot de passe incorrect."
          : msg.includes("Signups not allowed") || msg.includes("signup is disabled") ? "Les inscriptions sont fermées. Contactez l'administrateur."
          : msg.includes("already registered") ? "Cet email est déjà utilisé."
          : msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center mesh-bg p-4 sm:p-6 safe-top safe-bottom relative overflow-hidden">
      {/* Decorative blurred orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative w-full max-w-md flex flex-col items-center gap-7 animate-fade-in">
        <div className="flex flex-col items-center gap-4 text-center">
          {company.logoUrl ? (
            <img src={company.logoUrl} alt={company.name} className="h-20 w-20 sm:h-24 sm:w-24 object-contain rounded-2xl shadow-[var(--shadow-lg)] bg-card p-2.5 ring-1 ring-border/60" />
          ) : (
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl gradient-primary flex items-center justify-center shadow-[var(--shadow-lg)]">
              <Store className="h-10 w-10 text-primary-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">{company.name}</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Espace de gestion sécurisé</p>
          </div>
        </div>

        <Card className="w-full glass-card border-border/60 shadow-[var(--shadow-lg)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Bienvenue 👋</CardTitle>
            <CardDescription>Identifiez-vous pour accéder à la plateforme.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
              <TabsList className="grid w-full grid-cols-2 mb-5 h-11 p-1 bg-muted/60">
                <TabsTrigger value="signin" className="rounded-md data-[state=active]:shadow-[var(--shadow-sm)]"><LogIn className="h-4 w-4 mr-1.5" />Connexion</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-md data-[state=active]:shadow-[var(--shadow-sm)]"><UserPlus className="h-4 w-4 mr-1.5" />Inscription</TabsTrigger>
              </TabsList>

              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                  <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium">Mot de passe</Label>
                  <Input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-11" />
                </div>
                <Button type="submit" className="w-full h-11 mt-2 gradient-primary border-0 shadow-[var(--shadow-glow)] font-semibold" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Se connecter" : "Créer un compte"}
                </Button>
                <TabsContent value="signup" className="m-0 pt-1">
                  <p className="text-[11px] text-muted-foreground text-center">
                    Les inscriptions peuvent être désactivées. Contactez l'administrateur si besoin.
                  </p>
                </TabsContent>
              </form>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-[11px] text-muted-foreground text-center">© {new Date().getFullYear()} {company.name} · Propulsé par Lovable Cloud</p>
      </div>
    </div>
  );
}
