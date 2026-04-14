/**
 * import-db.js
 *
 * Reads all Divvy trip CSV files from divvyTripData/, aggregates station and
 * flow data entirely in memory, then writes everything to database/divvy.db
 * in a single SQLite transaction.
 *
 * Schema (matches database/schema.sql):
 *   stations(id, name, lat, lng)
 *   flows(start_station_id, end_station_id, month, count)
 *
 * Usage:
 *   node scripts/import-db.js
 *
 * Verification after run:
 *   sqlite3 database/divvy.db "SELECT COUNT(*) FROM stations;"
 *   sqlite3 database/divvy.db "SELECT COUNT(*) FROM flows;"
 */

import { createReadStream, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse';
import sqlite3pkg from 'sqlite3';

const sqlite3 = sqlite3pkg.verbose();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'divvyTripData');
const DB_DIR   = join(__dirname, '..', 'database');
const DB_FILE  = join(DB_DIR, 'divvy.db');

// ── helpers ──────────────────────────────────────────────────────────────────

function round5(value) {
  return Math.round(parseFloat(value) * 1e5) / 1e5;
}

function resolveId(stationId, lat, lng) {
  const sid = (stationId || '').trim();
  if (sid) return sid;
  const la = round5(lat);
  const lo = round5(lng);
  if (isNaN(la) || isNaN(lo)) return null;
  return `LOC_${la}_${lo}`;
}

function parseMonth(startedAt) {
  // startedAt format: "YYYY-MM-DD HH:MM:SS.mmm" or "YYYY-MM-DD HH:MM:SS"
  if (!startedAt || startedAt.length < 7) return null;
  const month = parseInt(startedAt.slice(5, 7), 10);
  if (isNaN(month) || month < 1 || month > 12) return null;
  return month;
}

// ── in-memory aggregation state ───────────────────────────────────────────────

/** id → { id, name, lat, lng } */
const stationsMap = new Map();

/** name (lower) → canonical id */
const nameToId = new Map();

/**
 * Flow aggregation key: "<startId>|<endId>|<month>"
 * value: count (integer)
 */
const flowsMap = new Map();

let totalRows  = 0;
let skippedRows = 0;

// ── station resolution ───────────────────────────────────────────────────────

function resolveStation(stationId, name, lat, lng) {
  const trimmedName = (name || '').trim();
  const nameKey     = trimmedName.toLowerCase();

  // Dedup by name first.
  if (trimmedName && nameToId.has(nameKey)) {
    return nameToId.get(nameKey);
  }

  const resolvedId = resolveId(stationId, lat, lng);
  if (!resolvedId) return null;

  // Register name → id mapping.
  if (trimmedName) {
    nameToId.set(nameKey, resolvedId);
  }

  // Register station data (first occurrence wins for lat/lng).
  if (!stationsMap.has(resolvedId)) {
    stationsMap.set(resolvedId, {
      id:   resolvedId,
      name: trimmedName || resolvedId,
      lat:  parseFloat(lat),
      lng:  parseFloat(lng),
    });
  }

  return resolvedId;
}

// ── per-row processing ───────────────────────────────────────────────────────

function processRow(row) {
  totalRows += 1;
  if (totalRows % 100_000 === 0) {
    process.stdout.write(`  processed ${totalRows.toLocaleString()} rows…\r`);
  }

  const {
    started_at,
    start_station_name, start_station_id, start_lat, start_lng,
    end_station_name,   end_station_id,   end_lat,   end_lng,
  } = row;

  // Parse month.
  const month = parseMonth(started_at);
  if (month === null) {
    skippedRows += 1;
    return;
  }

  // Validate start station has at least a name or coordinates.
  const hasStartName   = (start_station_name || '').trim().length > 0;
  const hasStartCoords = start_lat && start_lng &&
                         !isNaN(parseFloat(start_lat)) &&
                         !isNaN(parseFloat(start_lng));

  if (!hasStartName && !hasStartCoords) {
    skippedRows += 1;
    return;
  }

  // Validate end station.
  const hasEndName   = (end_station_name || '').trim().length > 0;
  const hasEndCoords = end_lat && end_lng &&
                       !isNaN(parseFloat(end_lat)) &&
                       !isNaN(parseFloat(end_lng));

  if (!hasEndName && !hasEndCoords) {
    skippedRows += 1;
    return;
  }

  const startId = resolveStation(start_station_id, start_station_name, start_lat, start_lng);
  const endId   = resolveStation(end_station_id,   end_station_name,   end_lat,   end_lng);

  if (!startId || !endId) {
    skippedRows += 1;
    return;
  }

  const flowKey = `${startId}|${endId}|${month}`;
  flowsMap.set(flowKey, (flowsMap.get(flowKey) || 0) + 1);
}

