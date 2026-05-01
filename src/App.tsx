import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import PartiesPage from "./pages/Parties";
import PartiesAnalysis from "./pages/PartiesAnalysis";
import ProductsPage from "./pages/Products";
import Inventory from "./pages/Inventory";
import DocumentsPage from "./pages/Documents";
import POS from "./pages/POS";
import POSAnalysis from "./pages/POSAnalysis";
import Accounting from "./pages/Accounting";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<PartiesPage type="client" />} />
            <Route path="/fournisseurs" element={<PartiesPage type="fournisseur" />} />
            <Route path="/comptes-tiers" element={<PartiesAnalysis />} />
            <Route path="/catalogue" element={<ProductsPage />} />
            <Route path="/inventaire" element={<Inventory />} />
            <Route path="/devis" element={<DocumentsPage kind="devis" />} />
            <Route path="/ventes" element={<DocumentsPage kind="facture" />} />
            <Route path="/achats" element={<DocumentsPage kind="achat" />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/pos/analyse" element={<POSAnalysis />} />
            <Route path="/comptabilite" element={<Accounting />} />
            <Route path="/parametres" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
