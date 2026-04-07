"""
Authentication dependency for FastAPI routes.
Verifies Supabase JWT tokens and extracts user/clinic context.
"""

import os
import logging
from typing import Any

from fastapi import Depends, HTTPException, Request
from backend.services.supabase_client import get_supabase

logger = logging.getLogger("auth")


async def get_current_user(request: Request) -> dict[str, Any]:
    """
    Extract and verify the Supabase access token from the Authorization header.
    Returns the user dict with id, email, and user_metadata.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = auth_header.split(" ", 1)[1]
    if not token:
        raise HTTPException(status_code=401, detail="Empty token")

    sb = get_supabase()
    try:
        user_response = sb.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {
            "id": user.id,
            "email": user.email,
            "user_metadata": user.user_metadata or {},
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_clinic_id(user: dict = Depends(get_current_user)) -> str:
    """
    Extract clinic_id from the authenticated user's metadata.
    All clinic-scoped routes should depend on this.
    """
    clinic_id = user.get("user_metadata", {}).get("clinic_id", "")
    if not clinic_id:
        raise HTTPException(status_code=403, detail="No clinic associated with this account")
    return clinic_id


def get_user_role(user: dict = Depends(get_current_user)) -> str:
    """Extract the user role (owner/staff) from metadata."""
    return user.get("user_metadata", {}).get("role", "staff")


def require_owner(role: str = Depends(get_user_role)) -> str:
    """Dependency that requires the user to be a clinic owner."""
    if role != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    return role
