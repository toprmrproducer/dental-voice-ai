"""
Dental Voice AI — Call Handler
Routes incoming agent jobs to the correct prompt and configuration
based on call_type metadata.
"""

import os
import json
import logging
import httpx

from agent.prompts import (
    INBOUND_SYSTEM_PROMPT,
    OUTBOUND_REMINDER_PROMPT,
    OUTBOUND_RECALL_PROMPT,
    format_business_hours,
    format_faq_bank,
    format_providers_list,
)

logger = logging.getLogger("call-handler")

BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000")


async def load_clinic_config(clinic_id: str) -> dict:
    """
    Fetch clinic, agent, and provider configuration from the backend API.
    Returns a dict with all data needed to populate prompt templates.
    """
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{BACKEND_URL}/api/agents/{clinic_id}")

    if resp.status_code != 200:
        logger.error(f"Failed to load clinic config for {clinic_id}: {resp.text}")
        return {}

    data = resp.json()
    clinic = data.get("clinic", {})
    agent = data.get("agent", {})
    providers = data.get("providers", [])

    return {
        "clinic_id": clinic_id,
        "clinic_name": clinic.get("name", "Dental Office"),
        "clinic_address": clinic.get("address", ""),
        "clinic_phone": clinic.get("phone_number", ""),
        "clinic_timezone": clinic.get("timezone", "America/New_York"),
        "twilio_number": clinic.get("twilio_number", ""),
        "emergency_number": clinic.get("emergency_escalation_number", ""),
        "business_hours_json": clinic.get("business_hours_json", {}),
        "business_hours": format_business_hours(clinic.get("business_hours_json", {})),
        "agent_name": agent.get("agent_name", "AI Receptionist") if agent else "AI Receptionist",
        "voice_id": agent.get("voice_id", "Cheyenne-PlayAI") if agent else "Cheyenne-PlayAI",
        "faq_bank_raw": agent.get("faq_bank_json", []) if agent else [],
        "faq_bank": format_faq_bank(agent.get("faq_bank_json", []) if agent else []),
        "providers": providers,
        "providers_list": format_providers_list(providers),
    }


def parse_call_metadata(metadata_str: str) -> dict:
    """
    Parse JSON metadata from LiveKit job or room metadata.
    Returns a dict with call_type, clinic_id, phone_number, and any extra fields.
    """
    if not metadata_str:
        return {}
    try:
        return json.loads(metadata_str)
    except (json.JSONDecodeError, TypeError):
        logger.warning(f"Failed to parse metadata: {metadata_str}")
        return {}


def build_system_prompt(call_type: str, config: dict, call_metadata: dict) -> str:
    """
    Select and populate the correct system prompt based on call_type.

    Args:
        call_type: 'inbound', 'outbound_reminder', or 'outbound_recall'
        config: Clinic configuration from load_clinic_config()
        call_metadata: Additional metadata from the call dispatch

    Returns:
        Fully populated system prompt string
    """
    if call_type == "outbound_reminder":
        return OUTBOUND_REMINDER_PROMPT.format(
            agent_name=config.get("agent_name", "AI Receptionist"),
            clinic_name=config.get("clinic_name", "Dental Office"),
            patient_name=call_metadata.get("patient_name", "the patient"),
            appointment_date=call_metadata.get("appointment_date", "tomorrow"),
            appointment_time=call_metadata.get("appointment_time", "your scheduled time"),
            provider_name=call_metadata.get("provider_name", "your provider"),
        )

    elif call_type == "outbound_recall":
        return OUTBOUND_RECALL_PROMPT.format(
            agent_name=config.get("agent_name", "AI Receptionist"),
            clinic_name=config.get("clinic_name", "Dental Office"),
            patient_name=call_metadata.get("patient_name", "the patient"),
        )

    else:
        return INBOUND_SYSTEM_PROMPT.format(
            agent_name=config.get("agent_name", "AI Receptionist"),
            clinic_name=config.get("clinic_name", "Dental Office"),
            clinic_address=config.get("clinic_address", ""),
            clinic_phone=config.get("clinic_phone", ""),
            business_hours=config.get("business_hours", ""),
            providers_list=config.get("providers_list", ""),
            faq_bank=config.get("faq_bank", ""),
        )


def get_initial_greeting(call_type: str, config: dict, call_metadata: dict) -> str | None:
    """
    Return the initial greeting message for the agent to speak,
    or None if the agent should wait for the user to speak first.

    - Inbound: Agent greets first
    - Outbound reminder/recall: Agent waits for answer, then greets
    """
    agent_name = config.get("agent_name", "the AI Receptionist")
    clinic_name = config.get("clinic_name", "Dental Office")

    if call_type == "inbound":
        return (
            f"Thank you for calling {clinic_name}, this is {agent_name}. "
            f"How can I help you today?"
        )

    elif call_type == "outbound_reminder":
        patient_name = call_metadata.get("patient_name", "")
        return f"Hi, may I speak with {patient_name}?" if patient_name else "Hello! May I speak with the patient please?"

    elif call_type == "outbound_recall":
        patient_name = call_metadata.get("patient_name", "")
        return f"Hi, may I speak with {patient_name}?" if patient_name else "Hello! How are you today?"

    return None
