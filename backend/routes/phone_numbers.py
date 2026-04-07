"""
Phone number management routes.
Tracks SIP/Twilio phone numbers assigned to clinics.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from backend.deps import get_clinic_id, require_owner
from backend.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/phone-numbers", tags=["phone_numbers"])


class CreatePhoneNumberRequest(BaseModel):
    phone_number: str
    label: Optional[str] = None
    provider: str = "twilio"  # twilio or livekit_sip


class UpdatePhoneNumberRequest(BaseModel):
    label: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("")
async def list_phone_numbers(clinic_id: str = Depends(get_clinic_id)):
    """List all phone numbers for the clinic."""
    sb = get_supabase()
    resp = (
        sb.table("phone_numbers")
        .select("*")
        .eq("clinic_id", clinic_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"phone_numbers": resp.data or []}


@router.post("")
async def create_phone_number(
    req: CreatePhoneNumberRequest,
    clinic_id: str = Depends(get_clinic_id),
    _owner: str = Depends(require_owner),
):
    """Register a phone number for the clinic. Owner only."""
    sb = get_supabase()

    # Check for duplicate
    existing = (
        sb.table("phone_numbers")
        .select("id")
        .eq("phone_number", req.phone_number)
        .limit(1)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="Phone number already registered")

    insert_data = {
        "clinic_id": clinic_id,
        "phone_number": req.phone_number,
        "provider": req.provider,
        "is_active": True,
    }
    if req.label:
        insert_data["label"] = req.label

    resp = sb.table("phone_numbers").insert(insert_data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to register phone number")
    return resp.data[0]


@router.put("/{phone_id}")
async def update_phone_number(
    phone_id: str,
    req: UpdatePhoneNumberRequest,
    clinic_id: str = Depends(get_clinic_id),
    _owner: str = Depends(require_owner),
):
    """Update a phone number. Owner only."""
    sb = get_supabase()

    existing = (
        sb.table("phone_numbers")
        .select("id")
        .eq("id", phone_id)
        .eq("clinic_id", clinic_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Phone number not found")

    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    resp = sb.table("phone_numbers").update(update_data).eq("id", phone_id).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to update phone number")
    return resp.data[0]


@router.delete("/{phone_id}")
async def delete_phone_number(
    phone_id: str,
    clinic_id: str = Depends(get_clinic_id),
    _owner: str = Depends(require_owner),
):
    """Delete a phone number. Owner only."""
    sb = get_supabase()

    existing = (
        sb.table("phone_numbers")
        .select("id")
        .eq("id", phone_id)
        .eq("clinic_id", clinic_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Phone number not found")

    sb.table("phone_numbers").delete().eq("id", phone_id).execute()
    return {"status": "deleted", "id": phone_id}
