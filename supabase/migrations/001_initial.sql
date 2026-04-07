-- ============================================================================
-- Dental Voice AI — Initial Database Schema
-- Supabase Migration: 001_initial.sql
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CUSTOM ENUM TYPES
-- ============================================================================

CREATE TYPE provider_role AS ENUM ('dentist', 'hygienist');

CREATE TYPE appointment_status AS ENUM (
    'scheduled', 'confirmed', 'cancelled', 'rescheduled', 'completed', 'no_show'
);

CREATE TYPE booking_source AS ENUM ('ai_inbound', 'ai_outbound', 'manual');

CREATE TYPE call_type AS ENUM ('inbound', 'outbound_reminder', 'outbound_recall');

CREATE TYPE call_outcome AS ENUM (
    'booked', 'rescheduled', 'cancelled', 'faq', 'transferred',
    'no_answer', 'voicemail', 'emergency'
);

CREATE TYPE sms_direction AS ENUM ('outbound', 'inbound');

CREATE TYPE recall_status AS ENUM (
    'pending', 'called', 'booked', 'declined', 'no_answer', 'opted_out'
);

-- ============================================================================
-- TABLE 1: clinics
-- ============================================================================

CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    twilio_number TEXT,
    address TEXT,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    business_hours_json JSONB NOT NULL DEFAULT '{
        "mon": {"open": "08:00", "close": "17:00"},
        "tue": {"open": "08:00", "close": "17:00"},
        "wed": {"open": "08:00", "close": "17:00"},
        "thu": {"open": "08:00", "close": "17:00"},
        "fri": {"open": "08:00", "close": "14:00"},
        "sat": null,
        "sun": null
    }'::jsonb,
    emergency_escalation_number TEXT,
    subscription_status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinics_select_own" ON clinics
    FOR SELECT USING (id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "clinics_update_own" ON clinics
    FOR UPDATE USING (id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

-- ============================================================================
-- TABLE 2: providers
-- ============================================================================

CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role provider_role NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_providers_clinic_id ON providers(clinic_id);

ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers_select_own" ON providers
    FOR SELECT USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "providers_insert_own" ON providers
    FOR INSERT WITH CHECK (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "providers_update_own" ON providers
    FOR UPDATE USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "providers_delete_own" ON providers
    FOR DELETE USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

-- ============================================================================
-- TABLE 3: patients
-- ============================================================================

CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    family_account_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    last_visit_date DATE,
    sms_consent BOOLEAN NOT NULL DEFAULT false,
    recall_consent BOOLEAN NOT NULL DEFAULT false,
    do_not_call BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX idx_patients_phone_number ON patients(phone_number);
CREATE INDEX idx_patients_family_account_id ON patients(family_account_id);
CREATE INDEX idx_patients_last_visit_date ON patients(last_visit_date);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients_select_own" ON patients
    FOR SELECT USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "patients_insert_own" ON patients
    FOR INSERT WITH CHECK (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "patients_update_own" ON patients
    FOR UPDATE USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

-- ============================================================================
-- TABLE 4: appointments
-- ============================================================================

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status appointment_status NOT NULL DEFAULT 'scheduled',
    cancellation_reason TEXT,
    booked_via booking_source NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_provider_id ON appointments(provider_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_select_own" ON appointments
    FOR SELECT USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "appointments_insert_own" ON appointments
    FOR INSERT WITH CHECK (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "appointments_update_own" ON appointments
    FOR UPDATE USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

-- ============================================================================
-- TABLE 5: calls
-- ============================================================================

CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    call_type call_type NOT NULL,
    phone_number_from TEXT NOT NULL,
    phone_number_to TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    outcome call_outcome,
    livekit_room_name TEXT,
    recording_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calls_clinic_id ON calls(clinic_id);
CREATE INDEX idx_calls_patient_id ON calls(patient_id);
CREATE INDEX idx_calls_created_at ON calls(created_at);
CREATE INDEX idx_calls_call_type ON calls(call_type);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calls_select_own" ON calls
    FOR SELECT USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "calls_insert_own" ON calls
    FOR INSERT WITH CHECK (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "calls_update_own" ON calls
    FOR UPDATE USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

-- ============================================================================
-- TABLE 6: call_transcripts
-- ============================================================================

CREATE TABLE call_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    transcript_text TEXT NOT NULL DEFAULT '',
    ai_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_call_transcripts_call_id ON call_transcripts(call_id);
CREATE INDEX idx_call_transcripts_clinic_id ON call_transcripts(clinic_id);

ALTER TABLE call_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_transcripts_select_own" ON call_transcripts
    FOR SELECT USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "call_transcripts_insert_own" ON call_transcripts
    FOR INSERT WITH CHECK (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

-- ============================================================================
-- TABLE 7: sms_messages
-- ============================================================================

CREATE TABLE sms_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    direction sms_direction NOT NULL DEFAULT 'outbound',
    message_body TEXT NOT NULL,
    twilio_sid TEXT,
    status TEXT NOT NULL DEFAULT 'queued',
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sms_messages_clinic_id ON sms_messages(clinic_id);
CREATE INDEX idx_sms_messages_patient_id ON sms_messages(patient_id);

ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_messages_select_own" ON sms_messages
    FOR SELECT USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "sms_messages_insert_own" ON sms_messages
    FOR INSERT WITH CHECK (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

-- ============================================================================
-- TABLE 8: ai_agents
-- ============================================================================

CREATE TABLE ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL DEFAULT 'Dental AI Receptionist',
    voice_id TEXT NOT NULL DEFAULT 'Cheyenne-PlayAI',
    system_prompt TEXT,
    faq_bank_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_agents_clinic_id ON ai_agents(clinic_id);

ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_agents_select_own" ON ai_agents
    FOR SELECT USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "ai_agents_insert_own" ON ai_agents
    FOR INSERT WITH CHECK (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "ai_agents_update_own" ON ai_agents
    FOR UPDATE USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

-- ============================================================================
-- TABLE 9: recall_campaigns
-- ============================================================================

CREATE TABLE recall_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    scheduled_call_time TIMESTAMPTZ,
    status recall_status NOT NULL DEFAULT 'pending',
    call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recall_campaigns_clinic_id ON recall_campaigns(clinic_id);
CREATE INDEX idx_recall_campaigns_patient_id ON recall_campaigns(patient_id);
CREATE INDEX idx_recall_campaigns_status ON recall_campaigns(status);
CREATE INDEX idx_recall_campaigns_scheduled_call_time ON recall_campaigns(scheduled_call_time);

ALTER TABLE recall_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recall_campaigns_select_own" ON recall_campaigns
    FOR SELECT USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "recall_campaigns_insert_own" ON recall_campaigns
    FOR INSERT WITH CHECK (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "recall_campaigns_update_own" ON recall_campaigns
    FOR UPDATE USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

-- CASL Compliance: Trigger to enforce recall consent rules at DB level
CREATE OR REPLACE FUNCTION check_recall_consent()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM patients
        WHERE id = NEW.patient_id
          AND recall_consent = true
          AND do_not_call = false
    ) THEN
        RAISE EXCEPTION 'CASL violation: patient has not given recall consent or is on do-not-call list';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_recall_consent
    BEFORE INSERT ON recall_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION check_recall_consent();

-- ============================================================================
-- TABLE 10: clinic_metrics_daily
-- ============================================================================

CREATE TABLE clinic_metrics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_calls INTEGER NOT NULL DEFAULT 0,
    inbound_calls INTEGER NOT NULL DEFAULT 0,
    outbound_reminder_calls INTEGER NOT NULL DEFAULT 0,
    outbound_recall_calls INTEGER NOT NULL DEFAULT 0,
    appointments_booked INTEGER NOT NULL DEFAULT 0,
    appointments_cancelled INTEGER NOT NULL DEFAULT 0,
    no_answer_count INTEGER NOT NULL DEFAULT 0,
    transfers_to_human INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_clinic_date UNIQUE (clinic_id, date)
);

CREATE INDEX idx_clinic_metrics_daily_clinic_id ON clinic_metrics_daily(clinic_id);
CREATE INDEX idx_clinic_metrics_daily_date ON clinic_metrics_daily(date);

ALTER TABLE clinic_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_metrics_daily_select_own" ON clinic_metrics_daily
    FOR SELECT USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "clinic_metrics_daily_insert_own" ON clinic_metrics_daily
    FOR INSERT WITH CHECK (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "clinic_metrics_daily_update_own" ON clinic_metrics_daily
    FOR UPDATE USING (clinic_id = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid);

-- ============================================================================
-- SUPABASE STORAGE: Call Recordings Bucket
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'call-recordings',
    'call-recordings',
    false,
    52428800,  -- 50MB max per file
    ARRAY['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/webm', 'audio/mp4']
);

-- RLS: clinic members can only read recordings in their clinic's folder
CREATE POLICY "recordings_select_own" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'call-recordings'
        AND (storage.foldername(name))[1] = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')
    );

CREATE POLICY "recordings_insert_own" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'call-recordings'
        AND (storage.foldername(name))[1] = (auth.jwt() -> 'user_metadata' ->> 'clinic_id')
    );

-- ============================================================================
-- SERVICE ROLE BYPASS POLICIES
-- These allow the backend (using service_role key) to access all rows.
-- Supabase service_role key automatically bypasses RLS, so these are
-- documented here for clarity. No additional policies needed.
-- ============================================================================
