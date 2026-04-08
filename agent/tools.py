"""
Dental Voice AI — Tool Implementations
All tools make real HTTP calls to the FastAPI backend.
"""

import os
import logging
import httpx
from difflib import SequenceMatcher
from typing import Annotated
from livekit.agents import llm

logger = logging.getLogger("dental-tools")

BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000")


class DentalTools(llm.FunctionContext):
    """All callable tools for the Dental AI Voice Agent."""

    def __init__(self, clinic_id: str, faq_bank: list[dict] | None = None):
        super().__init__()
        self._clinic_id = clinic_id
        self._faq_bank = faq_bank or []

    @llm.ai_callable(description="Look up a patient by their phone number to identify who is calling.")
    async def lookup_patient(
        self,
        phone_number: Annotated[str, llm.TypeInfo(description="The caller's phone number in E.164 format, e.g. +15551234567")],
    ) -> str:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/patients/lookup",
                json={"phone_number": phone_number, "clinic_id": self._clinic_id},
            )
            data = resp.json()

        if not data.get("found"):
            return "Patient not found in our system. Please ask for their full name and date of birth."

        patient = data["patient"]
        result = f"Patient found: {patient['full_name']}"

        if patient.get("last_visit_date"):
            result += f". Last visit: {patient['last_visit_date']}"

        if data.get("next_appointment"):
            appt = data["next_appointment"]
            result += (
                f". Next appointment: {appt['service_type']} on {appt['start_time']}"
                f" with {appt.get('provider_name', 'a provider')}"
            )

        if data.get("family_members"):
            names = [m["full_name"] for m in data["family_members"]]
            result += f". Family members on this account: {', '.join(names)}"

        return result

    @llm.ai_callable(description="Check available appointment slots for a given date and optionally a specific provider.")
    async def check_availability(
        self,
        date: Annotated[str, llm.TypeInfo(description="The desired date in YYYY-MM-DD format")],
        service_type: Annotated[str, llm.TypeInfo(description="Type of service: Cleaning, Exam, X-ray, Filling, Extraction, Whitening, Emergency Care")],
        provider_id: Annotated[str, llm.TypeInfo(description="Optional provider UUID. Leave blank to check all providers.")] = "",
    ) -> str:
        params = {
            "clinic_id": self._clinic_id,
            "date": date,
            "service_type": service_type,
        }
        if provider_id:
            params["provider_id"] = provider_id

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{BACKEND_URL}/api/availability", params=params)
            data = resp.json()

        slots = data.get("available_slots", [])
        if not slots:
            return f"No available slots on {date}. Please ask the patient to suggest another date."

        lines = []
        for s in slots[:6]:
            from datetime import datetime
            try:
                start_dt = datetime.fromisoformat(s["start_time"])
                time_str = start_dt.strftime("%I:%M %p")
            except Exception:
                time_str = s["start_time"]
            lines.append(f"- {time_str} with {s['provider_name']} (provider_id: {s['provider_id']})")

        return f"Available slots on {date}:\n" + "\n".join(lines)

    @llm.ai_callable(description="Book a confirmed appointment for a patient.")
    async def book_appointment(
        self,
        patient_id: Annotated[str, llm.TypeInfo(description="The patient's UUID")],
        provider_id: Annotated[str, llm.TypeInfo(description="The provider's UUID")],
        service_type: Annotated[str, llm.TypeInfo(description="Type of service")],
        start_time: Annotated[str, llm.TypeInfo(description="Start time in ISO format from the availability check")],
        end_time: Annotated[str, llm.TypeInfo(description="End time in ISO format from the availability check")],
    ) -> str:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/appointments/book",
                json={
                    "clinic_id": self._clinic_id,
                    "patient_id": patient_id,
                    "provider_id": provider_id,
                    "service_type": service_type,
                    "start_time": start_time,
                    "end_time": end_time,
                    "booked_via": "ai_inbound",
                },
            )

        if resp.status_code == 409:
            return "That time slot is already booked. Please check availability again for another slot."

        if resp.status_code != 200:
            return f"Failed to book appointment. Error: {resp.text}"

        data = resp.json()
        return (
            f"Appointment confirmed! {data.get('service_type', service_type)} with "
            f"{data.get('provider_name', 'the provider')} on {data.get('start_time', start_time)}. "
            f"A text confirmation will be sent to the patient."
        )

    @llm.ai_callable(description="Reschedule an existing appointment to a new time.")
    async def reschedule_appointment(
        self,
        appointment_id: Annotated[str, llm.TypeInfo(description="The appointment UUID to reschedule")],
        new_start_time: Annotated[str, llm.TypeInfo(description="New start time in ISO format")],
        new_end_time: Annotated[str, llm.TypeInfo(description="New end time in ISO format")],
        reason: Annotated[str, llm.TypeInfo(description="Reason for rescheduling")] = "Patient requested reschedule",
    ) -> str:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/appointments/reschedule",
                json={
                    "appointment_id": appointment_id,
                    "new_start_time": new_start_time,
                    "new_end_time": new_end_time,
                    "reason": reason,
                },
            )

        if resp.status_code != 200:
            return f"Failed to reschedule. Error: {resp.text}"

        data = resp.json()
        return (
            f"Appointment rescheduled successfully to {data.get('start_time', new_start_time)} "
            f"with {data.get('provider_name', 'the provider')}. "
            f"A text update will be sent to the patient."
        )

    @llm.ai_callable(description="Cancel an existing appointment.")
    async def cancel_appointment(
        self,
        appointment_id: Annotated[str, llm.TypeInfo(description="The appointment UUID to cancel")],
        reason: Annotated[str, llm.TypeInfo(description="Reason for cancellation")] = "Patient requested cancellation",
    ) -> str:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/appointments/cancel",
                json={
                    "appointment_id": appointment_id,
                    "reason": reason,
                },
            )

        if resp.status_code != 200:
            return f"Failed to cancel. Error: {resp.text}"

        return "Appointment cancelled successfully. A cancellation confirmation text will be sent."

    @llm.ai_callable(description="Answer a frequently asked question about the dental practice.")
    async def get_faq_answer(
        self,
        question: Annotated[str, llm.TypeInfo(description="The patient's question")],
    ) -> str:
        if not self._faq_bank:
            return "I don't have FAQ information available. Let me connect you with our team for that answer."

        best_match = None
        best_score = 0.0

        question_lower = question.lower()

        for faq in self._faq_bank:
            faq_q = faq.get("question", "").lower()
            score = SequenceMatcher(None, question_lower, faq_q).ratio()

            keywords_q = set(question_lower.split())
            keywords_faq = set(faq_q.split())
            overlap = keywords_q & keywords_faq
            keyword_bonus = len(overlap) * 0.05

            total_score = score + keyword_bonus

            if total_score > best_score:
                best_score = total_score
                best_match = faq

        if best_match and best_score >= 0.3:
            return best_match.get("answer", "I don't have a specific answer for that.")

        return (
            "I don't have a specific answer for that question in our FAQ. "
            "I'd recommend calling during business hours to speak with our front desk team."
        )

    @llm.ai_callable(description="Escalate the call to a human. Use for emergencies or when the patient explicitly requests a human.")
    async def escalate_to_human(
        self,
        reason: Annotated[str, llm.TypeInfo(description="Reason for escalation: 'emergency', 'patient_request', or other")],
    ) -> str:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/calls/transfer",
                json={
                    "clinic_id": self._clinic_id,
                    "room_name": self._room_name if hasattr(self, "_room_name") else "",
                    "participant_identity": self._participant_identity if hasattr(self, "_participant_identity") else "",
                    "transfer_to": None,
                },
            )

        if resp.status_code != 200:
            return (
                "I wasn't able to transfer the call automatically. "
                "Please call our main office line directly for immediate assistance."
            )

        return "Transfer initiated. Connecting you to our team now. Please hold for just a moment."

    @llm.ai_callable(description="Log the outcome of a completed call.")
    async def log_call_outcome(
        self,
        outcome: Annotated[str, llm.TypeInfo(description="Call outcome: booked, rescheduled, cancelled, faq, transferred, no_answer, voicemail, emergency")],
        patient_id: Annotated[str, llm.TypeInfo(description="Patient UUID if identified")] = "",
        duration: Annotated[int, llm.TypeInfo(description="Call duration in seconds")] = 0,
        transcript: Annotated[str, llm.TypeInfo(description="Brief transcript or summary of the call")] = "",
        ai_summary: Annotated[str, llm.TypeInfo(description="AI-generated summary of call outcome")] = "",
    ) -> str:
        call_type = getattr(self, "_call_type", "inbound")
        phone_from = getattr(self, "_phone_from", "")
        phone_to = getattr(self, "_phone_to", "")
        room_name = getattr(self, "_room_name", "")

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/calls/log",
                json={
                    "clinic_id": self._clinic_id,
                    "call_type": call_type,
                    "phone_number_from": phone_from,
                    "phone_number_to": phone_to,
                    "duration_seconds": duration,
                    "outcome": outcome,
                    "livekit_room_name": room_name,
                    "transcript_text": transcript,
                    "ai_summary": ai_summary,
                    "patient_id": patient_id if patient_id else None,
                },
            )

        if resp.status_code != 200:
            logger.error(f"Failed to log call: {resp.text}")
            return "Call outcome noted."

        return "Call outcome logged successfully."

    @llm.ai_callable(description="Send an SMS reminder to a patient about their upcoming appointment.")
    async def send_sms_reminder(
        self,
        patient_id: Annotated[str, llm.TypeInfo(description="The patient's UUID")],
        appointment_id: Annotated[str, llm.TypeInfo(description="The appointment UUID")] = "",
    ) -> str:
        message = (
            "Hi! This is a reminder from your dental office about your upcoming appointment. "
            "Please call us if you need to reschedule."
        )

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/sms/send",
                json={
                    "clinic_id": self._clinic_id,
                    "patient_id": patient_id,
                    "message_body": message,
                    "message_type": "reminder",
                },
            )

        data = resp.json()
        if data.get("sent"):
            return "SMS reminder sent successfully."
        return f"SMS not sent: {data.get('reason', 'unknown error')}"

    @llm.ai_callable(description="Log the outcome of a recall campaign call.")
    async def log_recall_outcome(
        self,
        recall_campaign_id: Annotated[str, llm.TypeInfo(description="The recall campaign UUID")],
        status: Annotated[str, llm.TypeInfo(description="Outcome status: booked, declined, no_answer, opted_out, callback_requested")],
        callback_time: Annotated[str, llm.TypeInfo(description="If callback requested, the preferred callback time in ISO format")] = "",
    ) -> str:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.patch(
                f"{BACKEND_URL}/api/recall/{recall_campaign_id}",
                json={
                    "status": status,
                    "callback_time": callback_time if callback_time else None,
                },
            )

        if resp.status_code != 200:
            logger.error(f"Failed to update recall campaign: {resp.text}")
            return "Recall outcome noted."

        return f"Recall campaign updated: {status}"

    def set_call_context(
        self,
        room_name: str = "",
        participant_identity: str = "",
        call_type: str = "inbound",
        phone_from: str = "",
        phone_to: str = "",
    ):
        """Set runtime call context for tools that need room/participant info."""
        self._room_name = room_name
        self._participant_identity = participant_identity
        self._call_type = call_type
        self._phone_from = phone_from
        self._phone_to = phone_to
