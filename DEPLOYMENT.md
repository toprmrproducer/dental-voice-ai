# VPS Deployment Guide — Dental Voice AI

Complete step-by-step instructions to deploy the entire application to a VPS using Docker Compose.

---

## Prerequisites

- **VPS**: Ubuntu 22.04+, 2 vCPU, 4GB RAM (DigitalOcean, Hetzner, Linode, AWS, etc.)
- **Domain name** (e.g., `yourdomain.com`)
- **API Keys** (Supabase, Groq, LiveKit, Twilio, Sarvam — see `all_api_keys.env`)

---

## Step-by-Step Deployment

### **1. Get a VPS & Note the IP**

Buy a VPS from any provider. You'll get an IP like `123.45.67.89`.

### **2. SSH into VPS**

```bash
ssh root@123.45.67.89
# Enter password when prompted
```

### **3. Install Docker & Docker Compose**

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### **4. Set Up DNS**

Go to your domain registrar (GoDaddy, Namecheap, Route53, etc.) and add **A records**:

| Subdomain | Target | TTL |
|-----------|--------|-----|
| `yourdomain.com` | `123.45.67.89` | 3600 |
| `api.yourdomain.com` | `123.45.67.89` | 3600 |
| `app.yourdomain.com` | `123.45.67.89` | 3600 |

**⏳ DNS takes 5-30 minutes to propagate — continue while waiting.**

### **5. Clone Repository**

```bash
cd /root
git clone https://github.com/toprmrproducer/dental-voice-ai.git
cd dental-voice-ai
```

### **6. Create `.env` Files**

Copy your API keys into the service `.env` files.

**backend/.env**
```bash
cat > backend/.env << 'EOF'
SUPABASE_URL=https://pghipeagcnoqpdhfajrw.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SUPABASE_SERVICE_KEY
GROQ_API_KEY=YOUR_GROQ_API_KEY
LIVEKIT_URL=YOUR_LIVEKIT_URL
LIVEKIT_API_KEY=YOUR_LIVEKIT_API_KEY
LIVEKIT_API_SECRET=YOUR_LIVEKIT_API_SECRET
TWILIO_ACCOUNT_SID=YOUR_TWILIO_SID
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER=YOUR_TWILIO_PHONE_NUMBER
TWILIO_SIP_DOMAIN=YOUR_TWILIO_SIP_DOMAIN
EOF
```

**agent/.env**
```bash
cat > agent/.env << 'EOF'
GROQ_API_KEY=YOUR_GROQ_API_KEY
LIVEKIT_URL=YOUR_LIVEKIT_URL
LIVEKIT_API_KEY=YOUR_LIVEKIT_API_KEY
LIVEKIT_API_SECRET=YOUR_LIVEKIT_API_SECRET
SARVAM_API_KEY=
SARVAM_LANGUAGE_CODE=hi-IN
SARVAM_VOICE=meera
EOF
```

**dashboard/.env.local**
```bash
cat > dashboard/.env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://pghipeagcnoqpdhfajrw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnaGlwZWFnY25vcXBkaGZhanJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTQ4NjcsImV4cCI6MjA5MTEzMDg2N30.W-A3cV-lSh9qZ7xiB6-i9rf1flSwgjAkYyaYgMLY2Zk
EOF
```

### **7. Create SSL Certificates**

```bash
# Install certbot
apt-get update && apt-get install -y certbot

# Get certificates for all domains (wait for DNS to propagate first)
certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  -d api.yourdomain.com \
  -d app.yourdomain.com \
  --email your-email@example.com \
  --agree-tos -n
```

### **8. Create Nginx Config**

```bash
mkdir -p /root/dental-voice-ai/nginx

cat > /root/dental-voice-ai/nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    # HTTP → HTTPS redirect
    server {
        listen 80 default_server;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # Backend API
    server {
        listen 443 ssl http2;
        server_name api.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

        location / {
            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # Dashboard
    server {
        listen 443 ssl http2;
        server_name app.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;

        location / {
            proxy_pass http://dashboard:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # Landing Page
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

        location / {
            proxy_pass http://landing:80;
            proxy_set_header Host $host;
        }
    }
}
EOF
```

### **9. Update docker-compose.yml**

Add Nginx service before the `landing` service:

```bash
cat >> docker-compose.yml << 'EOF'
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - backend
      - dashboard
      - landing
    restart: unless-stopped
EOF
```

### **10. Start All Containers**

```bash
cd /root/dental-voice-ai
docker-compose up -d --build
```

This will:
- Build all 4 Docker images (backend, agent, dashboard, landing)
- Start all 4 containers + Nginx
- Nginx proxies traffic and handles SSL
- All containers auto-restart if they crash

### **11. Verify Deployment**

```bash
# Check all containers are running
docker-compose ps

# View logs (Ctrl+C to exit)
docker-compose logs -f backend

# Test endpoints
curl https://api.yourdomain.com/
curl https://app.yourdomain.com/
curl https://yourdomain.com/
```

### **12. Auto-Renew SSL Certificates**

Add a cron job to auto-renew Let's Encrypt certificates:

```bash
crontab -e
```

Add this line:
```bash
0 2 * * * certbot renew --quiet && docker-compose -f /root/dental-voice-ai/docker-compose.yml restart nginx
```

---

## Updating Code

When you update code on GitHub:

```bash
cd /root/dental-voice-ai
git pull origin main
docker-compose up -d --build
```

---

## Troubleshooting

### Containers keep crashing

```bash
# View error logs
docker-compose logs backend
docker-compose logs agent
docker-compose logs dashboard

# Restart everything
docker-compose restart
```

### SSL certificate errors

```bash
# Check certificate status
certbot status

# Force renew
certbot renew --force-renewal
```

### API calls failing from dashboard

Make sure:
1. Backend container is healthy: `docker-compose ps`
2. DNS propagation is complete (test with `nslookup api.yourdomain.com`)
3. Firewall allows ports 80/443: `sudo ufw allow 80/443/tcp`

---

## Final Checklist

- ✅ VPS IP noted
- ✅ DNS A records created
- ✅ Docker & Docker Compose installed
- ✅ Repository cloned
- ✅ `.env` files filled with API keys
- ✅ SSL certificates generated
- ✅ Nginx config created
- ✅ `docker-compose up -d --build` executed
- ✅ Endpoints tested and working
