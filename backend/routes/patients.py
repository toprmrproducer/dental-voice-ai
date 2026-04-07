from fastapi import APIRouter, HTTPException
from backend.models.schemas import PatientLookupRequest, PatientLookupResponse, PatientRecord
from backend.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.post("/lookup", response_model=PatientLookupResponse)
async def lookup_patient(req: PatientLookupRequest):
    """
    Look up a patient by phone number within a clinic.
    Returns the patient record, family members on the same number,
    and the next upcoming appointment if any.
    """
    sb = get_supabase()

    patients_resp = (
        sb.table("patients")
        .select("*")
        .eq("clinic_id", req.clinic_id)
        .eq("phone_number", req.phone_number)
        .execute()
    )
    matches = patients_resp.data or []

    if not matches:
        return PatientLookupResponse(found=False)

    primary = matches[0]
    patient_record = PatientRecord(**primary)

    family_members = []
    if len(matches) > 1:
        family_members = [PatientRecord(**m) for m in matches[1:]]
    elif primary.get("family_account_id"):
        fam_resp = (
            sb.table("patients")
            .select("*")
            .eq("family_account_id", primary["family_account_id"])
            .neq("id", primary["id"])
            .execute()
        )
        family_members = [PatientRecord(**m) for m in (fam_resp.data or [])]

    next_appointment = None
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()
    appt_resp = (
        sb.table("appointments")
        .select("*, providers(name)")
        .eq("patient_id", primary["id"])
        .in_("status", ["scheduled", "confirmed"])
        .gte("start_time", now_iso)
        .order("start_time")
        .limit(1)
        .execute()
    )
    if appt_resp.data:
        a = appt_resp.data[0]
        provider_name = ""
        if isinstance(a.get("providers"), dict):
            provider_name = a["providers"].get("name", "")
        elif isinstance(a.get("providers"), list) and a["providers"]:
            provider_name = a["providers"][0].get("name", "")
        next_appointment = {
            "id": a["id"],
            "service_type": a["service_type"],
            "start_time": a["start_time"],
            "end_time": a["end_time"],
            "status": a["status"],
            "provider_name": provider_name,
        }

    return PatientLookupResponse(
        found=True,
        patient=patient_record,
        family_members=family_members,
        next_appointment=next_appointment,
    )
