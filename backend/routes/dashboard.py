from fastapi import APIRouter, Query
from datetime import datetime, date, timedelta, timezone
from backend.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/today")
async def dashboard_today(clinic_id: str = Query(...)):
    """
    Return today's overview: call count, appointments booked,
    reminders sent, recalls made, recent calls, and today's appointments.
    """
    sb = get_supabase()
    today_str = date.today().isoformat()
    today_start = f"{today_str}T00:00:00+00:00"
    today_end = f"{today_str}T23:59:59+00:00"

    calls_resp = (
        sb.table("calls")
        .select("*, patients(full_name)")
        .eq("clinic_id", clinic_id)
        .gte("created_at", today_start)
        .lte("created_at", today_end)
        .order("created_at", desc=True)
        .execute()
    )
    calls = calls_resp.data or []

    total_calls = len(calls)
    reminders_sent = sum(1 for c in calls if c.get("call_type") == "outbound_reminder")
    recalls_made = sum(1 for c in calls if c.get("call_type") == "outbound_recall")

    booked_resp = (
        sb.table("appointments")
        .select("id")
        .eq("clinic_id", clinic_id)
        .gte("created_at", today_start)
        .lte("created_at", today_end)
        .execute()
    )
    appointments_booked = len(booked_resp.data or [])

    recent_calls = []
    for c in calls[:10]:
        patient = c.get("patients")
        patient_name = ""
        if isinstance(patient, dict):
            patient_name = patient.get("full_name", "")
        elif isinstance(patient, list) and patient:
            patient_name = patient[0].get("full_name", "")

        recent_calls.append({
            "id": c["id"],
            "time": c["created_at"],
            "patient_name": patient_name or "Unknown",
            "call_type": c["call_type"],
            "duration": c.get("duration_seconds", 0),
            "outcome": c.get("outcome", ""),
            "phone": c.get("phone_number_from") or c.get("phone_number_to", ""),
        })

    appts_resp = (
        sb.table("appointments")
        .select("*, patients(full_name), providers(name)")
        .eq("clinic_id", clinic_id)
        .gte("start_time", today_start)
        .lte("start_time", today_end)
        .order("start_time")
        .execute()
    )
    todays_appointments = []
    for a in (appts_resp.data or []):
        pat = a.get("patients")
        prov = a.get("providers")
        patient_name = ""
        if isinstance(pat, dict):
            patient_name = pat.get("full_name", "")
        elif isinstance(pat, list) and pat:
            patient_name = pat[0].get("full_name", "")
        provider_name = ""
        if isinstance(prov, dict):
            provider_name = prov.get("name", "")
        elif isinstance(prov, list) and prov:
            provider_name = prov[0].get("name", "")

        todays_appointments.append({
            "id": a["id"],
            "start_time": a["start_time"],
            "end_time": a["end_time"],
            "patient_name": patient_name,
            "provider_name": provider_name,
            "service_type": a["service_type"],
            "status": a["status"],
        })

    return {
        "total_calls": total_calls,
        "appointments_booked_today": appointments_booked,
        "reminders_sent": reminders_sent,
        "recalls_made": recalls_made,
        "recent_calls": recent_calls,
        "todays_appointments": todays_appointments,
    }


@router.get("/metrics")
async def dashboard_metrics(clinic_id: str = Query(...), days: int = Query(30)):
    """
    Return daily metrics for the last N days for chart rendering.
    """
    sb = get_supabase()
    start_date = (date.today() - timedelta(days=days)).isoformat()

    resp = (
        sb.table("clinic_metrics_daily")
        .select("*")
        .eq("clinic_id", clinic_id)
        .gte("date", start_date)
        .order("date")
        .execute()
    )

    metrics = []
    for row in (resp.data or []):
        metrics.append({
            "date": row["date"],
            "total_calls": row.get("total_calls", 0),
            "inbound_calls": row.get("inbound_calls", 0),
            "outbound_reminder_calls": row.get("outbound_reminder_calls", 0),
            "outbound_recall_calls": row.get("outbound_recall_calls", 0),
            "appointments_booked": row.get("appointments_booked", 0),
            "appointments_cancelled": row.get("appointments_cancelled", 0),
            "no_answer_count": row.get("no_answer_count", 0),
            "transfers_to_human": row.get("transfers_to_human", 0),
        })

    return {"days": days, "metrics": metrics}


