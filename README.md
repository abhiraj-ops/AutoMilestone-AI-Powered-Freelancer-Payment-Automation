# ⚡ AutoMilestone

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white&style=flat-square)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black&style=flat-square)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.0%20Flash-4285F4?logo=google&logoColor=white&style=flat-square)
![PayPal](https://img.shields.io/badge/PayPal-Payouts%20API-003087?logo=paypal&logoColor=white&style=flat-square)
![Render](https://img.shields.io/badge/Deployed%20on-Render-46E3B7?logo=render&logoColor=black&style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**AutoMilestone** is an AI-powered freelance payment automation platform. Clients create projects with milestone-based payment schedules, freelancers submit their deliverables, and a Gemini AI agent autonomously reviews the work against the original brief — triggering an instant PayPal payout the moment quality criteria are met. No manual approvals. No chasing invoices. Just work, verify, pay.

[Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [API Reference](#-api-reference) · [Environment Variables](#-environment-variables)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 AI Verification Agent | Gemini 2.0 Flash scores submissions 0–100 against requirements |
| 💸 Instant PayPal Payouts | Auto-fires PayPal payout when AI score ≥ 75 |
| 🔐 Escrow-Style Funding | Clients fund via PayPal Orders API; held until milestone passes |
| 🔁 Revision Loop | Rejected work returns structured AI feedback |
| 📊 Payment Dashboard | Real-time feed of milestones, scores, and payout statuses |
| 🔔 Webhook Events | Live PayPal event confirmation via Webhooks |

---

## 🏗 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind CSS | Client & freelancer dashboards |
| Backend | Node.js 18 + Express 4 | REST API, business logic |
| Database | SQLite via `better-sqlite3` | Projects, milestones, payments |
| AI Engine | Google Gemini 2.0 Flash | Deliverable verification agent |
| Payments | PayPal Orders + Payouts + JS SDK | Funding, payouts, webhooks |
| Hosting | Render (backend) + Vercel (frontend) | Deployment |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- A [PayPal Developer](https://developer.paypal.com) account (free sandbox)
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/automilestone.git
cd automilestone

# 2. Install backend dependencies
cd backend && npm install

# 3. Install frontend dependencies
cd ../frontend && npm install

# 4. Configure environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Running Locally

```bash
# Terminal 1 — Backend (port 3001)
cd backend && npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend && npm run dev
```

---

## 🔑 Environment Variables

```env
# backend/.env
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_ENV=sandbox
GEMINI_API_KEY=your_google_gemini_api_key
PORT=3001
FRONTEND_URL=http://localhost:5173
WEBHOOK_ID=your_paypal_webhook_id

# frontend/.env
VITE_PAYPAL_CLIENT_ID=your_sandbox_client_id
VITE_API_URL=http://localhost:3001
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/projects | Create project with milestones |
| GET | /api/projects/:id | Fetch project + milestones |
| POST | /api/milestones/:id/submit | Freelancer submits deliverable |
| POST | /api/verify-milestone/:id | ⭐ Gemini verification + auto-payout |
| POST | /api/paypal/create-order | Create PayPal Order |
| POST | /api/paypal/capture-order | Capture PayPal Order |
| POST | /api/webhooks/paypal | Receive PayPal events |
| GET | /api/payments | List all payment history |

---

## 🤖 How the AI Agent Works

1. Freelancer submits deliverable text via the dashboard
2. `POST /api/verify-milestone/:id` sends requirements + submission to Gemini 2.0 Flash
3. Gemini returns structured JSON: `{ approved, score, feedback, missing }`
4. If `score ≥ 75` → PayPal Payouts API fires instantly, milestone marked `paid`
5. If `score < 75` → Structured feedback returned, milestone marked `needs-revision`

---

## 📄 License

MIT © 2025 AutoMilestone
