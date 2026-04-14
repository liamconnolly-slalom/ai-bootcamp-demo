# GitHub Copilot Instructions

## Project Identity

This is **Divvy Wrapped 2026** — an interactive bike-share flow visualization for Chicago. Users click a Divvy station on a dark-themed Leaflet map and see animated flow lines to the station's top destinations, filterable by month.

---

## Tech Stack (must not change)

- **React 19 + TypeScript** for the frontend
- **Vite** as the bundler
- **Leaflet + react-leaflet** for the map (NOT Google Maps, NOT Mapbox)
- **leaflet-polylinedecorator** for arrow heads on polylines
- **Express 5** for the backend API
- **SQLite3** (file-based) for the database
- **csv-parse** for CSV processing scripts
- **Node.js 20** runtime

---

## Code Style

- Use **TypeScript** everywhere — no plain `.js` in `src/`
- Use **functional components** with hooks only — no class components
- Use **ES module `import`** syntax — no `require()`
- Keep component files focused: one primary export per file
- Use `interface` for prop/data types
- No `any` types — define proper interfaces
- Prefer `const` over `let`; never use `var`
- No unnecessary `console.log` left in production code

---

## Architecture Rules

1. **Static stations file** — `public/data/stations.json` is fetched once on app load. Do not add an API endpoint for stations list.

2. **Read-only database** — open with `sqlite3.OPEN_READONLY`. There are no write endpoints. Do not add mutations.

3. **No state management library** — use React `useState` and `useEffect` only. No Redux, Zustand, Jotai, etc.

4. **No CSS framework** — use inline styles or plain CSS. No Tailwind, no styled-components, no CSS modules.

5. **Single Express process** — Express serves both `/api/*` routes and the `dist/` static files. No separate frontend hosting.

6. **No routing library** — this is a single-page app with no URL-based routing. No React Router.

7. **Imperative Leaflet** — `leaflet-polylinedecorator` must be managed imperatively with `useEffect`/`useMap()`. Do not try to wrap it in JSX.

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| React components | PascalCase | `ControlPanel`, `FlowLine` |
| Component files | PascalCase.tsx | `Map.tsx`, `FlowLine.tsx` |
| Hooks | camelCase with `use` prefix | `useMap`, `useEffect` |
| State variables | camelCase | `activeStation`, `selectedMonth` |
| API routes | kebab-case | `/api/station/:id/flows` |
| DB columns | snake_case | `start_station_id`, `end_lat` |
| Script files | kebab-case | `import-db.js`, `process-stations.js` |

---

## Data Shapes

### Station (from `public/data/stations.json`)
```typescript
interface Station {
  id: string;       // e.g. "KA1503000072" or "LOC_41.88314_-87.63724"
  name: string;     // e.g. "Wacker Dr & Washington St"
  lat: number;
  lng: number;
  count: number;    // total rides starting from this station (full year)
}
```

### Flow (from `/api/station/:id/flows`)
```typescript
interface Flow {
  end_station_id: string;
  end_station_name: string;
  end_lat: number;
  end_lng: number;
  count: number;
}
```

---

## Color Palette

| Element | Color |
|---------|-------|
| Map background | Black / CARTO dark-matter tiles |
| Default station markers | `#ff4c4c` (red) |
| Active/selected station | `#00ccff` (cyan) |
| Flow lines | `#00ccff` (cyan) |
| Panel background | `rgba(0, 0, 0, 0.85)` |
| Panel text | `#ffffff` |
| Panel muted text | `#aaaaaa` |
| Panel border | `#333333` |
| Panel inputs | `#1a1a1a` background |
| Mobile warning | `#cc0000` background |

---

## Year Token

All user-visible text should use **2026** as the year. The app title is "Divvy 2026 Year in Review". Update this token when rebuilding for future years.

---

## Performance Guidelines

- Flow API returns max **5000** rows — do not increase this limit
- Station markers are rendered as `CircleMarker` (not full `Marker`) for performance with 6000+ points
- CSV import scripts aggregate in memory before writing to DB — do not stream individual inserts
- Use a single SQL transaction for all DB inserts in `import-db.js`

---

## What NOT to Generate

- Do not add authentication or user accounts
- Do not add a backend for writing data
- Do not add real-time features or WebSockets
- Do not add a test suite unless explicitly asked
- Do not add a linter config (use the existing `eslint.config.js`)
- Do not add `console.log` debug statements
- Do not add loading spinners unless explicitly asked (app loads fast enough)
- Do not use `any` TypeScript type
- Do not add a README (there is already one)

---

## File Generation Order (for a fresh build)

1. `database/schema.sql` — define tables
2. `scripts/import-db.js` — CSV → SQLite
3. `scripts/process-stations.js` — CSV → stations.json
4. `server.js` — Express API
5. `src/types/leaflet-polylinedecorator.d.ts` — TS declarations
6. `src/index.css` — global styles
7. `src/components/MobileWarning.tsx`
8. `src/components/FlowLine.tsx`
9. `src/components/ControlPanel.tsx`
10. `src/components/Map.tsx`
11. `src/App.tsx`
12. `src/main.tsx`
13. `index.html`
14. `vite.config.ts`
15. `tsconfig*.json` files
16. `Dockerfile`
17. `fly.toml`
