-- =============================================================
-- Dental Voice AI — Schema Migration
-- Adds multi-tenant support: owner_id, phone_numbers, demo_requests
-- Run this against your Supabase project (SQL Editor or migration)
-- =============================================================

-- 1. Add owner_id to clinics (links to auth.users)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clinics' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE clinics ADD COLUMN owner_id uuid REFERENCES auth.users(id);
    CREATE INDEX idx_clinics_owner_id ON clinics(owner_id);
  END IF;
END $$;

-- 2. Phone numbers table
CREATE TABLE IF NOT EXISTS phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  phone_number text NOT NULL UNIQUE,
  label text,
  provider text NOT NULL DEFAULT 'twilio',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_clinic_id ON phone_numbers(clinic_id);

-- 3. Demo requests table
CREATE TABLE IF NOT EXISTS demo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  clinic_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_demo_requests_email ON demo_requests(email);
CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON demo_requests(status);

-- 4. Add call_logs view (alias for calls table with extra context)
-- The existing 'calls' table already serves as call_logs.
-- No changes needed — routes query it directly.

-- 5. Enable RLS on new tables
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for phone_numbers
-- Users can read phone numbers for their own clinic
CREATE POLICY IF NOT EXISTS "phone_numbers_select_own_clinic"
  ON phone_numbers FOR SELECT
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "phone_numbers_insert_own_clinic"
  ON phone_numbers FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "phone_numbers_update_own_clinic"
  ON phone_numbers FOR UPDATE
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "phone_numbers_delete_own_clinic"
  ON phone_numbers FOR DELETE
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  );

-- 7. RLS Policies for demo_requests (public insert, admin read)
CREATE POLICY IF NOT EXISTS "demo_requests_public_insert"
  ON demo_requests FOR INSERT
  WITH CHECK (true);

-- 8. Allow service role to bypass RLS (for backend with service key)
-- Service role already bypasses RLS by default in Supabase.

-- 9. RLS on clinics (if not already enabled)
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "clinics_select_own"
  ON clinics FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY IF NOT EXISTS "clinics_update_own"
  ON clinics FOR UPDATE
  USING (owner_id = auth.uid());

-- 10. Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'phone_numbers_updated_at') THEN
    CREATE TRIGGER phone_numbers_updated_at
      BEFORE UPDATE ON phone_numbers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'demo_requests_updated_at') THEN
    CREATE TRIGGER demo_requests_updated_at
      BEFORE UPDATE ON demo_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
