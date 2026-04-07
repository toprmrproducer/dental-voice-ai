# Twilio + LiveKit SIP Setup Guide

Complete guide to configure Twilio Elastic SIP Trunking with LiveKit Cloud for the Dental Voice AI Receptionist.

---

## Prerequisites

- **Twilio Account** with a US phone number (toll-free or local)
- **LiveKit Cloud** project (or self-hosted LiveKit with SIP enabled)
- **Supabase** project with the migration applied
- **Groq** API key for STT/LLM/TTS

---

## Part 1: LiveKit Cloud Setup

### 1.1 Create a LiveKit Cloud Project

1. Go to [https://cloud.livekit.io](https://cloud.livekit.io) and sign in
2. Create a new project (e.g., "Dental Voice AI")
3. Note your credentials:
   - **LIVEKIT_URL**: `wss://your-project.livekit.cloud`
   - **LIVEKIT_API_KEY**: from project settings
   - **LIVEKIT_API_SECRET**: from project settings

### 1.2 Enable SIP

1. In your LiveKit Cloud dashboard, go to **Settings → SIP**
2. Enable SIP for your project
3. Note the **SIP URI** provided (e.g., `sip.livekit.cloud`)

### 1.3 Create an Inbound SIP Trunk

Create an inbound trunk that routes Twilio calls to your LiveKit agent:

```python
# create_inbound_trunk.py
import asyncio
from livekit import api

async def main():
    lk = api.LiveKitAPI(
        url="https://your-project.livekit.cloud",
        api_key="YOUR_API_KEY",
        api_secret="YOUR_API_SECRET",
    )

    trunk = await lk.sip.create_sip_inbound_trunk(
        api.CreateSIPInboundTrunkRequest(
            trunk=api.SIPInboundTrunkInfo(
                name="Dental AI - Twilio Inbound",
                numbers=["+15551234567"],  # Your Twilio number
                allowed_addresses=["54.172.60.0/30", "34.210.91.112/30"],  # Twilio SIP IPs
            )
        )
    )

    print(f"Inbound Trunk ID: {trunk.sip_trunk_id}")
    await lk.aclose()

asyncio.run(main())
```

### 1.4 Create an Outbound SIP Trunk

Create an outbound trunk for AI-initiated calls (reminders, recalls):

```python
# create_outbound_trunk.py
import asyncio
from livekit import api

async def main():
    lk = api.LiveKitAPI(
        url="https://your-project.livekit.cloud",
        api_key="YOUR_API_KEY",
        api_secret="YOUR_API_SECRET",
    )

    trunk = await lk.sip.create_sip_outbound_trunk(
        api.CreateSIPOutboundTrunkRequest(
            trunk=api.SIPOutboundTrunkInfo(
                name="Dental AI - Twilio Outbound",
                address="your-trunk-name.pstn.twilio.com",
                numbers=["+15551234567"],  # Your Twilio number (caller ID)
                auth_username="YOUR_TWILIO_SIP_CREDENTIAL_USERNAME",
                auth_password="YOUR_TWILIO_SIP_CREDENTIAL_PASSWORD",
            )
        )
    )

    print(f"Outbound Trunk ID: {trunk.sip_trunk_id}")
    await lk.aclose()

asyncio.run(main())
```

### 1.5 Create a SIP Dispatch Rule

Route incoming SIP calls to your agent:

```python
# create_dispatch_rule.py
import asyncio
from livekit import api

async def main():
    lk = api.LiveKitAPI(
        url="https://your-project.livekit.cloud",
        api_key="YOUR_API_KEY",
        api_secret="YOUR_API_SECRET",
    )

    rule = await lk.sip.create_sip_dispatch_rule(
        api.CreateSIPDispatchRuleRequest(
            rule=api.SIPDispatchRule(
                dispatch_rule_individual=api.SIPDispatchRuleIndividual(
                    room_prefix="dental-inbound-",
                    pin="",
                ),
            ),
            trunk_ids=[],  # Empty = match all trunks
            name="Dental AI Dispatch",
        )
    )

    print(f"Dispatch Rule ID: {rule.sip_dispatch_rule_id}")
    await lk.aclose()

asyncio.run(main())
```

---

## Part 2: Twilio Configuration

### 2.1 Purchase a Phone Number

1. Go to [Twilio Console → Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
2. Buy a US phone number (toll-free recommended for higher trust scores)
3. Note the number (e.g., `+18001234567`)

### 2.2 Create an Elastic SIP Trunk

1. Go to **Elastic SIP Trunking → Trunks → Create new trunk**
2. Name: `dental-ai-livekit`
3. Under **Origination** tab:
   - Add Origination URI: `sip:your-project.livekit.cloud;transport=tls`
   - Priority: 10, Weight: 10
4. Under **Termination** tab:
   - Termination SIP URI: Choose a name, e.g., `dental-ai.pstn.twilio.com`
   - Under **Authentication**, create a Credential List:
     - Username: choose a username
     - Password: choose a strong password
   - Use these credentials in the `create_outbound_trunk.py` script above

### 2.3 Configure Phone Number Routing

1. Go back to your phone number settings
2. Under **Voice Configuration**:
   - Configure with: **SIP Trunk**
   - SIP Trunk: Select `dental-ai-livekit`
3. Under **Messaging Configuration** (for SMS):
   - A Message Comes In: **Webhook**
   - URL: `https://your-backend.com/api/webhooks/twilio/sms` (POST)

### 2.4 Configure Status Callbacks

For call status tracking, configure webhooks:

1. In your Twilio trunk under **General** settings:
   - Call Status URL: `https://your-backend.com/api/webhooks/twilio/status`
   - Method: POST

### 2.5 Verify Twilio SIP Media IPs

Ensure your LiveKit inbound trunk's `allowed_addresses` includes Twilio's SIP signaling IPs:

| Region | IP Range |
|--------|----------|
| US East (Virginia) | `54.172.60.0/30` |
| US West (Oregon) | `34.210.91.112/30` |
| EU (Ireland) | `54.171.127.192/30` |
| AP (Sydney) | `54.252.254.64/30` |

See [Twilio IP Addresses](https://www.twilio.com/docs/sip-trunking/ip-addresses) for the latest list.

---

## Part 3: Environment Configuration

### 3.1 Backend `.env`

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...your-service-role-key

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+15551234567

# LiveKit
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxx
LIVEKIT_API_SECRET=your-api-secret

# SIP Trunks (from Part 1)
LIVEKIT_SIP_OUTBOUND_TRUNK_ID=ST_xxxxxxxxxxxxxxxx
```

### 3.2 Agent `.env`

```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxx
LIVEKIT_API_SECRET=your-api-secret
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
BACKEND_URL=http://localhost:8000
```

### 3.3 Dashboard `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
BACKEND_URL=http://localhost:8000
```

---

## Part 4: Testing the Setup

### 4.1 Test Inbound Calls

1. Start the backend: `cd backend && uvicorn main:app --reload`
2. Start the agent: `cd agent && python main.py dev`
3. Call your Twilio number from a phone
4. You should hear the AI greeting within 2-3 seconds

### 4.2 Test Outbound Calls

```python
# test_outbound.py
import httpx
import asyncio

async def main():
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "http://localhost:8000/api/calls/transfer",
            json={
                "clinic_id": "your-clinic-uuid",
                "patient_phone": "+15559876543",
                "call_type": "outbound_reminder",
                "metadata": {
                    "patient_id": "patient-uuid",
                    "patient_name": "John Smith",
                    "appointment_date": "2026-01-15",
                    "appointment_time": "10:00 AM",
                    "provider_name": "Dr. Sarah Chen",
                }
            }
        )
        print(resp.json())

asyncio.run(main())
```

### 4.3 Test SMS

```bash
curl -X POST http://localhost:8000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "your-clinic-uuid",
    "patient_id": "patient-uuid",
    "to": "+15559876543",
    "body": "Reminder: You have an appointment tomorrow at 10:00 AM."
  }'
```

### 4.4 Verify LiveKit Agent Connection

```bash
# List active rooms
curl -X GET "https://your-project.livekit.cloud/twirp/livekit.RoomService/ListRooms" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Part 5: Production Deployment

### 5.1 Docker Deployment

```bash
# Build and start all services
docker-compose up --build -d

# Check logs
docker-compose logs -f agent
docker-compose logs -f backend
```

### 5.2 DNS & SSL

1. Point your domain (e.g., `api.yourdental.ai`) to your server
2. Use a reverse proxy (nginx/caddy) with SSL for the backend
3. Deploy the dashboard to Vercel or similar:
   ```bash
   cd dashboard && npx vercel --prod
   ```

### 5.3 Supabase Production

1. Apply the migration to your production Supabase project:
   ```bash
   npx supabase db push --linked
   ```
2. Create a Supabase Auth user for the clinic owner:
   - Email: clinic email
   - User metadata: `{ "clinic_id": "uuid", "role": "owner" }`

### 5.4 Monitoring Checklist

- [ ] Backend health: `GET /` returns `200`
- [ ] Agent connects to LiveKit room on incoming call
- [ ] Outbound calls show in LiveKit dashboard
- [ ] SMS delivered (check Twilio logs)
- [ ] Scheduler jobs running (check backend logs)
- [ ] Dashboard metrics populating
- [ ] RLS policies verified (test cross-clinic access denied)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Inbound calls not reaching agent | Check Twilio trunk Origination URI + LiveKit SIP trunk allowed_addresses |
| Outbound calls failing | Verify SIP trunk auth credentials match Twilio termination config |
| "No agent available" error | Ensure agent process is running with `python main.py dev` |
| SMS not sending | Check TWILIO_PHONE_NUMBER matches the number in your Twilio account |
| Agent hangs up immediately | Check GROQ_API_KEY is valid and has credits |
| Transcript not saving | Verify BACKEND_URL in agent .env is reachable |
| Dashboard shows no data | Confirm BACKEND_URL in Next.js .env.local and API rewrites in next.config.ts |
