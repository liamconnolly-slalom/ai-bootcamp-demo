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

// GET /api/station/:id/flows
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

// SPA catch-all — must be last
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
