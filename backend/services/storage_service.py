"""
Supabase Storage service for managing call recordings.

Files are stored in the 'call-recordings' bucket under the path:
    {clinic_id}/{call_id}.{extension}

Uses Supabase's S3-compatible storage API via the service role key.
"""

import os
from backend.services.supabase_client import get_supabase

BUCKET_NAME = "call-recordings"


def upload_recording(
    clinic_id: str,
    call_id: str,
    file_data: bytes,
    content_type: str = "audio/wav",
) -> str:
    """
    Upload a call recording to Supabase Storage.

    Args:
        clinic_id: Clinic UUID (used as folder prefix for RLS)
        call_id: Call UUID (used as filename)
        file_data: Raw audio bytes
        content_type: MIME type of the audio file

    Returns:
        Public-compatible storage path (for signed URL generation)
    """
    extension = _mime_to_ext(content_type)
    path = f"{clinic_id}/{call_id}.{extension}"

    sb = get_supabase()
    sb.storage.from_(BUCKET_NAME).upload(
        path=path,
        file=file_data,
        file_options={"content-type": content_type},
    )

    # Update the call record with the storage path
    sb.table("calls").update({"recording_url": path}).eq("id", call_id).execute()

    return path


def get_recording_signed_url(path: str, expires_in: int = 3600) -> str:
    """
    Generate a signed URL for a call recording.

    Args:
        path: Storage path (e.g., "clinic-uuid/call-uuid.wav")
        expires_in: URL validity in seconds (default: 1 hour)

    Returns:
        Signed URL string
    """
    sb = get_supabase()
    result = sb.storage.from_(BUCKET_NAME).create_signed_url(path, expires_in)
    return result.get("signedURL", "")


def delete_recording(path: str) -> bool:
    """
    Delete a call recording from storage.

    Args:
        path: Storage path to delete

    Returns:
        True if deleted successfully
    """
    sb = get_supabase()
    sb.storage.from_(BUCKET_NAME).remove([path])
    return True


def list_clinic_recordings(clinic_id: str, limit: int = 100, offset: int = 0) -> list[dict]:
    """
    List all recordings for a clinic.

    Args:
        clinic_id: Clinic UUID
        limit: Max results
        offset: Pagination offset

    Returns:
        List of file metadata dicts
    """
    sb = get_supabase()
    result = sb.storage.from_(BUCKET_NAME).list(
        path=clinic_id,
        options={"limit": limit, "offset": offset, "sortBy": {"column": "created_at", "order": "desc"}},
    )
    return result


def _mime_to_ext(content_type: str) -> str:
    """Convert MIME type to file extension."""
    mime_map = {
        "audio/wav": "wav",
        "audio/mpeg": "mp3",
        "audio/mp3": "mp3",
        "audio/ogg": "ogg",
        "audio/webm": "webm",
        "audio/mp4": "m4a",
    }
    return mime_map.get(content_type, "wav")
