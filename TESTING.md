# ShadowShield QA Verification

## Localhost

1. Copy `.env.example` to `.env.local`.
2. Set `MONGODB_URI` to a MongoDB Atlas connection string.
3. Optionally set `GEMINI_API_KEY` for AI explanations. Without it, deterministic explanations are used.
4. Run `npm install`.
5. Run `npm run dev`.
6. Open `http://localhost:3000`.
7. Log in with `admin@shadowshield.ai` and `admin123`.

## Dashboard Real-Time Sync

1. Open `/dashboard`.
2. Open `/events` in another browser tab.
3. Trigger an extension visit to `https://unknownpdf.ai`.
4. Confirm dashboard cards, charts, alerts, and live events update without refresh.

## Browser Extension

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Load unpacked extension from `extension/`.
4. Open the extension popup.
5. Set API base URL to `http://localhost:3000`.
6. Set employee email to `rahul@company.com`.
7. Visit `https://unknownpdf.ai`.
8. Confirm the block page appears.

## Blocking And Approval

1. On the block page, enter a business reason.
2. Click `Request Access`.
3. In the dashboard, open `/access-requests`.
4. Approve the pending request.
5. Confirm the blocked extension page reloads to the original site within a few seconds.
6. Confirm `/inventory` shows the domain as approved and not blocked.

## Database

1. Open `/dashboard/database`.
2. Switch between Apps, Employees, Alerts, Events, Access Requests, Stats, and Controls.
3. Search for `unknownpdf.ai`.
4. Export JSON and CSV.
5. Delete a non-critical test record.
6. Use Controls to load demo data and reset the database.

## Charts

1. Load the demo incident.
2. Confirm the risk pie chart shows labels such as `HIGH 4`.
3. Confirm category bars show numeric labels.
4. Trigger extension detections and confirm chart counts change live.

## Gemini

1. Start without `GEMINI_API_KEY` and call `/api/analyze`; confirm a deterministic explanation is returned.
2. Set `GEMINI_API_KEY`, restart `npm run dev`, and call `/api/analyze`; confirm Gemini text is returned when the API is reachable.

## Uploads

1. Open `/dashboard`.
2. Upload a CSV with columns `employee_email,tool_name,domain,oauth_permissions,department,signup_date`.
3. Confirm apps, employees, alerts, charts, and database records update.
4. Restart the server and confirm data persists when MongoDB is configured.

## Automated Tests

Run:

```bash
npm test
npm run build
```
