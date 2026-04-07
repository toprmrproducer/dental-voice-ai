import { createClient } from "@/lib/supabase/client";
import type {
  DashboardToday,
  PaginatedCalls,
  CallFilters,
  MetricsResponse,
  AgentConfig,
  Clinic,
  Assistant,
  PhoneNumber,
} from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
  noAuth?: boolean;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}

async function apiFetch<T = any>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, noAuth, ...fetchOptions } = options;

  let url = `${BACKEND_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const authHeaders = noAuth ? {} : await getAuthHeaders();

  const res = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...fetchOptions.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.detail || error.error || `API Error: ${res.status}`);
  }

  return res.json();
}

// --- Patient APIs ---

export async function lookupPatient(phoneNumber: string, clinicId: string) {
  return apiFetch("/api/patients/lookup", {
    method: "POST",
    body: JSON.stringify({ phone_number: phoneNumber, clinic_id: clinicId }),
  });
}

// --- Availability & Appointments ---

export async function checkAvailability(
  clinicId: string,
  date: string,
  serviceType: string,
  providerId?: string
) {
  const params: Record<string, string> = {
    clinic_id: clinicId,
    date,
    service_type: serviceType,
  };
  if (providerId) params.provider_id = providerId;
  return apiFetch("/api/availability", { params });
}

export async function bookAppointment(data: {
  clinic_id: string;
  patient_id: string;
  provider_id: string;
  service_type: string;
  start_time: string;
  end_time: string;
  booked_via?: string;
}) {
  return apiFetch("/api/appointments/book", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Dashboard APIs ---

export async function getDashboardToday(clinicId: string) {
  return apiFetch("/api/dashboard/today", {
    params: { clinic_id: clinicId },
  });
}

export async function getDashboardMetrics(clinicId: string, days = 30) {
  return apiFetch("/api/dashboard/metrics", {
    params: { clinic_id: clinicId, days: String(days) },
  });
}

export async function getDashboardCalls(
  clinicId: string,
  page = 1,
  limit = 20,
  filters?: { call_type?: string; outcome?: string; date_from?: string; date_to?: string }
) {
  const params: Record<string, string> = {
    clinic_id: clinicId,
    page: String(page),
    limit: String(limit),
  };
  if (filters?.call_type) params.call_type = filters.call_type;
  if (filters?.outcome) params.outcome = filters.outcome;
  if (filters?.date_from) params.date_from = filters.date_from;
  if (filters?.date_to) params.date_to = filters.date_to;
  return apiFetch("/api/dashboard/calls", { params });
}

export async function getRecallCampaigns(clinicId: string) {
  return apiFetch("/api/dashboard/recall", {
    params: { clinic_id: clinicId },
  });
}

export async function triggerRecallBuild() {
  return apiFetch("/api/recall/trigger", { method: "POST" });
}

// --- Agent Config ---

export async function getAgentConfig(clinicId: string) {
  return apiFetch(`/api/agents/${clinicId}`);
}

export async function updateAgentConfig(clinicId: string, data: any) {
  return apiFetch(`/api/agents/${clinicId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// --- Call Recordings ---

export async function getRecordingUrl(callId: string, clinicId: string) {
  return apiFetch(`/api/calls/${callId}/recording`, {
    params: { clinic_id: clinicId },
  });
}

// ============================================================
// Authenticated API — uses JWT, auto-resolves clinic from token
// ============================================================

// --- Authenticated Dashboard ---

export async function getMyDashboardToday(): Promise<DashboardToday> {
  return apiFetch<DashboardToday>("/api/me/dashboard/today");
}

export async function getMyDashboardMetrics(days = 30): Promise<MetricsResponse> {
  return apiFetch<MetricsResponse>("/api/me/dashboard/metrics", {
    params: { days: String(days) },
  });
}

export async function getMyDashboardCalls(
  page = 1,
  limit = 20,
  filters?: CallFilters
): Promise<PaginatedCalls> {
  const params: Record<string, string> = {
    page: String(page),
    limit: String(limit),
  };
  if (filters?.call_type) params.call_type = filters.call_type;
  if (filters?.outcome) params.outcome = filters.outcome;
  if (filters?.date_from) params.date_from = filters.date_from;
  if (filters?.date_to) params.date_to = filters.date_to;
  return apiFetch<PaginatedCalls>("/api/me/dashboard/calls", { params });
}

export async function getMyDashboardRecall() {
  return apiFetch("/api/me/dashboard/recall");
}

// --- Clinic ---

export async function getMyClinic(): Promise<Clinic> {
  return apiFetch<Clinic>("/api/clinics");
}

export async function updateMyClinic(data: Partial<Clinic>): Promise<Clinic> {
  return apiFetch<Clinic>("/api/clinics", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// --- Assistants ---

export async function getMyAssistants(): Promise<{ assistants: Assistant[] }> {
  return apiFetch("/api/assistants");
}

export async function createAssistant(data: Partial<Assistant>): Promise<Assistant> {
  return apiFetch<Assistant>("/api/assistants", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAssistant(id: string, data: Partial<Assistant>): Promise<Assistant> {
  return apiFetch<Assistant>(`/api/assistants/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteAssistant(id: string): Promise<void> {
  return apiFetch(`/api/assistants/${id}`, { method: "DELETE" });
}

// --- Phone Numbers ---

export async function getMyPhoneNumbers(): Promise<{ phone_numbers: PhoneNumber[] }> {
  return apiFetch("/api/phone-numbers");
}

export async function createPhoneNumber(data: { phone_number: string; label?: string; provider?: string }): Promise<PhoneNumber> {
  return apiFetch<PhoneNumber>("/api/phone-numbers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deletePhoneNumber(id: string): Promise<void> {
  return apiFetch(`/api/phone-numbers/${id}`, { method: "DELETE" });
}

// --- Demo Requests (public, no auth) ---

export async function submitDemoRequest(data: { name: string; email: string; clinic_name: string }) {
  return apiFetch("/api/demo-requests", {
    method: "POST",
    body: JSON.stringify(data),
    noAuth: true,
  });
}
