# Football AutoPost Pro — Vercel Edition

## Stack
- **Frontend**: React + Vite (hosted on Vercel)
- **Backend**: Express (Vercel Serverless Functions)
- **Database**: Neon (free hosted Postgres)
- **Cron**: Vercel Cron → `/api/poll` every minute

---

## Deploy to Vercel

### Step 1 — Get a free Neon database
1. Go to [neon.tech](https://neon.tech) and sign up (free)
2. Create a new project
3. Copy the **Connection String** — looks like:
   `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`

### Step 2 — Initialise the database schema
```bash
cd backend
npm install
DATABASE_URL="your_neon_connection_string" node db.js
```
This creates all 4 tables. Run once only.

### Step 3 — Push to GitHub
```bash
git init
git add .
git commit -m "initial commit"
gh repo create football-autopost-pro --public --push
```

### Step 4 — Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Vercel auto-detects the `vercel.json` — no framework config needed
4. Add these **Environment Variables** in Vercel dashboard:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `FOOTBALL_API_KEY` | From api-football.com |
| `TELEGRAM_BOT_TOKEN` | From @BotFather |
| `WHATSAPP_TOKEN` | WhatsApp Cloud API token |
| `WHATSAPP_PHONE_ID` | WhatsApp phone number ID |
| `CRON_SECRET` | Any random string (e.g. `openssl rand -hex 20`) |

5. Click **Deploy** ✓

---

## How the Cron Works on Vercel

`vercel.json` defines a cron job that hits `POST /api/poll` every minute.
Vercel sends a request with the header `x-vercel-cron: 1` — but you should
also set `CRON_SECRET` so nobody else can trigger it manually.

On the **free Hobby plan**, Vercel Cron runs **once per day** maximum.
For more frequent polling (every minute), use a free external service:

👉 **[cron-job.org](https://cron-job.org)** (free)
- Create account → New cronjob
- URL: `https://your-app.vercel.app/api/poll`
- Method: `POST`
- Header: `x-cron-secret: your_cron_secret`
- Schedule: every 1 minute

---

## Local Development

```bash
# Terminal 1 — backend
cd backend
npm install
cp .env .env.local   # fill in your keys
npm run dev          # runs on :4000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev          # runs on :5173, proxies /api → :4000
```

---

## Project Structure

```
football-autopost-pro/
├── vercel.json              ← routing + cron config
├── backend/
│   ├── index.js             ← Express app (exported for Vercel)
│   ├── db.js                ← Postgres (Neon) connection + schema
│   ├── routes/
│   │   ├── matches.js
│   │   ├── channels.js
│   │   └── posts.js
│   ├── services/
│   │   ├── footballApi.js
│   │   ├── telegram.js
│   │   └── whatsapp.js
│   └── jobs/
│       └── liveMatchPoller.js   ← called by POST /api/poll
└── frontend/
    └── src/
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── Composer.jsx
        │   ├── Channels.jsx
        │   └── Analytics.jsx
        └── ...
```
