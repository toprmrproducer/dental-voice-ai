"""
Demo request routes.
Public endpoint for the landing page "Book a Demo" form.
No authentication required.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from backend.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/demo-requests", tags=["demo"])


class DemoRequest(BaseModel):
    name: str
    email: EmailStr
    clinic_name: str


@router.post("")
async def submit_demo_request(req: DemoRequest):
    """
    Submit a demo request from the landing page.
    Stores in demo_requests table for follow-up.
    """
    sb = get_supabase()

    # Check for duplicate email
    existing = (
        sb.table("demo_requests")
        .select("id")
        .eq("email", req.email)
        .limit(1)
        .execute()
    )
    if existing.data:
        return {"status": "already_submitted", "message": "We already have your request. We'll be in touch soon!"}

    resp = sb.table("demo_requests").insert({
        "name": req.name,
        "email": req.email,
        "clinic_name": req.clinic_name,
        "status": "pending",
    }).execute()

    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to submit demo request")

    return {"status": "submitted", "message": "Thank you! We'll reach out within 24 hours."}


@router.get("")
async def list_demo_requests():
    """
    List all demo requests. Admin only in production—
    currently unprotected for internal use.
    """
    sb = get_supabase()
    resp = (
        sb.table("demo_requests")
        .select("*")
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    return {"demo_requests": resp.data or []}
