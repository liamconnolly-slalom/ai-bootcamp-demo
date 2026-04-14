# Divvy Wrapped — Project Overview

## What This App Does

**Divvy Wrapped** is an interactive data visualization web app that lets users explore Divvy bike-share ride patterns across Chicago for a given year. Users can click any bike station on a map of Chicago and see animated flow lines showing where riders traveled — which destinations were most popular, by month or across the full year.

The name and concept are inspired by Zack Youngren's CitiBike visualization and Spotify Wrapped's "year in review" format.

### Core User Flow
1. User opens the app — a dark map of Chicago loads with all Divvy stations as red dots
2. User searches for a station or clicks one on the map
3. Animated cyan lines radiate outward showing the top destination flows from that station
4. Line thickness and opacity encode trip volume (thicker = more rides)
5. User can filter by month (Jan–Dec) or view the full year
6. User can hide "Public Rack" stations (informal endpoints with no official station ID)
7. Hovering a flow line shows a popup with the destination name and trip count

---

## Architecture Summary

```
CSV Files (Divvy open data)
        │
        ▼
scripts/process-stations.js  ──►  public/data/stations.json  (static file, loaded at startup)
scripts/import-db.js         ──►  database/divvy.db          (SQLite, read-only at runtime)
        │
        ▼
server.js (Express)
  GET /api/station/:id/flows?month=N
        │
        ▼
React + Leaflet frontend (src/)
  Map.tsx → FlowLine.tsx + CircleMarkers
  ControlPanel.tsx → search, month filter, FAQ
```

---

## Key Design Decisions

- **Static stations file** (`public/data/stations.json`) is fetched once on load for fast initial render; no DB call needed just to show station dots.
- **Read-only SQLite** opened in `OPEN_READONLY` mode — safe for concurrent reads, no write endpoints.
- **In-memory CSV aggregation** before DB insert — scripts accumulate all data, then write in a single transaction for atomicity and performance.
- **Virtual stations** — public racks without official IDs get synthetic `LOC_lat_lng` IDs so they can still be visualized and filtered.
- **Month column in flows** — `flows` table stores `month INTEGER` enabling temporal filtering with a simple `WHERE month = ?` clause.
- **Leaflet over Google Maps** — lightweight, open-source, works well with `leaflet-polylinedecorator` for arrow heads on polylines.
- **Monorepo, single Node process** — Express serves both the API and the built React static files. No separate frontend hosting needed.

---

## Deployment

- **Platform:** Fly.io (`ord` region — Chicago)
- **Container:** Multi-stage Docker build; Node 20 Alpine
- **CI/CD:** GitHub Actions auto-deploys on push to `main`
- **VM:** 1 CPU, 1 GB RAM
- **Database:** SQLite file bundled inside the Docker image (~80 MB)

---

## Data Source

Divvy publishes monthly trip data as CSV files at:  
`https://divvy-tripdata.s3.amazonaws.com/index.html`

Files follow the naming pattern `YYYYMM-divvy-tripdata.zip`. For a full year, download all 12 monthly files, unzip into a `divvyTripData/` folder, then run the two processing scripts.

### CSV Schema
```
ride_id, rideable_type, started_at, ended_at,
start_station_name, start_station_id,
end_station_name, end_station_id,
start_lat, start_lng, end_lat, end_lng,
member_casual
```
