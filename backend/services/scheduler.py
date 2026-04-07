import logging
from datetime import datetime, timedelta, date, time as dt_time
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from backend.services.supabase_client import get_supabase
from backend.services import livekit_service, twilio_service

logger = logging.getLogger("scheduler")

scheduler = AsyncIOScheduler()


async def nightly_reminder_job():
    """
    Runs every hour from 5 PM to 11 PM UTC to cover US timezones.
    For each clinic, checks if local time is approximately 6 PM,
    then queries tomorrow's appointments and triggers outbound reminder calls.
    """
    logger.info("Running nightly reminder job...")
    sb = get_supabase()

    clinics_resp = sb.table("clinics").select("*").eq("subscription_status", "active").execute()
    clinics = clinics_resp.data or []

    for clinic in clinics:
        tz = ZoneInfo(clinic["timezone"])
        local_now = datetime.now(tz)

        if not (17 <= local_now.hour <= 18 and local_now.minute < 30):
            continue

        logger.info(f"Processing reminders for clinic: {clinic['name']} (tz={clinic['timezone']})")

        tomorrow = (local_now + timedelta(days=1)).date()
        tomorrow_start = datetime.combine(tomorrow, dt_time.min, tzinfo=tz).isoformat()
        tomorrow_end = datetime.combine(tomorrow, dt_time.max, tzinfo=tz).isoformat()

        appts_resp = (
            sb.table("appointments")
            .select("*, patients(*), providers(*)")
            .eq("clinic_id", clinic["id"])
            .in_("status", ["scheduled", "confirmed"])
            .gte("start_time", tomorrow_start)
            .lte("start_time", tomorrow_end)
            .execute()
        )
        appointments = appts_resp.data or []

        for appt in appointments:
            patient = appt.get("patients")
            if not patient:
                continue
            if patient.get("do_not_call", False):
                logger.info(f"Skipping {patient['full_name']} — do_not_call is true")
                continue

            provider = appt.get("providers", {})
            phone = patient["phone_number"]
            appt_time_local = datetime.fromisoformat(appt["start_time"]).astimezone(tz)

            room_name = livekit_service.generate_room_name(phone, prefix="reminder")
            metadata = {
                "patient_id": patient["id"],
                "patient_name": patient["full_name"],
                "appointment_id": appt["id"],
                "appointment_date": appt_time_local.strftime("%A, %B %d"),
                "appointment_time": appt_time_local.strftime("%I:%M %p"),
                "provider_name": provider.get("name", "your provider"),
                "caller_id": clinic.get("twilio_number", ""),
            }

            try:
                result = await livekit_service.create_outbound_call(
                    room_name=room_name,
                    phone_number=phone,
                    clinic_id=clinic["id"],
                    call_type="outbound_reminder",
                    metadata=metadata,
                )

                sb.table("calls").insert({
                    "clinic_id": clinic["id"],
                    "patient_id": patient["id"],
                    "call_type": "outbound_reminder",
                    "phone_number_from": clinic.get("twilio_number", ""),
                    "phone_number_to": phone,
                    "outcome": None,
                    "livekit_room_name": result["room_name"],
                }).execute()

                logger.info(f"Reminder call dispatched to {patient['full_name']} at {phone}")

            except Exception as e:
                logger.error(f"Failed to dispatch reminder to {phone}: {e}")

            if patient.get("sms_consent", False):
                try:
                    await twilio_service.send_reminder_sms(
                        to=phone,
                        patient_name=patient["full_name"],
                        appointment_time=appt_time_local.strftime("%I:%M %p"),
                        provider_name=provider.get("name", "your provider"),
                        clinic_name=clinic["name"],
                        from_number=clinic.get("twilio_number"),
                    )
                except Exception as e:
                    logger.error(f"Failed to send reminder SMS to {phone}: {e}")


