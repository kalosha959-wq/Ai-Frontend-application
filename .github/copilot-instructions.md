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

## Deployment Patterns

### Production Environment Setup
```bash
# Set production environment variables
GEMINI_API_KEY="AIzaSyD_your_actual_key"
GCP_PROJECT_ID="your-production-project"
GCP_LOCATION="us-central1"
PORT=3000
NODE_ENV=production
```

### Static File Serving
- Frontend is a **single HTML file** - can be served statically
- Backend serves API endpoints only - no static file serving needed
- Consider CDN for `ai-story-studio-combined.html` in production

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Serve the frontend
    location / {
        root /var/www/ai-story-studio;
        try_files $uri $uri/ /ai-story-studio-combined.html;
        
        # Cache static assets
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
    
    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Apache Configuration
```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    DocumentRoot /var/www/ai-story-studio
    
    # Serve frontend
    <Directory "/var/www/ai-story-studio">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Cache headers
        ExpiresActive On
        ExpiresByType text/html "access plus 1 day"
    </Directory>
    
    # Proxy API requests
    ProxyPreserveHost On
    ProxyPass /api/ http://localhost:3000/
    ProxyPassReverse /api/ http://localhost:3000/
</VirtualHost>
```

#### Local Development Serving
```bash
# Simple Python server for frontend testing
python3 -m http.server 8080
# OR
npx serve ai-story-studio-combined.html
```

### Google Cloud Prerequisites
- **Vertex AI API** must be enabled in GCP project
- **Service account** with Vertex AI permissions required
- **Gemini API** key from Google AI Studio (separate from GCP)

## CI/CD Considerations

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy AI Story Studio
on:
  push:
    branches: [main, ai-story-studio-backend]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - name: Test Demo Mode
        run: |
          GEMINI_API_KEY="demo-mode" GCP_PROJECT_ID="demo-project" npm start &
          sleep 5
          curl -f http://localhost:3000/generate-video-plan \
            -H "Content-Type: application/json" \
            -d '{"prompt": "CI test", "duration": "5"}' || exit 1

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Production
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
        run: |
          # Deployment commands here
```

### Docker Containerization
```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY server.js ./
COPY ai-story-studio-combined.html ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/generate-video-plan \
    -H "Content-Type: application/json" \
    -d '{"prompt": "health", "duration": "5"}' || exit 1

EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  ai-story-studio:
    build: .
    ports:
      - "3000:3000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GCP_PROJECT_ID=${GCP_PROJECT_ID}
      - GCP_LOCATION=${GCP_LOCATION}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/generate-video-plan"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Environment Variable Management
```bash
# Production secrets (set in CI/CD platform)
GEMINI_API_KEY="AIzaSyD_production_key"
GCP_PROJECT_ID="production-project-id"
GCP_LOCATION="us-central1"

# Staging environment
GEMINI_API_KEY="AIzaSyD_staging_key"
GCP_PROJECT_ID="staging-project-id"
GCP_LOCATION="us-central1"

# Development/Testing (safe defaults)
GEMINI_API_KEY="demo-mode"
GCP_PROJECT_ID="demo-project"
GCP_LOCATION="us-central1"
```

### Blue-Green Deployment Strategy
```bash
# Blue-green deployment script
#!/bin/bash
NEW_VERSION=$1
HEALTH_CHECK_URL="http://localhost:3001/generate-video-plan"

# Start new version on alternate port
PORT=3001 docker-compose up -d --scale ai-story-studio=1

# Wait for health check
until curl -f $HEALTH_CHECK_URL \
  -H "Content-Type: application/json" \
  -d '{"prompt": "deploy test", "duration": "5"}'; do
  sleep 2
done

# Switch traffic (update load balancer/proxy)
# Stop old version
docker-compose down
PORT=3000 docker-compose up -d
```

### Deployment Steps
1. **Environment validation**: Ensure API keys are set (not demo values)
2. **Dependency installation**: `npm ci` for production builds
3. **Health checks**: Test `/generate-video-plan` endpoint after deployment
4. **Rollback strategy**: Keep previous version available if API calls fail

### Automated Testing Integration
```javascript
// test/demo-mode.test.js
const request = require('supertest');
const app = require('../server');

describe('Demo Mode', () => {
  beforeAll(() => {
    process.env.GEMINI_API_KEY = 'demo-mode';
    process.env.GCP_PROJECT_ID = 'demo-project';
  });

  test('generates video plan in demo mode', async () => {
    const response = await request(app)
      .post('/generate-video-plan')
      .send({ prompt: 'test robot', duration: '10' })
      .expect(200);
    
    expect(response.body.plan).toContain('Demo Video Plan');
    expect(response.body.jobId).toMatch(/^demo-job-/);
  });

  test('simulates job completion', async () => {
    const jobId = `demo-job-${Date.now() - 15000}`; // 15 seconds ago
    const response = await request(app)
      .get(`/check-job-status/${jobId}`)
      .expect(200);
    
    expect(response.body.status).toBe('completed');
  });
});
```

### Security Patterns
- **Never commit .env**: File contains sensitive API keys
- **Environment-specific configs**: Use different GCP projects for staging/production
- **CSP headers**: Already configured in HTML meta tags for security
- **CORS configuration**: Currently allows all origins - restrict in production

### Monitoring & Alerts
```bash
# Health check endpoint pattern
curl -f http://localhost:3000/generate-video-plan \
  -H "Content-Type: application/json" \
  -d '{"prompt": "health check", "duration": "5"}' || exit 1
```

## Development vs Production Modes
- **Development**: Use demo mode for rapid iteration without API costs
- **Staging**: Test with real APIs but separate GCP project
- **Production**: Full API integration with monitoring and error handling

{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Server (server.js)",
      "program": "${workspaceFolder}/server.js",
      "envFile": "${workspaceFolder}/.env",
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "runtimeExecutable": "node"
    }
  ]
}
