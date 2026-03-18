# Changelog

All notable changes to this project will be documented in this file.

## [1.0.2] - 2026-03-18

### Changed

- Removed tracked generated test artifacts and placeholder test files from the repository
- Untracked `.env` while keeping `.env.example` as the checked-in environment template
- Updated README and testing documentation to reflect the current repo layout and maintained test surfaces

## [1.0.1] - 2026-03-16

### Added

- Backend Gemini proxy `/call-gemini` to avoid exposing API keys to browser
- Frontend updated to call backend proxy
- Puppeteer tests run headless on CI
- CSP updated and demo mode preserved
- Added `.env.example`, `.gitignore`, and improved package scripts
