# Copilot Docs — Divvy Wrapped 2026

This folder contains all documentation needed to recreate Divvy Wrapped using GitHub Copilot agent mode for 2026 data.

## Files

| File | Purpose |
|------|---------|
| `PROJECT_OVERVIEW.md` | What the app does, architecture summary, key design decisions |
| `TECH_STACK.md` | All packages, versions, scripts, environment variables |
| `REQUIREMENTS.md` | Full functional requirements checklist |
| `COPILOT_INSTRUCTIONS.md` | Copilot workspace instructions (use as `.github/copilot-instructions.md`) |
| `AGENT_CSV_PROCESSING.md` | Agent workflow: process raw CSVs into DB and stations.json |
| `AGENT_DATABASE.md` | Agent workflow: schema, queries, DB setup |
| `AGENT_BACKEND.md` | Agent workflow: Express server + API endpoints |
| `AGENT_FRONTEND.md` | Agent workflow: all React/Leaflet components |

---

## How to Use with GitHub Copilot

### Option 1: Copilot Workspace Instructions

Copy `COPILOT_INSTRUCTIONS.md` to `.github/copilot-instructions.md` in your new repo. GitHub Copilot will automatically load it as workspace context.

### Option 2: Agent Mode Prompts

Use each `AGENT_*.md` file as the prompt for a separate Copilot agent task:

1. **Start with data processing:**
   > "Follow the spec in AGENT_CSV_PROCESSING.md to generate the two processing scripts."

2. **Then the database:**
   > "Follow AGENT_DATABASE.md to create the schema.sql file."

3. **Then the backend:**
   > "Follow AGENT_BACKEND.md to build server.js."

4. **Finally the frontend:**
   > "Follow AGENT_FRONTEND.md to build all React components."

### Option 3: Requirements as Issues

Use `REQUIREMENTS.md` checkboxes as GitHub Issues for systematic task tracking.

---

## Rebuilding for 2026 Data

### Step 1 — Download 2026 CSVs
Download all 12 monthly files from the Divvy data bucket and unzip into `divvyTripData/`.

### Step 2 — Process data
```bash
node scripts/process-stations.js   # generates public/data/stations.json
node scripts/import-db.js          # generates database/divvy.db (takes ~5 min)
```

### Step 3 — Update year token
In `ControlPanel.tsx` (or wherever the title appears), change `2025` → `2026`.

### Step 4 — Build and deploy
```bash
npm run build
npm start            # test locally
fly deploy           # deploy to Fly.io
```

---

## Key Numbers (2025 baseline, expect similar for 2026)

- ~6,400 unique stations
- ~80–120 MB database
- ~1–2 million flow rows
- 12 monthly CSV files, ~6–8 million total ride records
