from fastapi import APIRouter, HTTPException, Path
from backend.models.schemas import RecallTriggerResponse, RecallUpdateRequest
from backend.services.supabase_client import get_supabase
from backend.services.scheduler import recall_queue_builder_job

router = APIRouter(prefix="/api/recall", tags=["recall"])


@router.post("/trigger", response_model=RecallTriggerResponse)
async def trigger_recall_build():
    """
    Manually trigger the recall queue builder.
    Useful for the dashboard 'Run Recall Now' button.
    """
    await recall_queue_builder_job()

    sb = get_supabase()
    pending_resp = (
        sb.table("recall_campaigns")
        .select("id", count="exact")
        .eq("status", "pending")
        .execute()
    )
    count = pending_resp.count or 0

    return RecallTriggerResponse(
        queued=count,
        message=f"Recall queue rebuilt. {count} patients pending outreach.",
    )


@router.patch("/{recall_id}")
async def update_recall_campaign(
    recall_id: str = Path(...),
    req: RecallUpdateRequest = ...,
):
    """
    Update a recall campaign's status after a call outcome.
    If status is 'opted_out', also set patient.do_not_call = true.
    """
    sb = get_supabase()

    campaign_resp = (
        sb.table("recall_campaigns")
        .select("*")
        .eq("id", recall_id)
        .single()
        .execute()
    )
    campaign = campaign_resp.data
    if not campaign:
        raise HTTPException(status_code=404, detail="Recall campaign not found")

    update_data = {"status": req.status}
    sb.table("recall_campaigns").update(update_data).eq("id", recall_id).execute()

    if req.status == "opted_out":
        sb.table("patients").update({
            "do_not_call": True,
            "recall_consent": False,
        }).eq("id", campaign["patient_id"]).execute()

    if req.status == "booked":
        pass

    if req.callback_time:
        sb.table("recall_campaigns").insert({
            "clinic_id": campaign["clinic_id"],
            "patient_id": campaign["patient_id"],
            "scheduled_call_time": req.callback_time,
            "status": "pending",
        }).execute()

    return {"recall_id": recall_id, "status": req.status}
