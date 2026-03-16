# Security Checklist

- Keep `.env` out of version control
- Use least-privilege GCP service accounts for Vertex AI
- Enable logging and monitoring (Stackdriver / Cloud Monitoring)
- Scan dependencies and run `npm audit` regularly
- Use secret management for API keys in CI/CD
