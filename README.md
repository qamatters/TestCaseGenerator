# TestCaseGenerator

A full-stack QA-focused test case generation platform built with **React** (frontend) and **Spring Boot** (backend).

## Highlights
- Jira story fetch + editable story details
- Prompt strategies (default, advanced, custom)
- AI provider/model selection (ChatGPT, Gemini, extensible)
- Optional multi-model refinement pipeline
- Zephyr-compatible test case table with in-place editing
- AI story quality review for QA completeness
- Publish selected / bulk publish workflows
- Fully mocked backend APIs for end-to-end demo

## Project Structure
- `frontend/` React + TypeScript + Vite UI
- `backend/` Spring Boot REST API layer
- `external-config/` sample location for runtime API config (outside apps)

## Run
### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
mvn spring-boot:run
```

## Mock Demo Data (working now)
### Story IDs
- `QA-101` : cart flow story
- `PROJ-1` : deactivate user story
- `SEC-12` : OTP reset story
- Any custom ID also works (generic mock response)

### Mock Projects
- `QAT - QA Transformation`
- `PROJ - Customer Portal`
- `SEC - Security Hardening`

### Mock Folders
- `QAT` → `Regression/UI`, `Regression/API`, `Smoke/Web`
- `PROJ` → `Sprint-24/Auth`, `Sprint-24/Profile`, `Release-3/Checkout`
- `SEC` → `OWASP/Injection`, `OWASP/Auth`, `Performance/Load`

### Mock APIs implemented
- `GET /api/jira/{storyId}`
- `GET /api/projects`
- `GET /api/projects/{projectKey}/folders`
- `POST /api/ai/review`
- `POST /api/ai/generate`
- `POST /api/publish/selected`
- `POST /api/publish/bulk`

## External Config
Set `APP_EXTERNAL_CONFIG` to point at a JSON file outside this repository.
See `external-config/sample-config.json`.
