# ShadowShield AI

ShadowShield AI is a hackathon-ready full-stack MVP for detecting unauthorized SaaS usage from employee signup data, scoring risk, and showing organizational exposure.

Tagline: "Detecting the SaaS tools your employees use before they become security incidents."

## Folder Structure

```txt
app/
  api/
  login/
  (protected)/dashboard/
  (protected)/inventory/
  (protected)/employees/
  (protected)/alerts/
components/
data/
lib/
models/
tests/
types/
public/
```

## Features

- JWT admin login with mock credentials
- Chrome Manifest V3 browser agent for real-time SaaS navigation checks
- `/api/check-domain` prevention API with validation, sanitization, decisioning, and rate limiting
- ALLOW / WARN / BLOCK policy enforcement with extension warning banners and branded blocked page
- Live browser access events table with employee, domain, decision, risk, timestamp, and reason filters
- Admin approve and revoke controls for SaaS domains
- CSV and JSON upload parsing
- Demo incident loader with 10 employees and 15 SaaS detections
- Deterministic SaaS category and risk scoring
- AI-ready explanation endpoint with OpenAI fallback support
- Dashboard metrics, pie chart, category bar chart, heatmap, and activity timeline
- Inventory filtering by risk, category, department, app, and employee
- Employee exposure cards
- In-app, email, and Slack alert simulations for high-risk tools
- Automatic in-app, email simulation, and Slack simulation alerts for blocked browser access
- MongoDB Atlas support through Mongoose, with local in-memory fallback when `MONGODB_URI` is empty

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Demo login:

```txt
admin@shadowshield.ai
admin123
```

## Environment

```env
MONGODB_URI=
JWT_SECRET=change-me-in-production
OPENAI_API_KEY=
GEMINI_API_KEY=
NEXTAUTH_SECRET=change-me-if-using-nextauth
```

`MONGODB_URI` is optional for local demos. If omitted, the app stores uploaded/demo analysis in memory for the running process.

## Upload Format

CSV columns:

```csv
employee_email,tool_name,domain,oauth_permissions,department,signup_date
rahul@company.com,ChatGPT,chat.openai.com,profile,Engineering,2026-05-10
priya@company.com,UnknownPDFAI,unknownpdf.ai,drive.read,Finance,2026-05-12
```

JSON uploads can be either an array of records or `{ "records": [...] }`.

## Test

```bash
npm run test
```

## Real-Time Chrome Extension

Run the app locally:

```bash
npm run dev
```

Load the extension:

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the `/extension` folder in this project.
6. Click the ShadowShield Guard extension icon.
7. Set employee email to `rahul@company.com`.
8. Set backend URL to `http://localhost:3000`.

Test domains:

- Visit `https://unknownpdf.ai`: access should be blocked and redirected to the branded ShadowShield page.
- Visit `https://github.com`: access should be allowed.
- Visit `https://claude.ai`: access should show a warning banner.
- Open `http://localhost:3000/events` as an authenticated admin to see live browser events.

Decision fixtures:

- BLOCK: `unknownpdf.ai`, `mysteryocr.io`, `darkgpt.ai`, `hack-ai.xyz`
- WARN: `perplexity.ai`, `claude.ai`, `zapier.com`
- ALLOW: `github.com`, `openai.com`, `slack.com`, `canva.com`

## Deploy

Vercel:

1. Import the repository.
2. Add environment variables.
3. Set `MONGODB_URI` to your MongoDB Atlas connection string.
4. Deploy.

The app uses Next.js API routes, so no separate backend is required for the MVP.
