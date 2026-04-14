# Functional Requirements

This document describes what the rebuilt app (Divvy Wrapped 2026) must do.

---

## Must-Have Features

### Map
- [ ] Display a full-screen dark-themed map of Chicago using Leaflet + CARTO dark-matter tiles
- [ ] Render all Divvy stations as small red circle markers (`#ff4c4c`)
- [ ] On station click, fetch and display flow lines from that station to its top destinations
- [ ] Flow lines are cyan (`#00ccff`) polylines with an arrow head at the destination end
- [ ] Line thickness and opacity scale with trip count (thicker/brighter = more rides)
- [ ] Map flies/animates to the selected station (1.5 second animation)
- [ ] Clicking the map background deselects the active station and clears flow lines
- [ ] Hovering a flow line highlights it (thicker, more opaque) and shows a popup with destination name + count
- [ ] Clicking a flow line also shows the same popup

### Control Panel
- [ ] Fixed panel (right side on desktop, centered on mobile) with dark background
- [ ] Title: "Divvy 2026 Year in Review" (update year for each release)
- [ ] Station search input: type >2 characters → filter stations by name, show top 5 matches
- [ ] Click a search result → zoom to that station and select it
- [ ] Month dropdown: options for "All Year" plus each month (January–December)
- [ ] Changing the month re-fetches flows for the active station with the new filter
- [ ] "Hide Public Racks" checkbox — hides stations whose name contains "Public Rack" or "Corral"
- [ ] Collapsible FAQ section at the bottom of the panel

### FAQ Content
- [ ] Explain what the visualization shows
- [ ] Credit the data source (Divvy / Lyft) with a link
- [ ] Credit the original inspiration (Zack Youngren's CitiBike visualization)
- [ ] Note the year of data

### Mobile Warning
- [ ] Show a red warning banner at top on screens narrower than 768px
- [ ] Message: "This app is best experienced on a larger screen"
- [ ] Banner should be dismissible (or persistent — match original behavior)

---

## Data Requirements

- [ ] All 12 months of 2026 Divvy trip data processed into SQLite
- [ ] `stations` table with id, name, lat, lng
- [ ] `flows` table with start_station_id, end_station_id, month, count
- [ ] `public/data/stations.json` generated from the same CSVs
- [ ] Stations JSON includes a `count` field (total rides starting from that station)
- [ ] Public racks (no station ID in CSV) assigned synthetic `LOC_lat_lng` IDs

---

## API Requirements

- [ ] `GET /api/station/:id/flows` — returns up to 5000 destination flows sorted by count desc
- [ ] Supports optional `?month=N` query param (1–12); omit for full-year totals
- [ ] Response shape per flow:
  ```json
  {
    "end_station_id": "string",
    "end_station_name": "string",
    "end_lat": 41.xxx,
    "end_lng": -87.xxx,
    "count": 1234
  }
  ```
- [ ] `GET /*` — catch-all serves the built React app (`dist/index.html`)

---

## Non-Functional Requirements

- [ ] First paint fast: stations loaded from a static JSON file (no API call on load)
- [ ] Database opened read-only at server startup
- [ ] Docker image bundles the pre-built database
- [ ] App works in Chrome, Firefox, Safari (latest versions)
- [ ] No authentication required — fully public

---

## Out of Scope

- User accounts or saved preferences
- Write endpoints or real-time data
- Mobile-optimized map interactions (warning is sufficient)
- Historical comparison across years in a single view
