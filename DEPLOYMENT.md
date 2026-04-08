# Coolify Deployment Guide — Dental Voice AI

Deploy the full stack (backend, agent, dashboard) to your VPS via Coolify's GUI.

---

## Prerequisites

- Coolify installed on your VPS
- GitHub repo: `toprmrproducer/dental-voice-ai`
- All API keys ready (see `API_KEYS_CHECKLIST.md`)

---

## Step 1: Create a New Resource in Coolify

1. Open Coolify dashboard
2. Click **"+ New Resource"**
3. Choose **"Docker Compose"** as the Build Pack
4. Connect your GitHub repo: `toprmrproducer/dental-voice-ai`
5. Branch: `main`

---

## Step 2: Add Environment Variables

In Coolify's **Environment Variables** section, add ALL of these:

```
SUPABASE_URL=https://pghipeagcnoqpdhfajrw.supabase.co
SUPABASE_SERVICE_KEY=<your service role key>
NEXT_PUBLIC_SUPABASE_URL=https://pghipeagcnoqpdhfajrw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
GROQ_API_KEY=<your groq key>
LIVEKIT_URL=<your livekit url>
LIVEKIT_API_KEY=<your livekit api key>
LIVEKIT_API_SECRET=<your livekit api secret>
TWILIO_ACCOUNT_SID=<your twilio sid>
TWILIO_AUTH_TOKEN=<your twilio auth token>
TWILIO_PHONE_NUMBER=<your twilio number>
TWILIO_SIP_DOMAIN=<your twilio sip domain>
LIVEKIT_SIP_OUTBOUND_TRUNK_ID=<your trunk id>
SARVAM_API_KEY=<your sarvam key>
SARVAM_LANGUAGE_CODE=en-US
SARVAM_VOICE=<voice name or leave empty>
```

Copy values from your `all_api_keys.env` file.

---

## Step 3: Deploy

Click **"Deploy"** in Coolify. It will:

1. Pull the repo
2. Read `docker-compose.yml`
3. Build all 3 services (backend, agent, dashboard)
4. Start them with the environment variables you entered
5. Backend starts first (healthcheck), then agent and dashboard start

---

## Step 4: Set Up Domains (Optional)

In Coolify's domain settings for each service:

| Service | Port | Domain |
|---------|------|--------|
| backend | 8000 | `api.yourdomain.com` |
| dashboard | 3000 | `app.yourdomain.com` |

Coolify handles SSL automatically via Let's Encrypt.

---

## Step 5: Verify

Check the Coolify dashboard for green status on all 3 services. You can also check:

- Backend health: `https://api.yourdomain.com/health`
- Dashboard: `https://app.yourdomain.com`

---

## Troubleshooting

- **Build fails**: Check Coolify build logs. Ensure all env vars are set.
- **Backend won't start**: Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct.
- **Agent won't start**: It waits for backend to be healthy first. Check backend health.
- **Dashboard blank page**: Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set (these are build-time vars).

---

## Redeploying

Push changes to `main` branch on GitHub. In Coolify, click **"Redeploy"** or enable auto-deploy from the settings.