@router.get("/calls")
async def dashboard_calls(
    clinic_id: str = Query(...),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    call_type: str | None = Query(None),
    outcome: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
):
    """
    Paginated call history with optional filters.
    Includes transcript summary from call_transcripts.
    """
    sb = get_supabase()
    offset = (page - 1) * limit

    query = (
        sb.table("calls")
        .select("*, patients(full_name, phone_number), call_transcripts(ai_summary, transcript_text)", count="exact")
        .eq("clinic_id", clinic_id)
    )

    if call_type:
        query = query.eq("call_type", call_type)
    if outcome:
        query = query.eq("outcome", outcome)
    if date_from:
        query = query.gte("created_at", f"{date_from}T00:00:00+00:00")
    if date_to:
        query = query.lte("created_at", f"{date_to}T23:59:59+00:00")

    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)

    resp = query.execute()
    rows = resp.data or []
    total = resp.count or 0

    calls = []
    for row in rows:
        patient = row.get("patients")
        transcripts = row.get("call_transcripts", [])

        patient_name = ""
        patient_phone = ""
        if isinstance(patient, dict):
            patient_name = patient.get("full_name", "")
            patient_phone = patient.get("phone_number", "")
        elif isinstance(patient, list) and patient:
            patient_name = patient[0].get("full_name", "")
            patient_phone = patient[0].get("phone_number", "")

        ai_summary = ""
        transcript_text = ""
        if isinstance(transcripts, list) and transcripts:
            ai_summary = transcripts[0].get("ai_summary", "")
            transcript_text = transcripts[0].get("transcript_text", "")
        elif isinstance(transcripts, dict):
            ai_summary = transcripts.get("ai_summary", "")
            transcript_text = transcripts.get("transcript_text", "")

        calls.append({
            "id": row["id"],
            "created_at": row["created_at"],
            "call_type": row["call_type"],
            "phone_number_from": row["phone_number_from"],
            "phone_number_to": row["phone_number_to"],
            "duration_seconds": row.get("duration_seconds", 0),
            "outcome": row.get("outcome", ""),
            "patient_name": patient_name or "Unknown",
            "patient_phone": patient_phone,
            "ai_summary": ai_summary,
            "transcript_text": transcript_text,
        })

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "calls": calls,
    }


@router.get("/recall")
async def dashboard_recall(clinic_id: str = Query(...)):
    """
    Return recall campaign list with patient info and outcomes.
    """
    sb = get_supabase()

    resp = (
        sb.table("recall_campaigns")
        .select("*, patients(full_name, phone_number, last_visit_date)")
        .eq("clinic_id", clinic_id)
        .order("created_at", desc=True)
        .limit(200)
        .execute()
    )

    campaigns = []
    for row in (resp.data or []):
        patient = row.get("patients")
        patient_name = ""
        patient_phone = ""
        last_visit = ""
        if isinstance(patient, dict):
            patient_name = patient.get("full_name", "")
            patient_phone = patient.get("phone_number", "")
            last_visit = patient.get("last_visit_date", "")

        booked_resp = (
            sb.table("appointments")
            .select("id")
            .eq("patient_id", row["patient_id"])
            .in_("status", ["scheduled", "confirmed"])
            .limit(1)
            .execute()
        )
        has_appointment = bool(booked_resp.data)

        campaigns.append({
            "id": row["id"],
            "patient_name": patient_name,
            "patient_phone": patient_phone,
            "last_visit_date": last_visit,
            "status": row["status"],
            "scheduled_call_time": row.get("scheduled_call_time"),
            "call_id": row.get("call_id"),
            "appointment_booked": has_appointment,
            "created_at": row["created_at"],
        })

    return {"campaigns": campaigns}
