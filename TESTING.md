## Testing

This repository currently keeps three meaningful test surfaces:

- `tests/server.test.js`: focused HTTP endpoint coverage for the Express server.
- `test-buttons.js`: Puppeteer-based interactive UI smoke checks against a locally running app.
- `enhanced-test-suite.js`: HTML and API-oriented smoke coverage for local verification.

### Commands

Run the maintained Jest coverage:

```bash
npm test -- tests/server.test.js
```

Run the Puppeteer button smoke test with the app already running on `http://localhost:3000`:

```bash
node test-buttons.js
```

Run the lighter HTML and API smoke suite:

```bash
node enhanced-test-suite.js
```

### Notes

- Placeholder Jest specs were removed so CI noise stays focused on real behavior.
- `.env` should stay local only; use `.env.example` as the checked-in template.
- If Jest fails before running tests, repair dependencies first and then rerun the targeted server suite.
