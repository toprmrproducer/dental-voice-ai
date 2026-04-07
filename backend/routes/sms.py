from fastapi import APIRouter, HTTPException
from backend.models.schemas import SendSMSRequest
from backend.services.supabase_client import get_supabase
from backend.services import twilio_service

router = APIRouter(prefix="/api/sms", tags=["sms"])


@router.post("/send")
async def send_sms(req: SendSMSRequest):
    """
    Send an SMS to a patient. Checks sms_consent before sending.
    Logs the attempt in sms_messages regardless of consent result.
    """
    sb = get_supabase()

    patient_resp = (
        sb.table("patients")
        .select("phone_number, full_name, sms_consent")
        .eq("id", req.patient_id)
        .eq("clinic_id", req.clinic_id)
        .single()
        .execute()
    )
    patient = patient_resp.data
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    clinic_resp = (
        sb.table("clinics")
        .select("twilio_number, name")
        .eq("id", req.clinic_id)
        .single()
        .execute()
    )
    clinic = clinic_resp.data or {}
    from_number = clinic.get("twilio_number")

    sms_record = {
        "clinic_id": req.clinic_id,
        "patient_id": req.patient_id,
        "direction": "outbound",
        "message_body": req.message_body,
        "status": "pending",
    }

    if not patient.get("sms_consent", False):
        sms_record["status"] = "blocked_no_consent"
        sb.table("sms_messages").insert(sms_record).execute()
        return {
            "sent": False,
            "reason": "Patient has not given SMS consent",
            "patient_name": patient["full_name"],
        }

    try:
        twilio_sid = await twilio_service.send_sms(
            to=patient["phone_number"],
            body=req.message_body,
            from_number=from_number,
        )
        sms_record["twilio_sid"] = twilio_sid
        sms_record["status"] = "sent"
    except Exception as e:
        sms_record["status"] = "failed"
        sms_record["twilio_sid"] = None
        sb.table("sms_messages").insert(sms_record).execute()
        raise HTTPException(status_code=500, detail=f"Failed to send SMS: {str(e)}")

    sb.table("sms_messages").insert(sms_record).execute()

    return {
        "sent": True,
        "twilio_sid": twilio_sid,
        "patient_name": patient["full_name"],
    }
