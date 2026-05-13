CREATE TABLE dream_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  raw_input text,
  narrative text,
  title text,
  keywords text[],
  emotions text[],
  interpretation text,
  life_connection_interpretation text,
  tarot_card jsonb,
  tarot_interpretation text,
  status text DEFAULT 'DONE'
);

ALTER TABLE dream_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their records" ON dream_records
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_dream_records_user_date
  ON dream_records (user_id, created_at DESC);
