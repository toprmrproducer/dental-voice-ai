-- ============================================================================
-- Dental Voice AI — Seed Data
-- One demo clinic, two providers, five patients, one AI agent
-- ============================================================================

-- Fixed UUIDs for referential integrity in seed data
-- Clinic
INSERT INTO clinics (id, name, phone_number, twilio_number, address, timezone, business_hours_json, emergency_escalation_number, subscription_status)
VALUES (
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'Bright Smile Dental',
    '+15551234567',
    '+15559876543',
    '123 Main Street, Suite 200, Anytown, CA 90210',
    'America/Los_Angeles',
    '{
        "mon": {"open": "08:00", "close": "17:00"},
        "tue": {"open": "08:00", "close": "17:00"},
        "wed": {"open": "09:00", "close": "18:00"},
        "thu": {"open": "08:00", "close": "17:00"},
        "fri": {"open": "08:00", "close": "14:00"},
        "sat": null,
        "sun": null
    }'::jsonb,
    '+15551234599',
    'active'
);

-- Providers
INSERT INTO providers (id, clinic_id, name, role, is_active) VALUES
(
    'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'Dr. Sarah Chen',
    'dentist',
    true
),
(
    'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'Amy Park',
    'hygienist',
    true
);

-- Patients
-- Patient 1: Regular patient, recent visit
INSERT INTO patients (id, clinic_id, phone_number, full_name, date_of_birth, family_account_id, last_visit_date, sms_consent, recall_consent, do_not_call)
VALUES (
    'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    '+15550100001',
    'John Smith',
    '1985-03-15',
    NULL,
    '2026-03-25',
    true,
    true,
    false
);

-- Patient 2: Has family account (is the "head"), recent visit
INSERT INTO patients (id, clinic_id, phone_number, full_name, date_of_birth, family_account_id, last_visit_date, sms_consent, recall_consent, do_not_call)
VALUES (
    'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    '+15550100002',
    'Maria Garcia',
    '1990-07-22',
    NULL,
    '2026-03-01',
    true,
    true,
    false
);

-- Patient 3: do_not_call = true
INSERT INTO patients (id, clinic_id, phone_number, full_name, date_of_birth, family_account_id, last_visit_date, sms_consent, recall_consent, do_not_call)
VALUES (
    'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f809102',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    '+15550100003',
    'Robert Johnson',
    '1978-11-30',
    NULL,
    '2026-02-10',
    false,
    false,
    true
);

-- Patient 4: Lapsed — last visit over 6 months ago (Sept 2025)
INSERT INTO patients (id, clinic_id, phone_number, full_name, date_of_birth, family_account_id, last_visit_date, sms_consent, recall_consent, do_not_call)
VALUES (
    'a7b8c9d0-e1f2-4a3b-4c5d-6e7f80910213',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    '+15550100004',
    'Emily Davis',
    '1995-01-08',
    NULL,
    '2025-09-05',
    true,
    true,
    false
);

-- Patient 5: Family member of Maria Garcia (shares her phone number)
INSERT INTO patients (id, clinic_id, phone_number, full_name, date_of_birth, family_account_id, last_visit_date, sms_consent, recall_consent, do_not_call)
VALUES (
    'b8c9d0e1-f2a3-4b4c-5d6e-7f8091021324',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    '+15550100002',
    'James Wilson',
    '1988-06-12',
    'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091',
    '2026-02-20',
    true,
    true,
    false
);

-- AI Agent configuration
INSERT INTO ai_agents (id, clinic_id, agent_name, voice_id, system_prompt, faq_bank_json, is_active)
VALUES (
    'c9d0e1f2-a3b4-4c5d-6e7f-809102132435',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'Sophie',
    'Cheyenne-PlayAI',
    NULL,
    '[
        {"question": "What are your office hours?", "answer": "We are open Monday through Thursday 8 AM to 5 PM, Wednesday 9 AM to 6 PM, and Friday 8 AM to 2 PM. We are closed on weekends."},
        {"question": "Do you accept insurance?", "answer": "Yes, we accept most major dental insurance plans including Delta Dental, Cigna, Aetna, MetLife, and Guardian. Please contact our front desk for specific coverage details."},
        {"question": "Do you accept new patients?", "answer": "Absolutely! We are always welcoming new patients. We would love to schedule your first visit."},
        {"question": "What should I bring to my first appointment?", "answer": "Please bring a valid photo ID, your insurance card, and a list of any medications you are currently taking."},
        {"question": "Do you offer emergency dental care?", "answer": "Yes, we handle dental emergencies during business hours. If you have an emergency outside of hours, please call our main line and follow the prompts for our emergency contact."},
        {"question": "How often should I get a dental cleaning?", "answer": "We recommend a professional cleaning every six months, but your dentist may suggest a different schedule based on your individual oral health needs."},
        {"question": "Do you offer teeth whitening?", "answer": "Yes, we offer both in-office and take-home whitening options. We would be happy to discuss which option is best for you at your next visit."},
        {"question": "What is your cancellation policy?", "answer": "We ask for at least 24 hours notice for cancellations. This helps us offer that time slot to other patients who may need care."},
        {"question": "Do you offer payment plans?", "answer": "Yes, we offer flexible payment options. Our front desk team can walk you through the details based on your treatment plan."},
        {"question": "Where are you located?", "answer": "We are located at 123 Main Street, Suite 200, Anytown, California 90210. There is free parking available in the lot behind the building."}
    ]'::jsonb,
    true
);

-- Sample appointments (for today and tomorrow, relative dates would need to be adjusted)
INSERT INTO appointments (id, clinic_id, patient_id, provider_id, service_type, start_time, end_time, status, booked_via) VALUES
(
    'd0e1f2a3-b4c5-4d6e-7f80-910213243546',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80',
    'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    'Cleaning',
    '2026-04-08 09:00:00-07',
    '2026-04-08 09:30:00-07',
    'confirmed',
    'ai_inbound'
),
(
    'e1f2a3b4-c5d6-4e7f-8091-021324354657',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091',
    'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    'Exam',
    '2026-04-08 10:00:00-07',
    '2026-04-08 10:30:00-07',
    'scheduled',
    'manual'
);
