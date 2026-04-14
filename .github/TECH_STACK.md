# Tech Stack & Dependencies

## Runtime & Framework

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend runtime | Node.js | 20 (Alpine in Docker) |
| Frontend framework | React | ^19.2.0 |
| Language | TypeScript | ^5.9.3 |
| Backend framework | Express | ^5.2.1 |
| Frontend bundler | Vite | ^7.2.4 |
| Database | SQLite3 | (file-based, ~80 MB) |
| Maps | Leaflet | ^1.9.4 |
| React-Leaflet wrapper | react-leaflet | ^5.0.0 |

---

## Production Dependencies (`package.json`)

```json
{
  "@libsql/client": "^0.17.0",
  "@types/leaflet": "^1.9.21",
  "cors": "^2.8.5",
  "csv-parse": "^6.1.0",
  "dotenv": "^17.2.3",
  "express": "^5.2.1",
  "leaflet": "^1.9.4",
  "leaflet-polylinedecorator": "^1.6.0",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "react-leaflet": "^5.0.0",
  "sqlite3": "^5.1.7"
}
```

### Notable packages

| Package | Purpose |
|---------|---------|
| `sqlite3` | SQLite driver for the Express backend |
| `@libsql/client` | LibSQL client (kept in dependencies, potential future use) |
| `csv-parse` | Stream/callback CSV parser used in data import scripts |
| `cors` | Allows cross-origin requests from the Vite dev server |
| `dotenv` | Loads `.env` for `PORT` and any future env vars |
| `leaflet-polylinedecorator` | Draws arrow heads on polylines (flow direction) |

---

## Dev Dependencies

```json
{
  "@eslint/js": "^9.30.1",
  "@types/react": "^19.1.8",
  "@types/react-dom": "^19.1.6",
  "@vitejs/plugin-react": "^4.6.0",
  "eslint": "^9.30.1",
  "eslint-plugin-react-hooks": "^5.2.0",
  "eslint-plugin-react-refresh": "^0.4.20",
  "globals": "^16.3.0",
  "typescript": "^5.9.3",
  "typescript-eslint": "^8.35.1",
  "vite": "^7.2.4"
}
```

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Express server port |
| `DB_FILE` | `database/divvy.db` | Path to SQLite database |

---

## Scripts (`package.json`)

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "start": "node server.js"
}
```

- `npm run dev` — Vite dev server on port 5173, proxies `/api/*` to `localhost:3000`
- `npm run build` — TypeScript check + Vite bundle → `dist/`
- `npm start` — Production: Express serves `dist/` + API on port 3000

---

## Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
```

---

## TypeScript Configuration

- `tsconfig.json` — root, references both configs below
- `tsconfig.app.json` — frontend: targets `ES2020`, JSX react-jsx, strict mode
- `tsconfig.node.json` — Node tools (Vite config): targets `ES2022`

---

## Tile Layer

The map uses CARTO's dark-matter tile set (OpenStreetMap data):
```
https://{s}.basemaps.cartocdn.com/dark_matter_all/{z}/{x}/{y}{r}.png
```
Attribution: © OpenStreetMap contributors, © CARTO

---

## Map Center & Defaults

```typescript
const CHICAGO_CENTER: LatLngExpression = [41.8781, -87.6298];
const DEFAULT_ZOOM = 12;
```
