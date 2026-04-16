# ContentFlow – Render Deployment Guide

## Architecture Overview

```
Internet
   │
   ├── contentflow-webapp.onrender.com     → React SPA  (Render Static Site — FREE, no sleep)
   ├── contentflow-api.onrender.com        → NestJS API Gateway (Render Web Service — free tier)
   ├── contentflow-campaign.onrender.com   → Campaign Service
   ├── contentflow-content.onrender.com    → Content Service
   ├── contentflow-segmentation.onrender.com → Segmentation Service
   ├── contentflow-notification.onrender.com → Notification Service
   └── contentflow-analytics.onrender.com → Analytics Service

External Managed Services (free tiers):
   ├── MongoDB Atlas  — database (512MB free)
   ├── Upstash Redis  — caching / queues (256MB / 500K cmds/mo free)
   └── Cloudflare R2  — file storage (10GB / no egress fees free)
```

---

## Step 1 — Set Up MongoDB Atlas (free M0 cluster)

1. Go to https://cloud.mongodb.com and sign up / log in
2. Create a new project → **Build a Database** → choose **M0 Free**
3. Choose a cloud region close to your Render region (e.g. AWS us-east-1)
4. Create a database user (username + password — save these)
5. Under **Network Access** → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`)
   _(Render IPs are dynamic, so this is required for free tier)_
6. Get your connection string: **Connect → Drivers → Node.js**
   Format: `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net`

Each microservice uses its own database name — just append it to the URI:
- `api-service`: not needed (no direct DB)
- `campaign-service`: `...mongodb.net/campaign_service`
- `content-service`: `...mongodb.net/content_service`
- `user-segmentation-service`: `...mongodb.net/user_segmentation_service`
- `notification-service`: `...mongodb.net/notification_service`
- `analytics-service`: `...mongodb.net/contentflow_analytics`

---

## Step 2 — Set Up Upstash Redis (free tier)

1. Go to https://upstash.com and sign up / log in
2. **Create Database** → choose **Global** (lowest latency across regions) → Free tier
3. After creation, go to database details → copy the **Redis URL**
   Format: `rediss://default:xxxxxxxx@global-xxxxxxxx.upstash.io:6379`
4. All services share this single Redis instance (namespaced by service internally)

---

## Step 3 — Set Up Cloudflare R2 (free tier, replaces MinIO)

1. Go to https://dash.cloudflare.com → **R2 Object Storage**
2. Create a bucket named `contentflow-media`
3. Under **Settings → Public Access**, enable public access (needed for serving media)
   Copy the **R2.dev subdomain URL** — e.g. `https://pub-xxxx.r2.dev`
4. Go to **Manage R2 API Tokens** → Create Token with **Object Read & Write** permissions
   Copy the **Access Key ID** and **Secret Access Key**
5. Find your **Account ID** in the Cloudflare dashboard right sidebar
   R2 endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

---

## Step 4 — Push Code to GitHub

Make sure your repository root contains `render.yaml`.

```
contentflow/                  ← repo root
├── render.yaml               ← Render Blueprint
├── .env.example
├── api-service/
├── campaign-service/
├── content-Service/
├── user-segmentation-service/
├── notification-service/
├── analytics-service/
└── WebApp3.1/
```

```bash
git add render.yaml .env.example
git commit -m "Add Render deployment configuration"
git push origin main
```

---

## Step 5 — Deploy on Render via Blueprint

1. Log in to https://dashboard.render.com
2. Click **New → Blueprint**
3. Connect your GitHub repo
4. Render detects `render.yaml` automatically
5. Click **Apply** — Render creates all 7 services at once

---

## Step 6 — Set Environment Variables in Render Dashboard

After the blueprint applies, go to each service → **Environment** tab and set the
`sync: false` variables (the ones that need real values):

### All backend services need:
| Variable | Value |
|---|---|
| `JWT_SECRET` | Your strong random secret (same value for all services) |
| `MONGODB_URI` | Atlas connection string with the correct db name appended |
| `REDIS_URL` | Upstash Redis URL (same for all services) |

### content-service additionally needs:
| Variable | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | Cloudflare R2 Access Key ID |
| `AWS_SECRET_ACCESS_KEY` | Cloudflare R2 Secret Key |
| `AWS_S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `AWS_S3_BUCKET` | `contentflow-media` |
| `R2_PUBLIC_URL` | `https://pub-xxxx.r2.dev` (your R2 public URL) |

### api-service needs:
| Variable | Value |
|---|---|
| `ALLOWED_ORIGINS` | `https://contentflow-webapp.onrender.com` |

### notification-service needs:
| Variable | Value |
|---|---|
| `TWILIO_ACCOUNT_SID` | From Twilio console |
| `TWILIO_AUTH_TOKEN` | From Twilio console |
| `TWILIO_PHONE_NUMBER` | Your Twilio number |
| `FIREBASE_PROJECT_ID` | From Firebase console |
| `FIREBASE_PRIVATE_KEY` | From Firebase service account JSON |
| `FIREBASE_CLIENT_EMAIL` | From Firebase service account JSON |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Your email provider |

---

## Step 7 — Update Frontend API URL

After all services are deployed, update your React app to point to the live API gateway URL.

In `WebApp3.1/src`, find your API base URL config and set it to:
```
https://contentflow-api.onrender.com
```

Then redeploy the frontend by pushing to the linked branch.

---

## Free Tier Limits & What to Expect

| Resource | Free Limit | Notes |
|---|---|---|
| Render static site | Unlimited | Frontend — no sleep, no limits |
| Render web services | 750 hrs/month shared | ~1 always-on service OR multiple sleeping services |
| Service sleep | After 15 min idle | ~30s cold start on first request |
| MongoDB Atlas M0 | 512MB storage | Shared cluster, 500 max connections |
| Upstash Redis | 256MB / 500K cmds/mo | Resets monthly |
| Cloudflare R2 | 10GB storage / 1M writes / 10M reads | No egress fees |

### Managing the 750-hour shared limit
- Your **webapp** (Static Site) does NOT count against the 750 hours
- 750 hours ÷ 30 days = 25 hrs/day across all 6 backend services
- Services that sleep (no traffic) consume 0 hours while asleep
- The api-service is the most important to keep awake — consider upgrading it to
  **Starter ($7/month)** for always-on behaviour while keeping others on free

### Avoiding unexpected cold starts
Add a simple uptime monitor (UptimeRobot free tier) to ping `/health` on your
api-service every 14 minutes to prevent it from sleeping.
Free: https://uptimerobot.com

---

## Troubleshooting

**Build fails for TypeScript services:**
Ensure `tsconfig.json` has `"outDir": "./dist"` and the `build` script runs `tsc`.

**MongoDB Atlas connection refused:**
Check that `0.0.0.0/0` is in the Network Access allowlist.

**Content service can't connect to R2:**
Verify `AWS_S3_ENDPOINT` ends without a trailing slash and `AWS_REGION=auto`.

**Services can't reach each other:**
Render injects `fromService` URLs automatically. Check the **Environment** tab to
confirm the downstream service URLs were populated after first deploy.
