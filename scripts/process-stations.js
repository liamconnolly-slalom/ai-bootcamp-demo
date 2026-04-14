/**
 * process-stations.js
 *
 * Reads all Divvy trip CSV files from divvyTripData/, deduplicates stations
 * by name, and writes public/data/stations.json sorted by ride count descending.
 *
 * Station ID assignment:
 *   - If start_station_id / end_station_id is present → use as-is
 *   - Otherwise → "LOC_<lat5>_<lng5>" (lat/lng truncated to 5 decimal places)
 *
 * Usage:
 *   node scripts/process-stations.js
 */

import { createReadStream, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'divvyTripData');
const OUT_DIR  = join(__dirname, '..', 'public', 'data');
const OUT_FILE = join(OUT_DIR, 'stations.json');

// ── helpers ──────────────────────────────────────────────────────────────────

/** Truncate a float to 5 decimal places (string-safe). */
function round5(value) {
  return Math.round(parseFloat(value) * 1e5) / 1e5;
}

/**
 * Resolve a canonical station ID.
 * If the official id field is non-empty, use it.
 * Otherwise synthesise "LOC_<lat5>_<lng5>".
 */
function resolveId(stationId, lat, lng) {
  const sid = (stationId || '').trim();
  if (sid) return sid;
  const la = round5(lat);
  const lo = round5(lng);
  if (isNaN(la) || isNaN(lo)) return null;
  return `LOC_${la}_${lo}`;
}

// ── state ────────────────────────────────────────────────────────────────────

/** id → { id, name, lat, lng, count } */
const stationsById = new Map();

/**
 * Primary dedup key: canonical station name (trimmed, lower-cased).
 * Maps to the first station id we assigned for that name.
 */
const nameToId = new Map();

let totalRows = 0;
let skippedRows = 0;

// ── per-row processing ───────────────────────────────────────────────────────

function processStation(id, name, lat, lng, isStart) {
  const trimmedName = (name || '').trim();

  // If the name has already been seen, use that canonical id.
  if (trimmedName && nameToId.has(trimmedName.toLowerCase())) {
    const canonId = nameToId.get(trimmedName.toLowerCase());
    if (isStart && stationsById.has(canonId)) {
      stationsById.get(canonId).count += 1;
    }
    return canonId;
  }

  // New station.
  const resolvedId = resolveId(id, lat, lng);
  if (!resolvedId) return null;

  if (trimmedName) {
    nameToId.set(trimmedName.toLowerCase(), resolvedId);
  }

  if (!stationsById.has(resolvedId)) {
    stationsById.set(resolvedId, {
      id:    resolvedId,
      name:  trimmedName || resolvedId,
      lat:   parseFloat(lat),
      lng:   parseFloat(lng),
      count: 0,
    });
  }

  if (isStart) {
    stationsById.get(resolvedId).count += 1;
  }

  return resolvedId;
}

function processRow(row) {
  totalRows += 1;
  if (totalRows % 100_000 === 0) {
    process.stdout.write(`  processed ${totalRows.toLocaleString()} rows…\r`);
  }

  const {
    start_station_name, start_station_id, start_lat, start_lng,
    end_station_name,   end_station_id,   end_lat,   end_lng,
  } = row;

  // Skip rows with no usable start-station data.
  const hasStartName   = (start_station_name || '').trim().length > 0;
  const hasStartCoords = start_lat && start_lng &&
                         !isNaN(parseFloat(start_lat)) &&
                         !isNaN(parseFloat(start_lng));

  if (!hasStartName && !hasStartCoords) {
    skippedRows += 1;
    return;
  }

  processStation(start_station_id, start_station_name, start_lat, start_lng, true);

  // End station (not counted toward `count`).
  const hasEndName   = (end_station_name || '').trim().length > 0;
  const hasEndCoords = end_lat && end_lng &&
                       !isNaN(parseFloat(end_lat)) &&
                       !isNaN(parseFloat(end_lng));

  if (hasEndName || hasEndCoords) {
    processStation(end_station_id, end_station_name, end_lat, end_lng, false);
  }
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

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
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

  console.log(`\n\nTotal rows processed : ${totalRows.toLocaleString()}`);
  console.log(`Skipped rows         : ${skippedRows.toLocaleString()}`);
  console.log(`Unique stations found: ${stationsById.size.toLocaleString()}`);

  // Sort descending by ride count.
  const output = Array.from(stationsById.values())
    .filter(s => !isNaN(s.lat) && !isNaN(s.lng))
    .sort((a, b) => b.count - a.count);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  console.log(`\nWrote ${output.length.toLocaleString()} stations → ${OUT_FILE}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
