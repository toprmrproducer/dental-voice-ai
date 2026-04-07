"""
Dental Voice AI — LiveKit Agent Entry Point
Production dental AI receptionist handling inbound/outbound calls.
"""

import os
import logging
import json
import asyncio
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    llm,
)
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import groq, silero

from agent.sarvam_plugin import SarvamSTT, SarvamTTS
from agent.tools import DentalTools
from agent.call_handler import (
    load_clinic_config,
    parse_call_metadata,
    build_system_prompt,
    get_initial_greeting,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("dental-agent")


def prewarm(proc: JobProcess):
    """Prewarm: load Silero VAD model once per worker process."""
    proc.userdata["vad"] = silero.VAD.load()
    logger.info("Silero VAD prewarmed")


async def entrypoint(ctx: JobContext):
    """
    Main agent entrypoint for each call session.

    1. Parse metadata to determine call_type and clinic_id
    2. Load clinic configuration from backend
    3. Build appropriate system prompt
    4. Initialize VoicePipelineAgent with Groq STT/LLM/TTS
    5. Handle call lifecycle and transcript logging
    """
    logger.info(f"Agent job started — room: {ctx.room.name}")

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # --- Parse Metadata ---
    metadata = {}
    if ctx.job.metadata:
        metadata = parse_call_metadata(ctx.job.metadata)
    if ctx.room.metadata:
        room_meta = parse_call_metadata(ctx.room.metadata)
        metadata.update(room_meta)

    clinic_id = metadata.get("clinic_id", os.getenv("DEFAULT_CLINIC_ID", ""))
    call_type = metadata.get("call_type", "inbound")
    phone_number = metadata.get("phone_number", "")

    if not clinic_id:
        logger.error("No clinic_id found in metadata or environment. Shutting down.")
        ctx.shutdown()
        return

    logger.info(f"Call type: {call_type} | Clinic: {clinic_id} | Phone: {phone_number}")

    # --- Load Clinic Config ---
    config = await load_clinic_config(clinic_id)
    if not config:
        logger.error(f"Failed to load config for clinic {clinic_id}")
        ctx.shutdown()
        return

    # --- Build System Prompt ---
    system_prompt = build_system_prompt(call_type, config, metadata)

    # --- Initialize Chat Context ---
    chat_ctx = llm.ChatContext()
    chat_ctx.append(role="system", text=system_prompt)

    # --- Initialize Tools ---
    tools = DentalTools(
        clinic_id=clinic_id,
        faq_bank=config.get("faq_bank_raw", []),
    )

    # Set call context on tools for escalation/logging
    sip_identity = f"sip_{phone_number}" if phone_number else ""
    tools.set_call_context(
        room_name=ctx.room.name,
        participant_identity=sip_identity,
        call_type=call_type,
        phone_from=config.get("twilio_number", ""),
        phone_to=phone_number,
    )

    # --- Build Voice Pipeline Agent ---
    # Use Sarvam STT+TTS if SARVAM_API_KEY is set, otherwise fall back to Groq
    use_sarvam = bool(os.getenv("SARVAM_API_KEY"))
    sarvam_lang = os.getenv("SARVAM_LANGUAGE_CODE", "hi-IN")

    if use_sarvam:
        logger.info(f"Using Sarvam STT (saaras:v3) + TTS (bulbul:v3), language={sarvam_lang}")
        stt_instance = SarvamSTT(language_code=sarvam_lang)
        tts_instance = SarvamTTS(
            voice=os.getenv("SARVAM_VOICE", "meera"),
            language_code=sarvam_lang,
        )
    else:
        logger.info("Using Groq STT + TTS (no SARVAM_API_KEY set)")
        stt_instance = groq.STT(model="whisper-large-v3-turbo")
        tts_instance = groq.TTS(voice=config.get("voice_id", "Cheyenne-PlayAI"))

    agent = VoicePipelineAgent(
        vad=ctx.proc.userdata["vad"],
        stt=stt_instance,
        llm=groq.LLM(model="llama-3.3-70b-versatile"),
        tts=tts_instance,
        chat_ctx=chat_ctx,
        fnc_ctx=tools,
        allow_interruptions=True,
        interrupt_speech_duration=0.5,
        min_endpointing_delay=0.5,
    )

    # --- Track Transcript ---
    transcript_lines: list[str] = []
    call_start_time = datetime.now(timezone.utc)
    identified_patient_id = metadata.get("patient_id", "")

    @agent.on("user_speech_committed")
    def on_user_speech(msg):
        text = msg.content if hasattr(msg, "content") else str(msg)
        transcript_lines.append(f"Patient: {text}")

    @agent.on("agent_speech_committed")
    def on_agent_speech(msg):
        text = msg.content if hasattr(msg, "content") else str(msg)
        transcript_lines.append(f"Agent: {text}")

    # --- Start Agent ---
    agent.start(ctx.room)

    # --- Initial Greeting ---
    greeting = get_initial_greeting(call_type, config, metadata)

    if call_type == "inbound":
        # For inbound: immediately look up patient by phone number
        if phone_number:
            try:
                lookup_result = await tools.lookup_patient(phone_number)
                logger.info(f"Auto-lookup result: {lookup_result}")
                # Add lookup result to chat context so agent knows who's calling
                chat_ctx.append(
                    role="system",
                    text=f"[Auto-lookup for caller {phone_number}]: {lookup_result}",
                )
            except Exception as e:
                logger.warning(f"Auto-lookup failed: {e}")

        if greeting:
            await agent.say(greeting)

    else:
        # For outbound: wait briefly for the person to answer, then greet
        await asyncio.sleep(1.5)
        if greeting:
            await agent.say(greeting)

    # --- Shutdown Handler: Log Call on Disconnect ---
    async def on_shutdown():
        call_end_time = datetime.now(timezone.utc)
        duration = int((call_end_time - call_start_time).total_seconds())
        full_transcript = "\n".join(transcript_lines)

        ai_summary = ""
        if transcript_lines:
            ai_summary = f"{call_type.replace('_', ' ').title()} call, {duration}s. "
            outcomes_mentioned = []
            transcript_lower = full_transcript.lower()
            if "booked" in transcript_lower or "confirmed" in transcript_lower:
                outcomes_mentioned.append("appointment booked/confirmed")
            if "cancel" in transcript_lower:
                outcomes_mentioned.append("cancellation discussed")
            if "reschedule" in transcript_lower:
                outcomes_mentioned.append("reschedule discussed")
            if "emergency" in transcript_lower:
                outcomes_mentioned.append("emergency detected")
            if "transfer" in transcript_lower:
                outcomes_mentioned.append("transfer requested")
            if outcomes_mentioned:
                ai_summary += "Topics: " + ", ".join(outcomes_mentioned) + "."
            else:
                ai_summary += "General inquiry."

        try:
            await tools.log_call_outcome(
                outcome="faq",
                patient_id=identified_patient_id,
                duration=duration,
                transcript=full_transcript,
                ai_summary=ai_summary,
            )
            logger.info(f"Call logged: {duration}s, {len(transcript_lines)} transcript lines")
        except Exception as e:
            logger.error(f"Failed to log call on shutdown: {e}")

    ctx.add_shutdown_callback(on_shutdown)

    logger.info("Agent running. Waiting for call to complete...")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            agent_name="dental-receptionist",
        )
    )
