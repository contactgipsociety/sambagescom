-- Table de paramètres de l'entreprise (single-row)
CREATE TABLE IF NOT EXISTS public.company_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT 'Mon Entreprise',
  legal_form text,
  address text,
  city text,
  phone text,
  email text,
  website text,
  ninea text,
  rccm text,
  tax_regime text,
  currency text NOT NULL DEFAULT 'XOF',
  default_tva numeric NOT NULL DEFAULT 18,
  logo_url text,
  invoice_footer text,
  fiscal_year_start_month integer NOT NULL DEFAULT 1,
  fiscal_year_start_day integer NOT NULL DEFAULT 1,
  current_fiscal_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())::int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all_company_settings" ON public.company_settings
  FOR ALL USING (true) WITH CHECK (true);

-- Insère une ligne par défaut si vide
INSERT INTO public.company_settings (name)
SELECT 'Mon Entreprise'
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);

-- Bucket pour le logo de l'entreprise
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_read_company_assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-assets');
CREATE POLICY "public_insert_company_assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'company-assets');
CREATE POLICY "public_update_company_assets" ON storage.objects
  FOR UPDATE USING (bucket_id = 'company-assets');
CREATE POLICY "public_delete_company_assets" ON storage.objects
  FOR DELETE USING (bucket_id = 'company-assets');