// ── file parsing ─────────────────────────────────────────────────────────────

function parseFile(filePath) {
  return new Promise((resolve, reject) => {
    const parser = parse({
      columns:          true,
      skip_empty_lines: true,
      trim:             true,
      relax_column_count: true,
    });

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        processRow(record);
      }
    });

    parser.on('error', reject);
    parser.on('end', resolve);

    createReadStream(filePath).pipe(parser);
  });
}

// ── database helpers ─────────────────────────────────────────────────────────

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function dbExec(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── 1. Parse all CSV files ────────────────────────────────────────────────
  const files = readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.csv'))
    .sort();

  if (files.length === 0) {
    console.error('No CSV files found in', DATA_DIR);
    process.exit(1);
  }

  console.log(`Found ${files.length} CSV file(s) in divvyTripData/`);

  for (const file of files) {
    const filePath = join(DATA_DIR, file);
    console.log(`\nParsing ${file}…`);
    await parseFile(filePath);
  }

  console.log(`\n\nAggregation complete:`);
  console.log(`  Total rows processed : ${totalRows.toLocaleString()}`);
  console.log(`  Skipped rows         : ${skippedRows.toLocaleString()}`);
  console.log(`  Unique stations      : ${stationsMap.size.toLocaleString()}`);
  console.log(`  Unique flow records  : ${flowsMap.size.toLocaleString()}`);

  // ── 2. Open (or create) the database ─────────────────────────────────────
  mkdirSync(DB_DIR, { recursive: true });

  const db = await new Promise((resolve, reject) => {
    const instance = new sqlite3.Database(DB_FILE, err => {
      if (err) reject(err);
      else resolve(instance);
    });
  });

  console.log(`\nOpened database: ${DB_FILE}`);

  // ── 3. Create schema ──────────────────────────────────────────────────────
  await dbExec(db, `
    CREATE TABLE IF NOT EXISTS stations (
      id   TEXT PRIMARY KEY,
      name TEXT,
      lat  REAL,
      lng  REAL
    );

    CREATE TABLE IF NOT EXISTS flows (
      start_station_id TEXT,
      end_station_id   TEXT,
      month            INTEGER,
      count            INTEGER,
      PRIMARY KEY (start_station_id, end_station_id, month),
      FOREIGN KEY(start_station_id) REFERENCES stations(id),
      FOREIGN KEY(end_station_id)   REFERENCES stations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_flows_start ON flows(start_station_id);
  `);

  // ── 4. Insert everything in a single transaction ──────────────────────────
  console.log('Writing to database (single transaction)…');
  const startTime = Date.now();

  await dbRun(db, 'BEGIN');

  try {
    // Stations
    const stmtStation = db.prepare(
      'INSERT OR IGNORE INTO stations (id, name, lat, lng) VALUES (?, ?, ?, ?)'
    );

    for (const s of stationsMap.values()) {
      await new Promise((resolve, reject) => {
        stmtStation.run(s.id, s.name, s.lat, s.lng, err => {
          if (err) reject(err); else resolve();
        });
      });
    }

    await new Promise((resolve, reject) => {
      stmtStation.finalize(err => { if (err) reject(err); else resolve(); });
    });

    console.log(`  Inserted ${stationsMap.size.toLocaleString()} stations`);

    // Flows
    const stmtFlow = db.prepare(
      `INSERT OR REPLACE INTO flows
         (start_station_id, end_station_id, month, count)
       VALUES (?, ?, ?, ?)`
    );

    let flowCount = 0;
    for (const [key, count] of flowsMap) {
      const [startId, endId, month] = key.split('|');
      await new Promise((resolve, reject) => {
        stmtFlow.run(startId, endId, parseInt(month, 10), count, err => {
          if (err) reject(err); else resolve();
        });
      });
      flowCount += 1;
      if (flowCount % 100_000 === 0) {
        process.stdout.write(`  flows written: ${flowCount.toLocaleString()}…\r`);
      }
    }

    await new Promise((resolve, reject) => {
      stmtFlow.finalize(err => { if (err) reject(err); else resolve(); });
    });

    await dbRun(db, 'COMMIT');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n  Inserted ${flowCount.toLocaleString()} flow records`);
    console.log(`  Transaction committed in ${elapsed}s`);
  } catch (err) {
    await dbRun(db, 'ROLLBACK');
    throw err;
  }

  // ── 5. Close database ─────────────────────────────────────────────────────
  await new Promise((resolve, reject) => {
    db.close(err => { if (err) reject(err); else resolve(); });
  });

  console.log('\nDone. Verify with:');
  console.log(`  sqlite3 ${DB_FILE} "SELECT COUNT(*) FROM stations;"`);
  console.log(`  sqlite3 ${DB_FILE} "SELECT COUNT(*) FROM flows;"`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
