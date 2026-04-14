# Agent Workflow: CSV Processing Scripts

## Goal

Produce two output files from raw Divvy trip CSV data:
1. `public/data/stations.json` — static station list for the frontend
2. `database/divvy.db` — SQLite database with aggregated flows

---

## Input Data

Download all 12 monthly CSV files for 2026 from the Divvy public data bucket:  
`https://divvy-tripdata.s3.amazonaws.com/index.html`

Files follow the pattern `202601-divvy-tripdata.zip` through `202612-divvy-tripdata.zip`.  
Unzip all into a folder: `divvyTripData/` at the project root.

### CSV Column Schema

```
ride_id           - unique ride identifier
rideable_type     - classic_bike | electric_bike | electric_scooter
started_at        - start timestamp, format: "YYYY-MM-DD HH:MM:SS.mmm"
ended_at          - end timestamp
start_station_name - name of starting station (may be empty for racks)
start_station_id  - official station ID (may be empty for public racks)
end_station_name  - name of destination station
end_station_id    - official station ID (may be empty)
start_lat         - starting latitude
start_lng         - starting longitude
end_lat           - ending latitude
end_lng           - ending longitude
member_casual     - "member" or "casual"
```

---

## Script 1: `scripts/process-stations.js`

### Purpose
Generate `public/data/stations.json` — the static file the React app loads at startup.

### Logic

```
for each CSV file in divvyTripData/:
  parse rows with csv-parse
  for each row:
    extract start station: name, id, lat, lng
    extract end station: name, id, lat, lng
    
    for each station endpoint:
      if station_id is empty:
        assign synthetic id = "LOC_" + lat + "_" + lng  (round to 5 decimals)
      else:
        use station_id as-is
      
      deduplicate by station name (nameToId map):
        if name already seen → use existing id
        else → register new station
      
      increment count for start stations only

write public/data/stations.json as JSON array:
[
  { "id": "KA1503000072", "name": "Wacker Dr & Washington St", "lat": 41.883, "lng": -87.637, "count": 4521 },
  ...
]
```

### Key Implementation Notes
- Use `csv-parse` in streaming/callback mode to handle large files without loading all into memory
- Use a `Map<string, string>` (nameToId) to deduplicate stations by name — the same physical station may appear in multiple months with the same name but the lat/lng may drift slightly
- For public racks, truncate lat/lng to 5 decimal places for ID generation to reduce duplicates from GPS jitter
- `count` reflects only start-station rides (not destination rides)
- Sort output by count descending so high-traffic stations sort first

### Output Format
```json
[
  {
    "id": "TA1307000039",
    "name": "Streeter Dr & Grand Ave",
    "lat": 41.892278,
    "lng": -87.612043,
    "count": 42817
  }
]
```

---

## Script 2: `scripts/import-db.js`

### Purpose
Build `database/divvy.db` with aggregated flow data for the API.

### Database Schema

```sql
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
```

### Logic

```
initialize 3 in-memory Maps:
  stations: id → { name, lat, lng }
  flows:    "startId|endId|month" → count
  nameToId: name → id

for each CSV file in divvyTripData/:
  parse rows with csv-parse
  for each row:
    extract month from started_at (characters 5-6)
    
    resolve start station:
      if start_station_id empty → id = "LOC_" + roundedLat + "_" + roundedLng
      else use start_station_id
      deduplicate via nameToId (same as process-stations.js)
      register in stations map if new
    
    resolve end station (same logic)
    
    flowKey = startId + "|" + endId + "|" + month
    flows[flowKey] = (flows[flowKey] || 0) + 1

open database/divvy.db (create if not exists)
run all inserts inside a single transaction:
  INSERT OR IGNORE INTO stations for each entry
  INSERT OR REPLACE INTO flows for each aggregated flow

close database
```

### Key Implementation Notes
- Do all aggregation **in memory before any DB writes** — much faster than incrementing DB counts row by row
- Use a **single `BEGIN`/`COMMIT` transaction** for all inserts — orders of magnitude faster than auto-commit
- Use prepared statements (`db.prepare(sql)`) for the insert loops
- Print progress every 100k rows so you can see it running
- The full 2026 dataset will be ~6–8 million rows across all 12 files; expect the script to run for several minutes
- After the script completes, verify with:
  ```bash
  sqlite3 database/divvy.db "SELECT COUNT(*) FROM flows;"
  sqlite3 database/divvy.db "SELECT COUNT(*) FROM stations;"
  ```

### Expected Output Scale (based on 2025 data)
- ~6,400 stations
- ~1–2 million unique flow rows (start × end × month combinations)
- Database file: ~80–120 MB

---

## Running the Scripts

```bash
# 1. Ensure CSV files are in place
ls divvyTripData/*.csv

# 2. Generate stations JSON
node scripts/process-stations.js

# 3. Build the SQLite database (takes several minutes)
node scripts/import-db.js

# 4. Verify outputs
wc -l public/data/stations.json
sqlite3 database/divvy.db "SELECT COUNT(*) FROM flows;"
```

---

## Error Handling

- Skip rows where both `start_lat`/`start_lng` AND `start_station_name` are empty (incomplete data)
- Skip rows where `started_at` cannot be parsed for a month
- Log a warning for skipped rows but continue processing
- If a station appears in flows but not in the stations map (data inconsistency), skip that flow row
