"""
AI Assistant (agent) configuration routes.
CRUD for managing the voice AI agent settings per clinic.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from backend.deps import get_current_user, get_clinic_id, require_owner
from backend.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/assistants", tags=["assistants"])


class CreateAssistantRequest(BaseModel):
    agent_name: str = "AI Receptionist"
    voice_id: str = "Cheyenne-PlayAI"
    faq_bank_json: Optional[list[dict]] = None


class UpdateAssistantRequest(BaseModel):
    agent_name: Optional[str] = None
    voice_id: Optional[str] = None
    faq_bank_json: Optional[list[dict]] = None
    is_active: Optional[bool] = None


@router.get("")
async def list_assistants(clinic_id: str = Depends(get_clinic_id)):
    """List all assistants for the authenticated user's clinic."""
    sb = get_supabase()
    resp = (
        sb.table("ai_agents")
        .select("*")
        .eq("clinic_id", clinic_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"assistants": resp.data or []}


@router.get("/{assistant_id}")
async def get_assistant(assistant_id: str, clinic_id: str = Depends(get_clinic_id)):
    """Get a specific assistant by ID."""
    sb = get_supabase()
    resp = (
        sb.table("ai_agents")
        .select("*")
        .eq("id", assistant_id)
        .eq("clinic_id", clinic_id)
        .single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Assistant not found")
    return resp.data


@router.post("")
async def create_assistant(
    req: CreateAssistantRequest,
    clinic_id: str = Depends(get_clinic_id),
    _owner: str = Depends(require_owner),
):
    """Create a new assistant for the clinic. Owner only."""
    sb = get_supabase()

    insert_data = {
        "clinic_id": clinic_id,
        "agent_name": req.agent_name,
        "voice_id": req.voice_id,
        "is_active": True,
    }
    if req.faq_bank_json is not None:
        insert_data["faq_bank_json"] = req.faq_bank_json

    resp = sb.table("ai_agents").insert(insert_data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create assistant")
    return resp.data[0]


@router.put("/{assistant_id}")
async def update_assistant(
    assistant_id: str,
    req: UpdateAssistantRequest,
    clinic_id: str = Depends(get_clinic_id),
    _owner: str = Depends(require_owner),
):
    """Update an assistant. Owner only."""
    sb = get_supabase()

    # Verify ownership
    existing = (
        sb.table("ai_agents")
        .select("id")
        .eq("id", assistant_id)
        .eq("clinic_id", clinic_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Assistant not found")

    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    resp = sb.table("ai_agents").update(update_data).eq("id", assistant_id).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to update assistant")
    return resp.data[0]


@router.delete("/{assistant_id}")
async def delete_assistant(
    assistant_id: str,
    clinic_id: str = Depends(get_clinic_id),
    _owner: str = Depends(require_owner),
):
    """Delete an assistant. Owner only."""
    sb = get_supabase()

    existing = (
        sb.table("ai_agents")
        .select("id")
        .eq("id", assistant_id)
        .eq("clinic_id", clinic_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Assistant not found")

    sb.table("ai_agents").delete().eq("id", assistant_id).execute()
    return {"status": "deleted", "id": assistant_id}
