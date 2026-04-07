from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date


# ---------- Patients ----------

class PatientLookupRequest(BaseModel):
    phone_number: str
    clinic_id: str


class PatientRecord(BaseModel):
    id: str
    clinic_id: str
    phone_number: str
    full_name: str
    date_of_birth: Optional[str] = None
    family_account_id: Optional[str] = None
    last_visit_date: Optional[str] = None
    sms_consent: bool = False
    recall_consent: bool = False
    do_not_call: bool = False


class PatientLookupResponse(BaseModel):
    found: bool
    patient: Optional[PatientRecord] = None
    family_members: list[PatientRecord] = []
    next_appointment: Optional[dict] = None


# ---------- Availability ----------

class AvailabilitySlot(BaseModel):
    start_time: str
    end_time: str
    provider_id: str
    provider_name: str


class AvailabilityResponse(BaseModel):
    clinic_id: str
    date: str
    available_slots: list[AvailabilitySlot]


# ---------- Appointments ----------

class BookAppointmentRequest(BaseModel):
    clinic_id: str
    patient_id: str
    provider_id: str
    service_type: str
    start_time: str
    end_time: str
    booked_via: str = "ai_inbound"


class RescheduleAppointmentRequest(BaseModel):
    appointment_id: str
    new_start_time: str
    new_end_time: str
    reason: str = ""


class CancelAppointmentRequest(BaseModel):
    appointment_id: str
    reason: str = ""


class AppointmentResponse(BaseModel):
    id: str
    clinic_id: str
    patient_id: str
    provider_id: str
    service_type: str
    start_time: str
    end_time: str
    status: str
    booked_via: str
    provider_name: Optional[str] = None
    patient_name: Optional[str] = None


# ---------- Calls ----------

class LogCallRequest(BaseModel):
    clinic_id: str
    call_type: str
    phone_number_from: str
    phone_number_to: str
    duration_seconds: int = 0
    outcome: str
    livekit_room_name: Optional[str] = None
    transcript_text: Optional[str] = None
    ai_summary: Optional[str] = None
    patient_id: Optional[str] = None


class TransferCallRequest(BaseModel):
    clinic_id: str
    room_name: str
    participant_identity: str
    transfer_to: Optional[str] = None


# ---------- SMS ----------

class SendSMSRequest(BaseModel):
    clinic_id: str
    patient_id: str
    message_body: str
    message_type: str = "general"


# ---------- Dashboard ----------

class DashboardTodayResponse(BaseModel):
    total_calls: int = 0
    appointments_booked_today: int = 0
    reminders_sent: int = 0
    recalls_made: int = 0
    recent_calls: list[dict] = []
    todays_appointments: list[dict] = []


class MetricDay(BaseModel):
    date: str
    total_calls: int
    inbound_calls: int
    outbound_reminder_calls: int
    outbound_recall_calls: int
    appointments_booked: int
    appointments_cancelled: int
    no_answer_count: int
    transfers_to_human: int


class DashboardMetricsResponse(BaseModel):
    days: int
    metrics: list[MetricDay]


class PaginatedCallsResponse(BaseModel):
    page: int
    limit: int
    total: int
    calls: list[dict]


# ---------- Recall ----------

class RecallTriggerResponse(BaseModel):
    queued: int
    message: str


class RecallUpdateRequest(BaseModel):
    status: str
    callback_time: Optional[str] = None


# ---------- Webhooks ----------

class LiveKitWebhookEvent(BaseModel):
    event: str
    room: Optional[dict] = None
    participant: Optional[dict] = None
    id: Optional[str] = None


# ---------- Agent Configuration ----------

class AgentConfigUpdate(BaseModel):
    agent_name: Optional[str] = None
    voice_id: Optional[str] = None
    business_hours_json: Optional[dict] = None
    emergency_escalation_number: Optional[str] = None
    faq_bank_json: Optional[list[dict]] = None
    providers: Optional[list[dict]] = None
