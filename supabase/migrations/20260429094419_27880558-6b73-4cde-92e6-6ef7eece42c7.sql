-- Sessions de caisse (POS)
CREATE TABLE public.pos_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cashier text,
  status text NOT NULL DEFAULT 'open', -- 'open' | 'closed'
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_balance numeric NOT NULL DEFAULT 0,
  closing_balance_counted numeric, -- compté en caisse à la fermeture
  closing_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all_pos_sessions"
  ON public.pos_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Lier les ventes POS à une session
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS pos_session_id uuid,
  ADD COLUMN IF NOT EXISTS payment_method text; -- 'especes' | 'mobile' | 'carte' | 'cheque' | 'virement'

CREATE INDEX IF NOT EXISTS idx_documents_pos_session ON public.documents(pos_session_id);
