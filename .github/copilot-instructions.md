# AI Story Studio - Copilot Instructions

## Architecture Overview
This is a **dual-mode AI video generation platform** consisting of:
- **Frontend**: Single-file HTML application (`ai-story-studio-combined.html`) with Tailwind CSS and vanilla JavaScript
- **Backend**: Express.js server (`server.js`) integrating Gemini 2.5 Pro API and Google Cloud Vertex AI (Veo 3 model)
- **Demo Mode**: Built-in fallback system when APIs are unavailable or in demo configuration

## Key Components & Data Flow
```
Frontend → Backend API → [Gemini API + Vertex AI] → Video Generation
     ↓           ↓                    ↓
  UI Logic   Demo Mode         Real AI Services
```

### Critical Integration Points
- **Gemini API**: Text generation for video plans and creative content
- **Vertex AI**: Video generation using Veo 3 model (`veo-3-0-generate-preview`)
- **Dual Endpoints**: `/generate-video-plan` (start) and `/check-job-status/:jobId` (polling)

## Demo Mode System
The application automatically detects and handles demo mode when:
- `GEMINI_API_KEY="demo-mode"` or missing/placeholder values
- `GCP_PROJECT_ID="demo-project"` or missing/placeholder values

**Demo behaviors**:
- Returns structured fake responses with realistic timing
- Simulates video job lifecycle (rendering → completed after 10 seconds)
- Generates professional-looking video plans without API calls

## Environment Configuration Patterns
The `.env` file follows this structure:
```bash
GEMINI_API_KEY="demo-mode"        # "demo-mode" triggers demo responses
GCP_PROJECT_ID="demo-project"     # "demo-project" triggers demo mode
GCP_LOCATION="us-central1"        # Default region for Vertex AI
PORT=3000                         # Server port
```

## Development Workflows

### Local Development
```bash
# Start server (handles both demo and production modes)
node server.js
# OR using full path if npm not in PATH
/path/to/node server.js
```

### API Testing
```bash
# Test video plan generation
curl -X POST http://localhost:3000/generate-video-plan \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A robot in a garden", "duration": "15"}'

# Check job status
curl http://localhost:3000/check-job-status/demo-job-123456789
```

## Frontend Architecture Patterns
- **Single-file application**: All HTML, CSS, and JavaScript in `ai-story-studio-combined.html`
- **Backend communication**: Uses `fetch()` with `BACKEND_URL = 'http://localhost:3000'`
- **Job polling**: Implements polling pattern for video generation status
- **Error handling**: Graceful degradation with user-friendly error messages

## Project-Specific Conventions
1. **Dual-mode design**: Every API integration must handle both demo and production modes
2. **Job-based async processing**: Video generation uses job IDs with polling for completion
3. **Structured responses**: All API responses include both creative plans (for users) and job tracking
4. **CSP compliance**: Strict Content Security Policy with specific allowed domains

## Common Issues & Solutions
- **npm not found**: Use full Node.js path `/Users/username/local/node/bin/node`
- **Corrupted .env**: File tends to accumulate duplicates - clean regularly to essential variables only
- **API errors**: Application gracefully falls back to demo mode on 403/auth errors

## File Dependencies
- `server.js` → `.env` (environment variables)
- `ai-story-studio-combined.html` → `server.js` (backend API)
- `package.json` → Node.js dependencies (`@google-cloud/vertexai`, `express`, `axios`, `cors`, `dotenv`)

## Testing Strategy
- **Demo mode**: Test full user flows without external API dependencies
- **API integration**: Verify real Gemini/Vertex AI calls with valid credentials
- **Error scenarios**: Test API failures, invalid inputs, and network issues
