# Browser and accessibility tests

The Playwright suite is isolated from application code and covers:

- Chromium, Firefox, and WebKit desktop engines
- Chromebook, Android phone, and iPad viewports
- axe accessibility checks, including rendered colour contrast
- keyboard access, focus restoration, dialog behavior, and skip navigation
- horizontal overflow on public and authenticated views

Install the browser runtimes once:

```bash
npm run test:e2e:install
```

Run public accessibility checks:

```bash
npm run test:a11y
```

Authenticated checks use a non-production test account. Supply credentials through
the process environment; never commit them. The setup authenticates once and reuses
an ignored browser state so it does not trip login rate limiting:

```bash
E2E_USERNAME=admin E2E_PASSWORD=admin npm run test:browsers
```

Use `PLAYWRIGHT_BASE_URL` to test an already running deployment. Without it,
Playwright starts the local development server automatically.

Automated checks validate accessibility semantics but do not replace a short manual
release check with NVDA plus Edge on Windows and VoiceOver plus Safari on Apple devices.
