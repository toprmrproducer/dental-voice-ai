from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from datetime import datetime, date, timezone
from backend.models.schemas import LogCallRequest, TransferCallRequest
from backend.services.supabase_client import get_supabase
from backend.services import livekit_service
from backend.services import storage_service

router = APIRouter(prefix="/api/calls", tags=["calls"])


@router.post("/log")
async def log_call(req: LogCallRequest):
    """
    Log a completed call to the calls and call_transcripts tables.
    Also upserts today's clinic_metrics_daily row.
    """
    sb = get_supabase()

    call_data = {
        "clinic_id": req.clinic_id,
        "call_type": req.call_type,
        "phone_number_from": req.phone_number_from,
        "phone_number_to": req.phone_number_to,
        "duration_seconds": req.duration_seconds,
        "outcome": req.outcome,
        "livekit_room_name": req.livekit_room_name,
    }
    if req.patient_id:
        call_data["patient_id"] = req.patient_id

    call_resp = sb.table("calls").insert(call_data).execute()
    if not call_resp.data:
        raise HTTPException(status_code=500, detail="Failed to log call")

    call_record = call_resp.data[0]
    call_id = call_record["id"]

    if req.transcript_text or req.ai_summary:
        sb.table("call_transcripts").insert({
            "call_id": call_id,
            "clinic_id": req.clinic_id,
            "transcript_text": req.transcript_text or "",
            "ai_summary": req.ai_summary,
        }).execute()

    today_str = date.today().isoformat()

    existing_resp = (
        sb.table("clinic_metrics_daily")
        .select("*")
        .eq("clinic_id", req.clinic_id)
        .eq("date", today_str)
        .limit(1)
        .execute()
    )

    outcome_field_map = {
        "booked": "appointments_booked",
        "cancelled": "appointments_cancelled",
        "no_answer": "no_answer_count",
        "transferred": "transfers_to_human",
        "emergency": "transfers_to_human",
    }
    call_type_field_map = {
        "inbound": "inbound_calls",
        "outbound_reminder": "outbound_reminder_calls",
        "outbound_recall": "outbound_recall_calls",
    }

    if existing_resp.data:
        row = existing_resp.data[0]
        updates = {"total_calls": row["total_calls"] + 1}

        type_field = call_type_field_map.get(req.call_type)
        if type_field:
            updates[type_field] = row.get(type_field, 0) + 1

        outcome_field = outcome_field_map.get(req.outcome)
        if outcome_field:
            updates[outcome_field] = row.get(outcome_field, 0) + 1

        sb.table("clinic_metrics_daily").update(updates).eq("id", row["id"]).execute()
    else:
        new_row = {
            "clinic_id": req.clinic_id,
            "date": today_str,
            "total_calls": 1,
            "inbound_calls": 1 if req.call_type == "inbound" else 0,
            "outbound_reminder_calls": 1 if req.call_type == "outbound_reminder" else 0,
            "outbound_recall_calls": 1 if req.call_type == "outbound_recall" else 0,
            "appointments_booked": 1 if req.outcome == "booked" else 0,
            "appointments_cancelled": 1 if req.outcome == "cancelled" else 0,
            "no_answer_count": 1 if req.outcome == "no_answer" else 0,
            "transfers_to_human": 1 if req.outcome in ("transferred", "emergency") else 0,
        }
        sb.table("clinic_metrics_daily").insert(new_row).execute()

    return {"call_id": call_id, "status": "logged"}


@router.post("/transfer")
async def transfer_call(req: TransferCallRequest):
    """
    Transfer an active SIP call to the clinic's emergency escalation number
    or a specified number.
    """
    sb = get_supabase()

    transfer_to = req.transfer_to
    if not transfer_to:
        clinic_resp = (
            sb.table("clinics")
            .select("emergency_escalation_number, phone_number")
            .eq("id", req.clinic_id)
            .single()
            .execute()
        )
        clinic = clinic_resp.data
        if not clinic:
            raise HTTPException(status_code=404, detail="Clinic not found")
        transfer_to = clinic.get("emergency_escalation_number") or clinic.get("phone_number")
        if not transfer_to:
            raise HTTPException(status_code=400, detail="No escalation number configured for this clinic")

    result = await livekit_service.transfer_call(
        room_name=req.room_name,
        participant_identity=req.participant_identity,
        transfer_to=transfer_to,
    )

    return {"status": "transfer_initiated", "transfer_to": transfer_to, "details": result}


@router.post("/{call_id}/recording")
async def upload_recording(
    call_id: str,
    clinic_id: str = Query(...),
    file: UploadFile = File(...),
):
    """
    Upload a call recording to Supabase Storage.
    Files are stored under: call-recordings/{clinic_id}/{call_id}.{ext}
    """
    sb = get_supabase()
    call_resp = sb.table("calls").select("id").eq("id", call_id).eq("clinic_id", clinic_id).limit(1).execute()
    if not call_resp.data:
        raise HTTPException(status_code=404, detail="Call not found")

    file_data = await file.read()
    content_type = file.content_type or "audio/wav"

    path = storage_service.upload_recording(
        clinic_id=clinic_id,
        call_id=call_id,
        file_data=file_data,
        content_type=content_type,
    )

    return {"call_id": call_id, "recording_path": path, "status": "uploaded"}


@router.get("/{call_id}/recording")
async def get_recording_url(
    call_id: str,
    clinic_id: str = Query(...),
):
    """
    Get a signed URL for a call recording (valid for 1 hour).
    """
    sb = get_supabase()
    call_resp = (
        sb.table("calls")
        .select("id, recording_url")
        .eq("id", call_id)
        .eq("clinic_id", clinic_id)
        .limit(1)
        .execute()
    )
    if not call_resp.data:
        raise HTTPException(status_code=404, detail="Call not found")

    recording_path = call_resp.data[0].get("recording_url")
    if not recording_path:
        raise HTTPException(status_code=404, detail="No recording for this call")

    signed_url = storage_service.get_recording_signed_url(recording_path)
    return {"call_id": call_id, "signed_url": signed_url, "expires_in": 3600}
