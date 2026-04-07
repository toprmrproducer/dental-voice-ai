import logging
from fastapi import APIRouter, Request, HTTPException
from backend.services.supabase_client import get_supabase

logger = logging.getLogger("webhooks")

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.post("/livekit")
async def livekit_webhook(request: Request):
    """
    Handle LiveKit webhook events:
    - room_started: log room creation
    - room_finished: trigger call logging if not already done
    - participant_joined / participant_left: track participation
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event = body.get("event", "")
    room = body.get("room", {})
    participant = body.get("participant", {})
    room_name = room.get("name", "")

    logger.info(f"LiveKit webhook: event={event}, room={room_name}")

    sb = get_supabase()

    if event == "room_started":
        logger.info(f"Room started: {room_name}")

    elif event == "room_finished":
        logger.info(f"Room finished: {room_name}")

        existing_resp = (
            sb.table("calls")
            .select("id, outcome")
            .eq("livekit_room_name", room_name)
            .limit(1)
            .execute()
        )

        if existing_resp.data:
            call = existing_resp.data[0]
            if not call.get("outcome"):
                sb.table("calls").update({
                    "outcome": "no_answer",
                }).eq("id", call["id"]).execute()
                logger.info(f"Updated call {call['id']} outcome to no_answer on room finish")

    elif event == "participant_joined":
        identity = participant.get("identity", "")
        logger.info(f"Participant joined room {room_name}: {identity}")

    elif event == "participant_left":
        identity = participant.get("identity", "")
        logger.info(f"Participant left room {room_name}: {identity}")

    return {"status": "ok"}


@router.post("/twilio/status")
async def twilio_status_callback(request: Request):
    """
    Handle Twilio call status updates.
    Updates call record outcome based on Twilio CallStatus.
    """
    form = await request.form()
    call_sid = form.get("CallSid", "")
    call_status = form.get("CallStatus", "")
    call_duration = form.get("CallDuration", "0")
    called = form.get("Called", "")
    caller = form.get("Caller", "")

    logger.info(f"Twilio status callback: SID={call_sid}, status={call_status}, duration={call_duration}")

    sb = get_supabase()

    status_to_outcome = {
        "completed": None,
        "no-answer": "no_answer",
        "busy": "no_answer",
        "failed": "no_answer",
        "canceled": "cancelled",
    }

    outcome = status_to_outcome.get(call_status)

    if outcome and called:
        call_resp = (
            sb.table("calls")
            .select("id, outcome")
            .eq("phone_number_to", called)
            .is_("outcome", "null")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        if call_resp.data:
            call_id = call_resp.data[0]["id"]
            update_data = {"outcome": outcome}
            try:
                duration_int = int(call_duration)
                if duration_int > 0:
                    update_data["duration_seconds"] = duration_int
            except (ValueError, TypeError):
                pass

            sb.table("calls").update(update_data).eq("id", call_id).execute()
            logger.info(f"Updated call {call_id} with outcome={outcome}")

    return {"status": "ok"}
