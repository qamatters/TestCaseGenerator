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
./mvnw spring-boot:run
```

## External Config
Set `APP_EXTERNAL_CONFIG` to point at a JSON file outside this repository.
See `external-config/sample-config.json`.
