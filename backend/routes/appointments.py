from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta, time as dt_time, date as dt_date, timezone
from zoneinfo import ZoneInfo
from backend.models.schemas import (
    BookAppointmentRequest,
    RescheduleAppointmentRequest,
    CancelAppointmentRequest,
    AppointmentResponse,
    AvailabilityResponse,
    AvailabilitySlot,
)
from backend.services.supabase_client import get_supabase
from backend.services import twilio_service

router = APIRouter(prefix="/api", tags=["appointments"])


@router.get("/availability", response_model=AvailabilityResponse)
async def check_availability(
    clinic_id: str = Query(...),
    date: str = Query(..., description="YYYY-MM-DD"),
    service_type: str = Query("Cleaning"),
    provider_id: str | None = Query(None),
):
    """
    Return available 30-minute slots for a given date, clinic, and optional provider.
    Checks clinic business hours and existing appointments to find open slots.
    """
    sb = get_supabase()

    clinic_resp = sb.table("clinics").select("*").eq("id", clinic_id).single().execute()
    clinic = clinic_resp.data
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")

    target_date = dt_date.fromisoformat(date)
    tz = ZoneInfo(clinic["timezone"])
    day_name = target_date.strftime("%a").lower()

    hours = clinic.get("business_hours_json", {})
    day_hours = hours.get(day_name)
    if not day_hours:
        return AvailabilityResponse(clinic_id=clinic_id, date=date, available_slots=[])

    open_time = dt_time.fromisoformat(day_hours["open"])
    close_time = dt_time.fromisoformat(day_hours["close"])

    providers_query = sb.table("providers").select("*").eq("clinic_id", clinic_id).eq("is_active", True)
    if provider_id:
        providers_query = providers_query.eq("id", provider_id)
    providers_resp = providers_query.execute()
    providers = providers_resp.data or []

    if not providers:
        return AvailabilityResponse(clinic_id=clinic_id, date=date, available_slots=[])

    day_start = datetime.combine(target_date, open_time, tzinfo=tz)
    day_end = datetime.combine(target_date, close_time, tzinfo=tz)

    available_slots: list[AvailabilitySlot] = []

    for provider in providers:
        appts_resp = (
            sb.table("appointments")
            .select("start_time, end_time")
            .eq("provider_id", provider["id"])
            .in_("status", ["scheduled", "confirmed"])
            .gte("start_time", day_start.isoformat())
            .lte("start_time", day_end.isoformat())
            .execute()
        )
        booked = appts_resp.data or []

        booked_ranges = []
        for b in booked:
            b_start = datetime.fromisoformat(b["start_time"])
            b_end = datetime.fromisoformat(b["end_time"])
            booked_ranges.append((b_start, b_end))

        slot_start = day_start
        slot_duration = timedelta(minutes=30)

        while slot_start + slot_duration <= day_end:
            slot_end = slot_start + slot_duration
            conflict = False
            for b_start, b_end in booked_ranges:
                if slot_start < b_end and slot_end > b_start:
                    conflict = True
                    break

            if not conflict:
                available_slots.append(AvailabilitySlot(
                    start_time=slot_start.isoformat(),
                    end_time=slot_end.isoformat(),
                    provider_id=provider["id"],
                    provider_name=provider["name"],
                ))

            slot_start += slot_duration

    return AvailabilityResponse(
        clinic_id=clinic_id,
        date=date,
        available_slots=available_slots,
    )


@router.post("/appointments/book", response_model=AppointmentResponse)
async def book_appointment(req: BookAppointmentRequest):
    """
    Book a new appointment. Sends SMS confirmation if patient has sms_consent.
    """
    sb = get_supabase()

    conflict_resp = (
        sb.table("appointments")
        .select("id")
        .eq("provider_id", req.provider_id)
        .in_("status", ["scheduled", "confirmed"])
        .lt("start_time", req.end_time)
        .gt("end_time", req.start_time)
        .limit(1)
        .execute()
    )
    if conflict_resp.data:
        raise HTTPException(status_code=409, detail="Time slot is already booked")

    insert_resp = (
        sb.table("appointments")
        .insert({
            "clinic_id": req.clinic_id,
            "patient_id": req.patient_id,
            "provider_id": req.provider_id,
            "service_type": req.service_type,
            "start_time": req.start_time,
            "end_time": req.end_time,
            "status": "scheduled",
            "booked_via": req.booked_via,
        })
        .execute()
    )

    if not insert_resp.data:
        raise HTTPException(status_code=500, detail="Failed to create appointment")

    appt = insert_resp.data[0]

    patient_resp = sb.table("patients").select("*").eq("id", req.patient_id).single().execute()
    provider_resp = sb.table("providers").select("name").eq("id", req.provider_id).single().execute()
    clinic_resp = sb.table("clinics").select("name, twilio_number, timezone").eq("id", req.clinic_id).single().execute()

    patient = patient_resp.data
    provider_name = provider_resp.data["name"] if provider_resp.data else ""
    clinic = clinic_resp.data or {}

    if patient and patient.get("sms_consent", False):
        tz = ZoneInfo(clinic.get("timezone", "America/New_York"))
        appt_time = datetime.fromisoformat(req.start_time).astimezone(tz)
        try:
            await twilio_service.send_appointment_confirmation_sms(
                to=patient["phone_number"],
                patient_name=patient["full_name"],
                provider_name=provider_name,
                service_type=req.service_type,
                appointment_time=appt_time.strftime("%A, %B %d at %I:%M %p"),
                clinic_name=clinic.get("name", "our clinic"),
                from_number=clinic.get("twilio_number"),
            )
        except Exception:
            pass

    return AppointmentResponse(
        id=appt["id"],
        clinic_id=appt["clinic_id"],
        patient_id=appt["patient_id"],
        provider_id=appt["provider_id"],
        service_type=appt["service_type"],
        start_time=appt["start_time"],
        end_time=appt["end_time"],
        status=appt["status"],
        booked_via=appt["booked_via"],
        provider_name=provider_name,
        patient_name=patient["full_name"] if patient else None,
    )


