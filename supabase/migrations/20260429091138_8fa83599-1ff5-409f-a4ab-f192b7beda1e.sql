CREATE TABLE public.accounting_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  label TEXT NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all_accounting_entries"
ON public.accounting_entries
FOR ALL
USING (true)
WITH CHECK (true);

CREATE INDEX idx_accounting_entries_date ON public.accounting_entries(date);
CREATE INDEX idx_accounting_entries_type ON public.accounting_entries(entry_type);