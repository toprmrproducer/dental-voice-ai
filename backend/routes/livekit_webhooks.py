"""
LiveKit-specific webhook handlers.
Processes room lifecycle events and updates call records accordingly.
"""

import logging
from fastapi import APIRouter, Request, HTTPException

from backend.services.supabase_client import get_supabase

logger = logging.getLogger("livekit-webhooks")

router = APIRouter(prefix="/api/webhooks/livekit", tags=["livekit-webhooks"])


@router.post("")
async def livekit_webhook(request: Request):
    """
    Handle LiveKit webhook events:
    - room_started: log room creation
    - room_finished: finalize call record if outcome missing
    - participant_joined / participant_left: track participation
    - track_published: log media tracks
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
        # Parse room metadata for clinic/call info
        metadata = room.get("metadata", "")
        if metadata:
            try:
                import json
                meta = json.loads(metadata)
                logger.info(f"Room metadata: clinic_id={meta.get('clinic_id')}, call_type={meta.get('call_type')}")
            except Exception:
                pass

    elif event == "room_finished":
        logger.info(f"Room finished: {room_name}")
        # Finalize any call records missing an outcome
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