async def recall_queue_builder_job():
    """
    Runs every Monday at 9 AM ET.
    Finds patients who haven't visited in 5+ months, have recall_consent,
    are not do_not_call, and don't already have a pending recall or upcoming appointment.
    """
    logger.info("Running recall queue builder...")
    sb = get_supabase()

    clinics_resp = sb.table("clinics").select("*").eq("subscription_status", "active").execute()
    clinics = clinics_resp.data or []

    for clinic in clinics:
        clinic_id = clinic["id"]
        tz = ZoneInfo(clinic["timezone"])
        cutoff = (datetime.now(tz) - timedelta(days=150)).date().isoformat()

        patients_resp = (
            sb.table("patients")
            .select("*")
            .eq("clinic_id", clinic_id)
            .eq("recall_consent", True)
            .eq("do_not_call", False)
            .lt("last_visit_date", cutoff)
            .execute()
        )
        lapsed_patients = patients_resp.data or []

        for patient in lapsed_patients:
            upcoming_resp = (
                sb.table("appointments")
                .select("id")
                .eq("patient_id", patient["id"])
                .in_("status", ["scheduled", "confirmed"])
                .gte("start_time", datetime.now(tz).isoformat())
                .limit(1)
                .execute()
            )
            if upcoming_resp.data:
                continue

            pending_resp = (
                sb.table("recall_campaigns")
                .select("id")
                .eq("patient_id", patient["id"])
                .eq("status", "pending")
                .limit(1)
                .execute()
            )
            if pending_resp.data:
                continue

            local_now = datetime.now(tz)
            next_weekday = local_now
            while next_weekday.weekday() >= 5:
                next_weekday += timedelta(days=1)
            scheduled_time = next_weekday.replace(hour=10, minute=0, second=0, microsecond=0)
            if scheduled_time <= local_now:
                scheduled_time += timedelta(days=1)
                while scheduled_time.weekday() >= 5:
                    scheduled_time += timedelta(days=1)

            try:
                sb.table("recall_campaigns").insert({
                    "clinic_id": clinic_id,
                    "patient_id": patient["id"],
                    "scheduled_call_time": scheduled_time.isoformat(),
                    "status": "pending",
                }).execute()
                logger.info(f"Recall queued for {patient['full_name']} at {scheduled_time}")
            except Exception as e:
                logger.error(f"Failed to queue recall for {patient['full_name']}: {e}")


async def recall_dialer_job():
    """
    Runs hourly on weekdays 10 AM - 4 PM ET.
    Picks up pending recall campaigns whose scheduled_call_time has arrived
    and initiates outbound calls.
    """
    logger.info("Running recall dialer...")
    sb = get_supabase()
    now_utc = datetime.now(ZoneInfo("UTC")).isoformat()

    campaigns_resp = (
        sb.table("recall_campaigns")
        .select("*, patients(*), clinics(*)")
        .eq("status", "pending")
        .lte("scheduled_call_time", now_utc)
        .limit(50)
        .execute()
    )
    campaigns = campaigns_resp.data or []

    for campaign in campaigns:
        patient = campaign.get("patients")
        clinic = campaign.get("clinics")

        if not patient or not clinic:
            continue
        if patient.get("do_not_call", False) or not patient.get("recall_consent", False):
            sb.table("recall_campaigns").update({"status": "opted_out"}).eq("id", campaign["id"]).execute()
            continue

        phone = patient["phone_number"]
        room_name = livekit_service.generate_room_name(phone, prefix="recall")
        metadata = {
            "patient_id": patient["id"],
            "patient_name": patient["full_name"],
            "recall_campaign_id": campaign["id"],
            "last_visit_date": patient.get("last_visit_date", ""),
            "caller_id": clinic.get("twilio_number", ""),
        }

        try:
            result = await livekit_service.create_outbound_call(
                room_name=room_name,
                phone_number=phone,
                clinic_id=clinic["id"],
                call_type="outbound_recall",
                metadata=metadata,
            )

            call_resp = sb.table("calls").insert({
                "clinic_id": clinic["id"],
                "patient_id": patient["id"],
                "call_type": "outbound_recall",
                "phone_number_from": clinic.get("twilio_number", ""),
                "phone_number_to": phone,
                "outcome": None,
                "livekit_room_name": result["room_name"],
            }).execute()

            call_id = call_resp.data[0]["id"] if call_resp.data else None

            sb.table("recall_campaigns").update({
                "status": "called",
                "call_id": call_id,
            }).eq("id", campaign["id"]).execute()

            logger.info(f"Recall call dispatched to {patient['full_name']} at {phone}")

        except Exception as e:
            logger.error(f"Failed to dispatch recall to {phone}: {e}")


def start_scheduler():
    """Register all cron jobs and start the APScheduler."""

    scheduler.add_job(
        nightly_reminder_job,
        CronTrigger(hour="17-23", minute=0, timezone="UTC"),
        id="nightly_reminder",
        replace_existing=True,
    )

    scheduler.add_job(
        recall_queue_builder_job,
        CronTrigger(day_of_week="mon", hour=9, minute=0, timezone="America/New_York"),
        id="recall_queue_builder",
        replace_existing=True,
    )

    scheduler.add_job(
        recall_dialer_job,
        CronTrigger(day_of_week="mon-fri", hour="10-16", minute=0, timezone="America/New_York"),
        id="recall_dialer",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Scheduler started with 3 cron jobs: nightly_reminder, recall_queue_builder, recall_dialer")
