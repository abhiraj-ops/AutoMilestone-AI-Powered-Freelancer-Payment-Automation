# ⚡ AutoMilestone

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white&style=flat-square)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black&style=flat-square)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.0%20Flash-4285F4?logo=google&logoColor=white&style=flat-square)
![PayPal](https://img.shields.io/badge/PayPal-Payouts%20API-003087?logo=paypal&logoColor=white&style=flat-square)
![Render](https://img.shields.io/badge/Deployed%20on-Render-46E3B7?logo=render&logoColor=black&style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**AutoMilestone** is an AI-powered freelance payment automation platform. Clients create projects with milestone-based payment schedules, freelancers submit their deliverables, and a Gemini AI agent autonomously reviews the work against the original brief — triggering an instant PayPal payout the moment quality criteria are met. No manual approvals. No chasing invoices. Just work, verify, pay.

AutoMilestone lets clients create projects with milestone-based payment schedules. Freelancers submit deliverables. A Google Gemini 2.0 Flash AI agent autonomously reviews the work against the original brief and triggers an instant PayPal payout when the submission scores **≥ 75/100**. No manual approvals needed.

> AI verifies the work. PayPal sends the money.

## How it works

1. **Client** creates a project with 1+ milestones (title + USD amount each). Total = sum of milestones.
2. **Client** funds it via PayPal Orders API (Sandbox). Project flips `draft → active` on capture.
3. **Freelancer** opens the project by ID, submits `deliverable_text` per milestone → status `submitted`.
4. **Freelancer** clicks **🤖 Run AI Verification**. Backend calls Gemini 2.0 Flash with the brief + deliverable, expects raw JSON `{ approved, score, feedback, missing[] }`.
5. **Approved (score ≥ 75)** → backend calls PayPal Payouts API to the freelancer email, inserts a `payments` row (`pending`), marks milestone `paid` with `payout_batch_id`.
6. **Needs revision (< 75)** → frontend shows feedback + missing items; freelancer revises and resubmits.
7. **PayPal webhook** `PAYMENT.PAYOUTS-ITEM.SUCCEEDED` flips payment `pending → completed`. The live feed polls `GET /api/payments` every 10s.

## Monorepo structure

```
automilestone/
├── backend/
│   ├── routes/paypal.js        # create/capture orders (native fetch, Sandbox)
│   ├── routes/gemini.js        # POST /api/verify-milestone/:id — AI + payout orchestration
│   ├── routes/projects.js      # projects + milestones + payments CRUD
│   ├── routes/webhooks.js      # POST /api/webhooks/paypal
│   ├── services/paypalService.js
│   ├── services/geminiService.js
│   ├── db/schema.sql
│   ├── db/index.js             # better-sqlite3 + schema auto-run on boot
│   ├── server.js               # Express 4 + CORS + route mounting
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/pages/Home.jsx
│   ├── src/pages/ClientDashboard.jsx
│   ├── src/pages/FreelancerDashboard.jsx
│   ├── src/components/AIVerifier.jsx
│   ├── src/components/MilestoneCard.jsx
│   ├── src/components/PayButton.jsx
│   ├── src/components/PaymentFeed.jsx
│   ├── src/components/CreateProject.jsx
│   ├── src/App.jsx             # React Router v6: / /client /freelancer
│   ├── src/main.jsx
│   ├── src/index.css
│   ├── index.html              # Inter font
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
├── render.yaml
├── package.json                # concurrently dev orchestration
└── README.md
```

## Database (SQLite)

`backend/db/schema.sql` runs automatically on server start (`db/index.js`). 3 tables: `projects`, `milestones`, `payments`. See file for full DDL.

- `projects.status`: `draft → active` after PayPal capture.
- `milestones.status`: `pending → submitted → approved/needs-revision → paid`.
- `payments.status`: `pending → completed` via webhook.

## Tech stack

- **Backend:** Node.js 18+ · Express 4 · `better-sqlite3` · `cors` · `dotenv` · `uuid` · `axios` (optional)
- **Frontend:** React 18 · Vite · React Router v6 · Tailwind CSS v3 · `@paypal/react-paypal-js`
- **AI:** Google Gemini 2.0 Flash (`@google/generative-ai`), model `gemini-2.0-flash`, raw-JSON-only prompt.
- **Payments:** PayPal Orders API + Payouts API (Sandbox), native `fetch`, Basic OAuth + Bearer.

## Setup

### 1) Prerequisites

- Node.js 18+ (tested path: `node --version`)
- PayPal Developer app → Sandbox Client ID / Secret
- Google AI Studio (Gemini) API key
- A PayPal Sandbox business + personal account (for checkout + payout receiver)

### 2) Backend

```bash
cd backend
cp .env.example .env
# Edit .env with real keys (never commit .env)
npm install
npm run dev        # or: npm start
# → http://localhost:5000/api/health  { "ok": true }
```

`backend/.env.example`:

```env
PORT=5000
NODE_ENV=development
PAYPAL_CLIENT_ID=your_paypal_client_id_sandbox
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_sandbox
PAYPAL_ENV=sandbox
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=http://localhost:5173
DATABASE_PATH=./automilestone.db
```

### 3) Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env — VITE_API_URL=http://localhost:5000
# VITE_PAYPAL_CLIENT_ID=same sandbox client id as backend
npm install
npm run dev        # → http://localhost:5173
```

### 4) Both together (from repo root)

```bash
npm install        # installs concurrently at root
npm run dev        # backend + frontend in parallel
```

## API reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/projects` | Create project + milestones (transaction). Body: `{ client_email, freelancer_email, title, description, total_amount, milestones: [{title, amount}] }` |
| `GET` | `/api/projects` | List projects |
| `GET` | `/api/projects/:id` | Project + `milestones[]` joined |
| `POST` | `/api/milestones/:id/submit` | Body: `{ deliverable_text }` → `submitted` |
| `POST` | `/api/verify-milestone/:id` | Gemini verify → if approved, PayPal payout + payment row + `paid`. Returns `{ approved, score, feedback, missing, milestone, payout_triggered, payout }` |
| `POST` | `/api/paypal/create-order` | Body: `{ amount, projectId }` → `{ id }` (PayPal order id) |
| `POST` | `/api/paypal/capture-order` | Body: `{ orderID, projectId }` → capture + project `active` |
| `POST` | `/api/webhooks/paypal` | `PAYMENT.PAYOUTS-ITEM.SUCCEEDED` → payment `completed` |
| `GET` | `/api/payments` | Payments joined with milestone + project title |

### Gemini JSON contract

Gemini is instructed to return **raw JSON only** (no markdown fences). `geminiService.js` enforces `score >= 75 → approved = true` even if the model flips the boolean, and falls back to `{ approved:false, score:0, feedback:"AI parse error" }` on parse failure, or `AI service temporarily unavailable…` on quota/overload.

### PayPal notes (Sandbox)

- All PayPal hosts are hard-coded to `api-m.sandbox.paypal.com` as specified.
- `getAccessToken()` caches per-process (no cache yet — fine for demo, add in-memory cache for prod).
- Payouts require the PayPal app to have Payouts enabled; receiver email must be a confirmed Sandbox personal account.
- In production, switch hosts to `api-m.paypal.com` and set `PAYPAL_ENV=live`.

## Frontend notes

- **Dark theme:** `bg-gray-950` base, `bg-gray-900` cards, `gray-800` borders; indigo-500 primary, emerald-500 success, red-400 rejection. Only the AI result panel uses a gradient.
- **Routing:** `/` Home, `/client` ClientDashboard, `/freelancer` FreelancerDashboard (navbar persists).
- **Toasts:** `src/hooks/useToast.jsx` (`useToast` + `ToastList`) — used for all API errors.
- **Loading:** spinners + disabled buttons during flights; `PaymentFeed` skeleton on first load, polling every 10s.
- **AIVerifier states:** `idle → loading → approved | rejected`. Approved triggers a confetti-flash + payout banner.

## Deployment — Render

`render.yaml` at root provisions `automilestone-backend` (Node, `cd backend && npm install`, `cd backend && node server.js`). Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `GEMINI_API_KEY`, `FRONTEND_URL` in the Render dashboard (they are `sync: false`). Deploy the frontend separately (e.g. Netlify/ Vercel) and point `FRONTEND_URL` + `VITE_API_URL` at each other.

## Demo checklist

1. `POST /api/projects` creates project + milestones in DB — verify via `GET /api/projects/:id`.
2. PayPal button renders (set `VITE_PAYPAL_CLIENT_ID`) and Sandbox checkout completes → project `active`.
3. `POST /api/milestones/:id/submit` saves `deliverable_text`.
4. `POST /api/verify-milestone/:id` returns Gemini JSON with score (try a strong vs. weak deliverable to see approve vs. needs-revision).
5. Score ≥ 75 → Payout API fires; check PayPal Sandbox → Activity for the payout.
6. Payment row appears in `GET /api/payments`.
7. Live feed updates without refresh.

## Security / prod hardening

- Move `.env` keys to secret manager; never commit `.env` (already `.gitignore`d).
- Add rate limiting + input sanitization (current scaffold trusts the demo inputs).
- Cache `getAccessToken()` with TTL; add idempotency keys on payout retries.
- Serve backend behind HTTPS in production; webhook signature verification (PayPal `VERIFY_WEBHOOK_SIGNATURE`) is not in the demo scope.
- SQLite is single-instance by design; swap `better-sqlite3` calls for Postgres if you need multi-instance.

## License

MIT — see `LICENSE`.
