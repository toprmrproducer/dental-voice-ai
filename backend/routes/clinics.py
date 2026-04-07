"""
Clinic management routes.
Handles clinic CRUD operations with owner-based access control.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from backend.deps import get_current_user, get_clinic_id, require_owner
from backend.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/clinics", tags=["clinics"])


class CreateClinicRequest(BaseModel):
    name: str
    address: Optional[str] = None
    phone_number: Optional[str] = None
    timezone: str = "America/New_York"


class UpdateClinicRequest(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone_number: Optional[str] = None
    timezone: Optional[str] = None
    emergency_escalation_number: Optional[str] = None
    business_hours_json: Optional[dict] = None


@router.post("")
async def create_clinic(req: CreateClinicRequest, user: dict = Depends(get_current_user)):
    """
    Create a new clinic. The authenticated user becomes the owner.
    Also updates the user's metadata with the new clinic_id.
    """
    sb = get_supabase()

    insert_data = {
        "name": req.name,
        "owner_id": user["id"],
        "timezone": req.timezone,
    }
    if req.address:
        insert_data["address"] = req.address
    if req.phone_number:
        insert_data["phone_number"] = req.phone_number

    resp = sb.table("clinics").insert(insert_data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create clinic")

    clinic = resp.data[0]

    # Update user metadata with clinic_id
    try:
        sb.auth.admin.update_user_by_id(
            user["id"],
            {"user_metadata": {"clinic_id": clinic["id"], "role": "owner"}},
        )
    except Exception:
        pass  # Non-critical: user can still access via owner_id

    return clinic


@router.get("")
async def get_clinic(clinic_id: str = Depends(get_clinic_id)):
    """Get the authenticated user's clinic."""
    sb = get_supabase()
    resp = sb.table("clinics").select("*").eq("id", clinic_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return resp.data


@router.put("")
async def update_clinic(
    req: UpdateClinicRequest,
    clinic_id: str = Depends(get_clinic_id),
    _owner: str = Depends(require_owner),
):
    """Update clinic settings. Owner only."""
    sb = get_supabase()
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    resp = sb.table("clinics").update(update_data).eq("id", clinic_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return resp.data[0]
