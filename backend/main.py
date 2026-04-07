import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routes import (
    patients, appointments, calls, sms, dashboard, recall, webhooks,
    clinics, assistants, phone_numbers, demo, metrics, livekit_webhooks,
)
from backend.services.scheduler import start_scheduler, scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start scheduler on startup, shut down on exit."""
    logger.info("Starting Dental Voice AI Backend...")
    start_scheduler()
    yield
    scheduler.shutdown(wait=False)
    logger.info("Backend shut down.")


app = FastAPI(
    title="Dental Voice AI Backend",
    description="Middleware API for the Dental AI Receptionist system",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("DASHBOARD_URL", "http://localhost:3000"),
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router)
app.include_router(appointments.router)
app.include_router(calls.router)
app.include_router(sms.router)
app.include_router(dashboard.router)
app.include_router(recall.router)
app.include_router(webhooks.router)
app.include_router(clinics.router)
app.include_router(assistants.router)
app.include_router(phone_numbers.router)
app.include_router(demo.router)
app.include_router(metrics.router)
app.include_router(livekit_webhooks.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "dental-voice-ai-backend"}


@app.get("/api/agents/{clinic_id}")
async def get_agent_config(clinic_id: str):
    """Get the AI agent configuration for a clinic."""
    from backend.services.supabase_client import get_supabase
    sb = get_supabase()

    agent_resp = (
        sb.table("ai_agents")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )

    clinic_resp = (
        sb.table("clinics")
        .select("*")
        .eq("id", clinic_id)
        .single()
        .execute()
    )

    providers_resp = (
        sb.table("providers")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("is_active", True)
        .execute()
    )

    agent = agent_resp.data[0] if agent_resp.data else None
    clinic = clinic_resp.data
    providers = providers_resp.data or []

    if not clinic:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Clinic not found")

    return {
        "agent": agent,
        "clinic": clinic,
        "providers": providers,
    }


@app.put("/api/agents/{clinic_id}")
async def update_agent_config(clinic_id: str, body: dict):
    """Update agent configuration, FAQ bank, business hours, and provider roster."""
    from backend.services.supabase_client import get_supabase
    sb = get_supabase()

    if "agent_name" in body or "voice_id" in body or "faq_bank_json" in body:
        agent_update = {}
        if "agent_name" in body:
            agent_update["agent_name"] = body["agent_name"]
        if "voice_id" in body:
            agent_update["voice_id"] = body["voice_id"]
        if "faq_bank_json" in body:
            agent_update["faq_bank_json"] = body["faq_bank_json"]

        if agent_update:
            existing = (
                sb.table("ai_agents")
                .select("id")
                .eq("clinic_id", clinic_id)
                .limit(1)
                .execute()
            )
            if existing.data:
                sb.table("ai_agents").update(agent_update).eq("id", existing.data[0]["id"]).execute()
            else:
                agent_update["clinic_id"] = clinic_id
                sb.table("ai_agents").insert(agent_update).execute()

    if "business_hours_json" in body or "emergency_escalation_number" in body:
        clinic_update = {}
        if "business_hours_json" in body:
            clinic_update["business_hours_json"] = body["business_hours_json"]
        if "emergency_escalation_number" in body:
            clinic_update["emergency_escalation_number"] = body["emergency_escalation_number"]
        if clinic_update:
            sb.table("clinics").update(clinic_update).eq("id", clinic_id).execute()

    if "providers" in body:
        for prov in body["providers"]:
            if prov.get("id"):
                sb.table("providers").update({
                    "name": prov["name"],
                    "role": prov["role"],
                    "is_active": prov.get("is_active", True),
                }).eq("id", prov["id"]).execute()
            else:
                sb.table("providers").insert({
                    "clinic_id": clinic_id,
                    "name": prov["name"],
                    "role": prov["role"],
                    "is_active": prov.get("is_active", True),
                }).execute()

    return {"status": "updated", "clinic_id": clinic_id}
