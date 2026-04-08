# API Keys Checklist

Use this checklist to gather all API keys before deployment.

## Required Keys (Must Have)

- [ ] **Supabase Service Key** 
  - Get from: https://supabase.com/dashboard/project/pghipeagcnoqpdhfajrw/settings/api
  - Field: **Service Role key**
  - Used by: backend (database access)

- [ ] **Groq API Key**
  - Get from: https://console.groq.com/keys
  - Format: Starts with `gsk_`
  - Used by: agent (LLM, STT, TTS)

- [ ] **LiveKit URL**
  - Get from: https://cloud.livekit.io → Your Project → Settings
  - Format: `wss://your-project.livekit.cloud`
  - Used by: agent, backend

- [ ] **LiveKit API Key**
  - Get from: Same page as LiveKit URL
  - Format: Starts with `API`
  - Used by: agent, backend

- [ ] **LiveKit API Secret**
  - Get from: Same page as LiveKit URL
  - Used by: agent, backend

## Optional Keys (Needed for Phone Calls & SMS)

- [ ] **Twilio Account SID**
  - Get from: https://console.twilio.com
  - Format: `AC` + 32 hex chars
  - Used by: backend (phone calls, SMS)

- [ ] **Twilio Auth Token**
  - Get from: Same page
  - Used by: backend

- [ ] **Twilio Phone Number**
  - Get from: Twilio → Phone Numbers → Buy a number
  - Format: `+1-XXX-XXX-XXXX` (or your country's format)
  - Used by: backend

- [ ] **Twilio SIP Domain**
  - Get from: Twilio → Trunks → Your trunk → Settings
  - Format: `your-trunk.pstn.twilio.com`
  - Used by: backend

## Optional Keys (Hindi Support)

- [ ] **Sarvam API Key**
  - Get from: https://dashboard.sarvam.ai
  - Used by: agent (Hindi speech recognition + synthesis)
  - **Leave blank to use Groq instead**

## Final Supabase Keys (Pre-Filled)

✅ **SUPABASE_URL**: `https://pghipeagcnoqpdhfajrw.supabase.co`

✅ **NEXT_PUBLIC_SUPABASE_ANON_KEY**: 
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnaGlwZWFnY25vcXBkaGZhanJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTQ4NjcsImV4cCI6MjA5MTEzMDg2N30.W-A3cV-lSh9qZ7xiB6-i9rf1flSwgjAkYyaYgMLY2Zk
```

---

## Minimum Setup (Just to Test)

To get the system running with **zero headache**:

1. Get: **Groq API Key** + **LiveKit keys** (URL, API Key, API Secret)
2. Skip: Twilio (phone calls won't work) and Sarvam (Groq will handle speech)
3. Deploy via `DEPLOYMENT.md`
4. Test at https://app.yourdomain.com

Dashboard will work, agent will work, voices will work (via Groq).

---

## Put Keys Here (Temporary)

Use this space to paste keys **before** putting them in deployment:

```
SUPABASE_SERVICE_KEY: 
GROQ_API_KEY: 
LIVEKIT_URL: 
LIVEKIT_API_KEY: 
LIVEKIT_API_SECRET: 
TWILIO_ACCOUNT_SID: 
TWILIO_AUTH_TOKEN: 
TWILIO_PHONE_NUMBER: 
TWILIO_SIP_DOMAIN: 
SARVAM_API_KEY: 
```

**⚠️ Never commit this file to GitHub. Delete after copying to VPS `.env` files.**