@router.post("/appointments/reschedule", response_model=AppointmentResponse)
async def reschedule_appointment(req: RescheduleAppointmentRequest):
    """
    Cancel the old appointment (status=rescheduled) and book at the new time.
    Sends SMS update if patient has consent.
    """
    sb = get_supabase()

    old_appt_resp = (
        sb.table("appointments")
        .select("*, patients(*), providers(name), clinics(name, twilio_number, timezone)")
        .eq("id", req.appointment_id)
        .single()
        .execute()
    )
    old_appt = old_appt_resp.data
    if not old_appt:
        raise HTTPException(status_code=404, detail="Original appointment not found")

    sb.table("appointments").update({
        "status": "rescheduled",
        "cancellation_reason": req.reason or "Rescheduled by patient",
    }).eq("id", req.appointment_id).execute()

    new_appt_resp = (
        sb.table("appointments")
        .insert({
            "clinic_id": old_appt["clinic_id"],
            "patient_id": old_appt["patient_id"],
            "provider_id": old_appt["provider_id"],
            "service_type": old_appt["service_type"],
            "start_time": req.new_start_time,
            "end_time": req.new_end_time,
            "status": "scheduled",
            "booked_via": old_appt.get("booked_via", "ai_inbound"),
        })
        .execute()
    )

    if not new_appt_resp.data:
        raise HTTPException(status_code=500, detail="Failed to create rescheduled appointment")

    new_appt = new_appt_resp.data[0]
    patient = old_appt.get("patients")
    provider = old_appt.get("providers", {})
    clinic = old_appt.get("clinics", {})

    provider_name = provider.get("name", "") if isinstance(provider, dict) else ""
    clinic_name = clinic.get("name", "") if isinstance(clinic, dict) else ""
    clinic_tz = clinic.get("timezone", "America/New_York") if isinstance(clinic, dict) else "America/New_York"
    twilio_num = clinic.get("twilio_number") if isinstance(clinic, dict) else None

    if patient and patient.get("sms_consent", False):
        tz = ZoneInfo(clinic_tz)
        new_time = datetime.fromisoformat(req.new_start_time).astimezone(tz)
        try:
            await twilio_service.send_reschedule_sms(
                to=patient["phone_number"],
                patient_name=patient["full_name"],
                new_time=new_time.strftime("%A, %B %d at %I:%M %p"),
                provider_name=provider_name,
                clinic_name=clinic_name,
                from_number=twilio_num,
            )
        except Exception:
            pass

    return AppointmentResponse(
        id=new_appt["id"],
        clinic_id=new_appt["clinic_id"],
        patient_id=new_appt["patient_id"],
        provider_id=new_appt["provider_id"],
        service_type=new_appt["service_type"],
        start_time=new_appt["start_time"],
        end_time=new_appt["end_time"],
        status=new_appt["status"],
        booked_via=new_appt["booked_via"],
        provider_name=provider_name,
        patient_name=patient["full_name"] if patient else None,
    )


@router.post("/appointments/cancel")
async def cancel_appointment(req: CancelAppointmentRequest):
    """
    Cancel an appointment. Sends SMS cancellation confirmation if consent given.
    """
    sb = get_supabase()

    appt_resp = (
        sb.table("appointments")
        .select("*, patients(*), clinics(name, twilio_number, timezone)")
        .eq("id", req.appointment_id)
        .single()
        .execute()
    )
    appt = appt_resp.data
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    sb.table("appointments").update({
        "status": "cancelled",
        "cancellation_reason": req.reason or "Cancelled by patient",
    }).eq("id", req.appointment_id).execute()

    patient = appt.get("patients")
    clinic = appt.get("clinics", {})

    if patient and patient.get("sms_consent", False):
        clinic_tz = clinic.get("timezone", "America/New_York") if isinstance(clinic, dict) else "America/New_York"
        tz = ZoneInfo(clinic_tz)
        appt_time = datetime.fromisoformat(appt["start_time"]).astimezone(tz)
        try:
            await twilio_service.send_cancellation_sms(
                to=patient["phone_number"],
                patient_name=patient["full_name"],
                appointment_time=appt_time.strftime("%A, %B %d at %I:%M %p"),
                clinic_name=clinic.get("name", "our clinic") if isinstance(clinic, dict) else "our clinic",
                from_number=clinic.get("twilio_number") if isinstance(clinic, dict) else None,
            )
        except Exception:
            pass

    return {"status": "cancelled", "appointment_id": req.appointment_id}
