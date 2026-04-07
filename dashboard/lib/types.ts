// ============================================================
// Dental Voice AI — TypeScript Type Definitions
// Shared types for the dashboard frontend
// ============================================================

// --- Auth ---

export interface User {
  id: string;
  email: string;
  user_metadata: {
    clinic_id?: string;
    role?: "owner" | "staff";
    full_name?: string;
  };
}

// --- Clinic ---

export interface Clinic {
  id: string;
  name: string;
  owner_id?: string;
  address?: string;
  phone_number?: string;
  timezone: string;
  emergency_escalation_number?: string;
  business_hours_json?: Record<string, { open: string; close: string } | null>;
  twilio_number?: string;
  created_at: string;
  updated_at?: string;
}

// --- Assistant (AI Agent) ---

export interface Assistant {
  id: string;
  clinic_id: string;
  agent_name: string;
  voice_id: string;
  faq_bank_json: FAQItem[];
  is_active: boolean;
  created_at: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

// --- Provider ---

export interface Provider {
  id?: string;
  clinic_id: string;
  name: string;
  role: "dentist" | "hygienist";
  is_active: boolean;
}

// --- Phone Number ---

export interface PhoneNumber {
  id: string;
  clinic_id: string;
  phone_number: string;
  label?: string;
  provider: "twilio" | "livekit_sip";
  is_active: boolean;
  created_at: string;
}

// --- Dashboard ---

export interface DashboardToday {
  total_calls: number;
  appointments_booked_today: number;
  reminders_sent: number;
  recalls_made: number;
  recent_calls: RecentCall[];
  todays_appointments: TodayAppointment[];
}

export interface RecentCall {
  id: string;
  time: string;
  patient_name: string;
  call_type: string;
  duration: number;
  outcome: string;
  phone: string;
  // Aliases used by CallFeed component
  created_at?: string;
  duration_seconds?: number;
  phone_number_from?: string;
}

export interface TodayAppointment {
  id: string;
  start_time: string;
  end_time: string;
  patient_name: string;
  provider_name: string;
  service_type: string;
  status: string;
}

// --- Call History ---

export interface CallRecord {
  id: string;
  created_at: string;
  call_type: string;
  phone_number_from: string;
  phone_number_to: string;
  duration_seconds: number;
  outcome: string;
  patient_name: string;
  patient_phone: string;
  ai_summary: string;
  transcript_text: string;
}

export interface PaginatedCalls {
  page: number;
  limit: number;
  total: number;
  calls: CallRecord[];
}

export interface CallFilters {
  call_type?: string;
  outcome?: string;
  date_from?: string;
  date_to?: string;
}

// --- Metrics ---

export interface MetricDay {
  date: string;
  total_calls: number;
  inbound_calls: number;
  outbound_reminder_calls: number;
  outbound_recall_calls: number;
  appointments_booked: number;
  appointments_cancelled: number;
  no_answer_count: number;
  transfers_to_human: number;
}

export interface MetricsResponse {
  days: number;
  metrics: MetricDay[];
}

// --- Recall ---

export interface RecallCampaign {
  id: string;
  patient_name: string;
  patient_phone: string;
  last_visit_date: string;
  status: string;
  scheduled_call_time?: string;
  call_id?: string;
  appointment_booked: boolean;
  attempts: number;
  last_called_at?: string;
  created_at: string;
}

// --- Agent Config (combined response) ---

export interface AgentConfig {
  agent: Assistant | null;
  clinic: Clinic;
  providers: Provider[];
}
