# Dental Voice AI Receptionist

Full-stack AI-powered dental receptionist system for automated inbound/outbound calling, appointment booking, recall campaigns, and real-time clinic dashboards.

## Architecture

- **Agent** — LiveKit VoicePipelineAgent (Python) with Groq STT/LLM/TTS + Silero VAD
- **Backend** — FastAPI server with Supabase DB, Twilio SMS, APScheduler cron jobs
- **Dashboard** — Next.js 14 App Router with Tailwind CSS and Recharts
- **Database** — Supabase PostgreSQL with RLS per clinic_id
- **Storage** — Supabase Storage (S3-compatible) for call recordings
- **Telephony** — Twilio Elastic SIP Trunking + LiveKit SIP

## Quick Start

### 1. Database

```bash
# Apply the migration to your Supabase project
npx supabase db push --linked
# Or run supabase/migrations/001_initial.sql manually in SQL Editor
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # Fill in your keys
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. Agent

```bash
cd agent
cp .env.example .env   # Fill in your keys
pip install -r requirements.txt
python main.py dev
```

### 4. Dashboard

```bash
cd dashboard
cp .env.local.example .env.local   # Fill in your keys
npm install
npm run dev
```

### 5. Docker (all services)

```bash
docker-compose up --build
```

## Setup Guide

See [docs/twilio-livekit-setup.md](docs/twilio-livekit-setup.md) for complete Twilio + LiveKit SIP trunk configuration.

## Project Structure

```
dental-voice-ai/
├── agent/           # LiveKit voice agent (Python)
├── backend/         # FastAPI backend with Twilio + Supabase
├── dashboard/       # Next.js 14 clinic dashboard
├── supabase/        # Database migrations and seed data
├── docs/            # Setup documentation
└── docker-compose.yml
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Voice Agent | LiveKit Agents 0.12.18+, Groq (Whisper + Llama 3.3 + PlayAI TTS) |
| Backend | FastAPI, APScheduler, Supabase Python SDK |
| Dashboard | Next.js 14, Tailwind CSS, Recharts, Lucide Icons |
| Database | Supabase PostgreSQL with Row Level Security |
| Storage | Supabase Storage (S3-compatible) |
| Telephony | Twilio Elastic SIP + LiveKit SIP |
| SMS | Twilio Messaging API |

## License

Private — All rights reserved.
