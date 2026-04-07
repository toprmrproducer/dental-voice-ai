import os
import asyncio
import logging
from twilio.rest import Client as TwilioClient

logger = logging.getLogger("twilio_service")

_client: TwilioClient | None = None


def get_twilio() -> TwilioClient:
    """Return a singleton Twilio client."""
    global _client
    if _client is None:
        sid = os.environ["TWILIO_ACCOUNT_SID"]
        token = os.environ["TWILIO_AUTH_TOKEN"]
        _client = TwilioClient(sid, token)
    return _client


async def send_sms(to: str, body: str, from_number: str | None = None) -> str:
    """Send an SMS via Twilio. Returns the Twilio message SID."""
    client = get_twilio()
    sender = from_number or os.environ["TWILIO_PHONE_NUMBER"]

    def _send():
        message = client.messages.create(
            to=to,
            from_=sender,
            body=body,
        )
        return message.sid

    sid = await asyncio.to_thread(_send)
    logger.info(f"SMS sent to {to} — SID: {sid}")
    return sid


async def send_appointment_confirmation_sms(
    to: str,
    patient_name: str,
    provider_name: str,
    service_type: str,
    appointment_time: str,
    clinic_name: str,
    from_number: str | None = None,
) -> str:
    """Send a formatted appointment confirmation SMS."""
    body = (
        f"Hi {patient_name}! Your {service_type} appointment with {provider_name} "
        f"at {clinic_name} is confirmed for {appointment_time}. "
        f"Reply STOP to opt out of texts."
    )
    return await send_sms(to, body, from_number)


async def send_cancellation_sms(
    to: str,
    patient_name: str,
    appointment_time: str,
    clinic_name: str,
    from_number: str | None = None,
) -> str:
    """Send a cancellation confirmation SMS."""
    body = (
        f"Hi {patient_name}, your appointment at {clinic_name} on {appointment_time} "
        f"has been cancelled. Call us anytime to rebook. Reply STOP to opt out."
    )
    return await send_sms(to, body, from_number)


async def send_reschedule_sms(
    to: str,
    patient_name: str,
    new_time: str,
    provider_name: str,
    clinic_name: str,
    from_number: str | None = None,
) -> str:
    """Send a reschedule confirmation SMS."""
    body = (
        f"Hi {patient_name}! Your appointment at {clinic_name} has been rescheduled "
        f"to {new_time} with {provider_name}. See you then! Reply STOP to opt out."
    )
    return await send_sms(to, body, from_number)


async def send_reminder_sms(
    to: str,
    patient_name: str,
    appointment_time: str,
    provider_name: str,
    clinic_name: str,
    from_number: str | None = None,
) -> str:
    """Send an appointment reminder SMS."""
    body = (
        f"Hi {patient_name}! Just a friendly reminder about your appointment "
        f"tomorrow at {appointment_time} with {provider_name} at {clinic_name}. "
        f"See you there! Reply STOP to opt out."
    )
    return await send_sms(to, body, from_number)
