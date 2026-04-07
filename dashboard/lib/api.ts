const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

async function apiFetch<T = any>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${BACKEND_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const res = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
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
