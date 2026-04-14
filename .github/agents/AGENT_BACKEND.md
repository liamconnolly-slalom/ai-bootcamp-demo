# Agent Workflow: Backend API

## Goal

Build an Express server (`server.js`) that:
1. Serves the pre-built React app from `dist/`
2. Exposes a single data API endpoint for station flows
3. Opens the SQLite database read-only at startup

---

## File: `server.js` (project root)

### Full Specification

```javascript
// server.js
import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'database/divvy.db');

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'dist')));

// Open database read-only at startup
const db = new sqlite3.Database(DB_FILE, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
    process.exit(1);
  }
  console.log(`Connected to database: ${DB_FILE}`);
});
```

---

## API Endpoints

### `GET /api/station/:id/flows`

Returns the top destination flows from a given starting station.

**Path parameters:**
- `:id` — station ID (e.g., `KA1503000072` or `LOC_41.88314_-87.63724`)

**Query parameters:**
- `month` (optional) — integer 1–12. If omitted, returns full-year totals.

**Response:** JSON array, sorted by `count` descending, max 5000 items.

```json
[
  {
    "end_station_id": "TA1306000029",
    "end_station_name": "McClurg Ct & Ohio St",
    "end_lat": 41.892592,
    "end_lng": -87.617289,
    "count": 312
  }
]
```

**Implementation:**

```javascript
app.get('/api/station/:id/flows', (req, res) => {
  const { id } = req.params;
  const month = req.query.month ? parseInt(req.query.month, 10) : null;

  let sql, params;

  if (month) {
    sql = `
      SELECT f.end_station_id,
             s.name  AS end_station_name,
             s.lat   AS end_lat,
             s.lng   AS end_lng,
             f.count
      FROM flows f
      JOIN stations s ON s.id = f.end_station_id
      WHERE f.start_station_id = ?
        AND f.month = ?
      ORDER BY f.count DESC
      LIMIT 5000
    `;
    params = [id, month];
  } else {
    sql = `
      SELECT f.end_station_id,
             s.name       AS end_station_name,
             s.lat        AS end_lat,
             s.lng        AS end_lng,
             SUM(f.count) AS count
      FROM flows f
      JOIN stations s ON s.id = f.end_station_id
      WHERE f.start_station_id = ?
      GROUP BY f.end_station_id
      ORDER BY count DESC
      LIMIT 5000
    `;
    params = [id];
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});
```

---

### `GET /*` — SPA Catch-All

Serve `dist/index.html` for any path not matched by the API or static middleware. This allows React Router (if used) or direct URL access to work.

```javascript
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
```

---

## Server Start

```javascript
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Port the server listens on |
| `DB_FILE` | `database/divvy.db` | Absolute or relative path to the SQLite database |

Create a `.env` file for local development:
```
PORT=3000
DB_FILE=database/divvy.db
```

---

## `package.json` Scripts

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "start": "node server.js",
    "preview": "vite preview"
  }
}
```

Note: `"type": "module"` enables ES module `import` syntax in `server.js`.

---

## Vite Dev Proxy

During development, Vite runs on port 5173 and proxies API calls to the Express server on port 3000:

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

Run both in separate terminals:
```bash
node server.js       # Terminal 1 — API
npm run dev          # Terminal 2 — Vite frontend
```

---

## Docker Considerations

In the Docker image, `dist/` is pre-built and `divvy.db` is copied in at build time. The container only needs to run `node server.js`. See `Dockerfile` for the multi-stage build.
