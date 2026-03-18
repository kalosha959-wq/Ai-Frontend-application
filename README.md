# AI Story Studio - Main Branch Version

AI Story Studio is a dual-mode AI video generation platform (demo + production) with a single-file frontend and an Express backend integrating Gemini and Vertex AI (Veo 3).

## Quick Start (Demo Mode)

1. Install dependencies

```bash
npm ci
```

1. Copy `.env.example` to `.env` (optional for demo)

```bash
cp .env.example .env
```

1. Start server in demo mode

```bash
GEMINI_API_KEY="demo-mode" GCP_PROJECT_ID="demo-project" npm start
```

1. Open `http://localhost:3000` in your browser

## Environment Variables

- `GEMINI_API_KEY` - set to `demo-mode` for local testing or provide your Gemini API key
- `GCP_PROJECT_ID` - set to `demo-project` for demo mode or your real GCP project id
- `GCP_LOCATION` - default `us-central1`
- `PORT` - server port

Ensure you never commit `.env` with secrets.

## Release Checklist

- [ ] Set production `GEMINI_API_KEY` and `GCP_PROJECT_ID` in CI or server environment
- [ ] Run `npm ci` and smoke-test `/generate-video-plan`
- [ ] Ensure CSP in `ai-story-studio-combined.html` allows your backend/CDN for video assets
- [ ] Tag release and push GitHub release notes (update `CHANGELOG.md`)

## CI

GitHub Actions workflows live under `.github/workflows/` and include CI, fuller validation, release, and test automation flows.

## Docker

Build and run with Docker:

```bash
docker build -t ai-story-studio .
docker run -p 3000:3000 -e GEMINI_API_KEY=demo-mode -e GCP_PROJECT_ID=demo-project ai-story-studio
```

Or use docker-compose:

```bash
docker-compose up --build
```

## Content Security Policy (CSP)

The frontend includes a CSP meta tag in `ai-story-studio-combined.html`. Before deploying to production, update it to include your backend origin and CDN domains for `connect-src`, `img-src` and `media-src`.

## Security Checklist

- Do not commit `.env` files with secrets
- Use separate GCP projects for staging and production
- Restrict CORS to trusted origins in production
- Rotate API keys regularly
- Monitor server health and enable alerting for failures

## Development Notes

- Frontend is a single HTML file `ai-story-studio-combined.html` and `project-history.js`
- Server serves the static app and provides demo-mode logic for safe local testing
- Maintained automated coverage is documented in `TESTING.md`

## Changelog

See `CHANGELOG.md` for recent changes.
