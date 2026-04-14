-- database/schema.sql

CREATE TABLE IF NOT EXISTS stations (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lat  REAL NOT NULL,
    lng  REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS flows (
    start_station_id TEXT    NOT NULL,
    end_station_id   TEXT    NOT NULL,
    month            INTEGER NOT NULL,  -- 1 (January) through 12 (December)
    count            INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (start_station_id, end_station_id, month),
    FOREIGN KEY (start_station_id) REFERENCES stations(id),
    FOREIGN KEY (end_station_id)   REFERENCES stations(id)
);

-- Fast lookup by starting station (primary access pattern)
CREATE INDEX IF NOT EXISTS idx_flows_start ON flows(start_station_id);
