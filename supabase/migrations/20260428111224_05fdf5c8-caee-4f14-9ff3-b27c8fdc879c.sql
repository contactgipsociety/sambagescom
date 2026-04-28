
-- Tables Gescom : usage mono-utilisateur, données partagées sans authentification
CREATE TABLE public.parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('client','fournisseur')),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  ninea text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  cost_ht numeric NOT NULL DEFAULT 0,
  price_ht numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 18,
  stock numeric NOT NULL DEFAULT 0,
  stock_alert numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'u',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('devis','facture','achat')),
  number text NOT NULL,
  party_id uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status text NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon','envoyee','payee','annulee')),
  notes text,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_kind ON public.documents(kind);
CREATE INDEX idx_documents_created ON public.documents(created_at DESC);
CREATE INDEX idx_products_category ON public.products(category);

-- RLS : usage mono-utilisateur sans auth, accès public assumé
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all_parties" ON public.parties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);

-- Données de démonstration
INSERT INTO public.parties (type, name, email, phone, address, ninea) VALUES
  ('client','Boutique Teranga','contact@teranga.sn','+221 77 123 45 67','Av. Bourguiba, Dakar','0042315 2A 2'),
  ('client','Auberge Saly','saly@example.sn','+221 76 555 11 22','Saly Portudal, Mbour',NULL),
  ('fournisseur','Grossiste Sandaga','ventes@sandaga.sn','+221 78 999 00 11','Marché Sandaga, Dakar',NULL);

INSERT INTO public.products (sku, name, category, cost_ht, price_ht, tva_rate, stock, stock_alert, unit) VALUES
  ('ART-001','Sac de riz parfumé 25kg','Céréales',12000,15500,18,40,10,'sac'),
  ('ART-002','Bidon d''huile 20L','Huiles & Condiments',18000,22000,18,15,8,'bidon'),
  ('ART-003','Carton de sucre 50kg','Épicerie',24000,29500,18,6,10,'carton'),
  ('ART-004','Pack eau minérale 1.5L x6','Boissons',2200,3000,18,80,20,'pack'),
  ('ART-005','Savon de Marseille 200g','Hygiène',350,600,18,200,50,'u');
