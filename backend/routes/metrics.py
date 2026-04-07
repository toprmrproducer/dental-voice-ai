"""
Authenticated metrics routes.
Wraps existing dashboard endpoints with JWT auth,
automatically resolving clinic_id from the token.
"""

from fastapi import APIRouter, Depends, Query

from backend.deps import get_clinic_id
from backend.routes.dashboard import (
    dashboard_today,
    dashboard_metrics,
    dashboard_calls,
    dashboard_recall,
)

router = APIRouter(prefix="/api/me", tags=["authenticated-dashboard"])


@router.get("/dashboard/today")
async def my_dashboard_today(clinic_id: str = Depends(get_clinic_id)):
    """Get today's dashboard for the authenticated user's clinic."""
    return await dashboard_today(clinic_id=clinic_id)


@router.get("/dashboard/metrics")
async def my_dashboard_metrics(
    days: int = Query(30),
    clinic_id: str = Depends(get_clinic_id),
):
    """Get metrics for the authenticated user's clinic."""
    return await dashboard_metrics(clinic_id=clinic_id, days=days)


@router.get("/dashboard/calls")
async def my_dashboard_calls(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    call_type: str | None = Query(None),
    outcome: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    clinic_id: str = Depends(get_clinic_id),
):
    """Get call history for the authenticated user's clinic."""
    return await dashboard_calls(
        clinic_id=clinic_id,
        page=page,
        limit=limit,
        call_type=call_type,
        outcome=outcome,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/dashboard/recall")
async def my_dashboard_recall(clinic_id: str = Depends(get_clinic_id)):
    """Get recall campaigns for the authenticated user's clinic."""
    return await dashboard_recall(clinic_id=clinic_id)
