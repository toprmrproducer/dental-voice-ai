import os
import json
import logging
import random
from livekit import api

logger = logging.getLogger("livekit_service")


async def create_outbound_call(
    room_name: str,
    phone_number: str,
    clinic_id: str,
    call_type: str,
    metadata: dict | None = None,
) -> dict:
    """
    Create a LiveKit room and SIP participant to initiate an outbound call.
    The LiveKit agent (configured with a dispatch rule) will automatically join.

    Args:
        room_name: Unique room name for this call session
        phone_number: E.164 phone number to dial
        clinic_id: Clinic UUID for multi-tenant routing
        call_type: 'outbound_reminder' or 'outbound_recall'
        metadata: Additional metadata to pass to the agent

    Returns:
        dict with room_name and sip_call_id
    """
    lk = api.LiveKitAPI(
        url=os.environ["LIVEKIT_URL"],
        api_key=os.environ["LIVEKIT_API_KEY"],
        api_secret=os.environ["LIVEKIT_API_SECRET"],
    )

    trunk_id = os.environ["LIVEKIT_SIP_OUTBOUND_TRUNK_ID"]
    caller_number = metadata.get("caller_id") if metadata else None

    room_metadata = json.dumps({
        "clinic_id": clinic_id,
        "call_type": call_type,
        "phone_number": phone_number,
        **(metadata or {}),
    })

    try:
        result = await lk.sip.create_sip_participant(
            api.CreateSIPParticipantRequest(
                room_name=room_name,
                sip_trunk_id=trunk_id,
                sip_call_to=phone_number,
                participant_identity=f"sip_{phone_number}",
                participant_name="Patient",
                room_metadata=room_metadata,
            )
        )
        logger.info(f"Outbound call initiated to {phone_number} in room {room_name}")
        return {
            "room_name": room_name,
            "sip_call_id": result.sip_call_id if hasattr(result, "sip_call_id") else str(result),
        }
    except Exception as e:
        logger.error(f"Failed to initiate outbound call to {phone_number}: {e}")
        raise
    finally:
        await lk.aclose()


async def transfer_call(
    room_name: str,
    participant_identity: str,
    transfer_to: str,
) -> dict:
    """
    Transfer a SIP call participant to another phone number via SIP REFER.

    Args:
        room_name: Current LiveKit room name
        participant_identity: Identity of the SIP participant to transfer
        transfer_to: E.164 phone number to transfer to

    Returns:
        dict with transfer status
    """
    lk = api.LiveKitAPI(
        url=os.environ["LIVEKIT_URL"],
        api_key=os.environ["LIVEKIT_API_KEY"],
        api_secret=os.environ["LIVEKIT_API_SECRET"],
    )
    sip_domain = os.environ.get("TWILIO_SIP_DOMAIN", "")

    if sip_domain and "@" not in transfer_to:
        clean_number = transfer_to.replace("tel:", "").replace("sip:", "")
        sip_uri = f"sip:{clean_number}@{sip_domain}"
    else:
        sip_uri = f"tel:{transfer_to}" if not transfer_to.startswith(("tel:", "sip:")) else transfer_to

    try:
        await lk.sip.transfer_sip_participant(
            api.TransferSIPParticipantRequest(
                room_name=room_name,
                participant_identity=participant_identity,
                transfer_to=sip_uri,
                play_dialtone=False,
            )
        )
        logger.info(f"Transfer initiated: {participant_identity} → {sip_uri}")
        return {"status": "transfer_initiated", "transfer_to": sip_uri}
    except Exception as e:
        logger.error(f"Transfer failed: {e}")
        raise
    finally:
        await lk.aclose()


def generate_room_name(phone_number: str, prefix: str = "call") -> str:
    """Generate a unique room name for a call session."""
    clean = phone_number.replace("+", "")
    suffix = random.randint(1000, 9999)
    return f"{prefix}-{clean}-{suffix}"
