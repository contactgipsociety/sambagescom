CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  kind text NOT NULL DEFAULT 'cash',
  is_active boolean NOT NULL DEFAULT true,
  is_credit boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  icon text,
  account_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all_payment_methods" ON public.payment_methods
  FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_payment_methods_updated
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.payment_methods (code, label, kind, is_credit, sort_order, icon, account_code) VALUES
  ('especes', 'Espèces', 'cash', false, 1, 'Banknote', '571'),
  ('orange_money', 'Orange Money', 'mobile', false, 2, 'Smartphone', '521'),
  ('wave', 'Wave', 'mobile', false, 3, 'Smartphone', '521'),
  ('carte', 'Carte bancaire', 'card', false, 4, 'CreditCard', '512'),
  ('credit_fournisseur', 'Crédit fournisseur', 'credit', true, 5, 'FileText', '401'),
  ('compte_client', 'Compte client', 'credit', true, 6, 'Users', '411');