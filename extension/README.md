# ShadowShield Guard Extension

Manifest V3 Chrome extension for real-time ShadowShield SaaS prevention.

## Load In Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this `/extension` folder.
5. Click the ShadowShield Guard extension icon and set:
   - Employee email: `rahul@company.com`
   - Backend URL: `http://localhost:3000`

## Test

Keep the Next.js app running locally, then visit:

- `https://unknownpdf.ai` should redirect to the ShadowShield blocked page.
- `https://github.com` should be allowed.
- `https://claude.ai` should show a warning banner.

Events appear in the app at `/events`. Block events also generate in-app, email simulation, and Slack simulation alerts.
