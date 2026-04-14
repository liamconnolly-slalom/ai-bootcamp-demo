# Agent Workflow: Frontend

## Goal

Build the React + TypeScript + Leaflet frontend. The app is a single-page application with no routing — just one full-screen interactive map with a control panel overlay.

---

## File Structure

```
src/
├── components/
│   ├── Map.tsx           ← main map + all Leaflet logic
│   ├── ControlPanel.tsx  ← search, month filter, FAQ panel
│   ├── FlowLine.tsx      ← single animated flow polyline with arrow
│   └── MobileWarning.tsx ← warning banner for small screens
├── types/
│   └── leaflet-polylinedecorator.d.ts  ← TS type declarations
├── App.tsx               ← root component, renders map + warning
├── main.tsx              ← React entry point
└── index.css             ← global styles
```

---

## Component Specifications

---

### `src/main.tsx`

Standard React 19 entry point:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

---

### `src/App.tsx`

Root component. Renders `MobileWarning` and `Map`.

```tsx
function App() {
  return (
    <>
      <MobileWarning />
      <Map />
    </>
  )
}
```

---

### `src/index.css`

Global styles:
- `body`, `html`, `#root` → `margin: 0; padding: 0; width: 100%; height: 100%; background: black;`
- `.leaflet-container` → `width: 100%; height: 100vh;`
- Font: system sans-serif or import Inter from Google Fonts
- Leaflet CSS must be imported in `main.tsx`: `import 'leaflet/dist/leaflet.css'`

---

### `src/components/MobileWarning.tsx`

Displays a fixed red banner at the top of the screen on small screens.

**Behavior:**
- Shown when `window.innerWidth < 768`
- Static (not dismissible in original; can add an X button as enhancement)

```tsx
const MobileWarning = () => {
  const [show, setShow] = useState(window.innerWidth < 768);
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#cc0000', color: 'white', padding: '10px 16px',
      textAlign: 'center', fontSize: '14px'
    }}>
      This app is best experienced on a larger screen.
    </div>
  );
};
```

---

### `src/components/Map.tsx`

The core component. Contains all Leaflet map logic and state.

#### State

```typescript
const [stations, setStations] = useState<Station[]>([]);
const [activeStation, setActiveStation] = useState<Station | null>(null);
const [flows, setFlows] = useState<Flow[]>([]);
const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
const [hoveredFlowId, setHoveredFlowId] = useState<string | null>(null);
const [hideRacks, setHideRacks] = useState(false);
const [stationToZoom, setStationToZoom] = useState<Station | null>(null);
```

#### Types

```typescript
interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  count: number;
}

interface Flow {
  end_station_id: string;
  end_station_name: string;
  end_lat: number;
  end_lng: number;
  count: number;
}
```

#### Data Loading

```typescript
// Load stations from static JSON on mount
useEffect(() => {
  fetch('/data/stations.json')
    .then(r => r.json())
    .then(setStations);
}, []);

// Fetch flows when active station or month changes
useEffect(() => {
  if (!activeStation) { setFlows([]); return; }
  const url = selectedMonth
    ? `/api/station/${activeStation.id}/flows?month=${selectedMonth}`
    : `/api/station/${activeStation.id}/flows`;
  fetch(url).then(r => r.json()).then(setFlows);
}, [activeStation, selectedMonth]);
```

#### Filtered Stations

```typescript
const visibleStations = hideRacks
  ? stations.filter(s => !s.name.includes('Public Rack') && !s.name.includes('Corral'))
  : stations;
```

#### Map Setup

```tsx
<MapContainer
  center={[41.8781, -87.6298]}
  zoom={12}
  style={{ height: '100vh', width: '100%' }}
  zoomControl={false}
>
  <TileLayer
    url="https://{s}.basemaps.cartocdn.com/dark_matter_all/{z}/{x}/{y}{r}.png"
    attribution='© OpenStreetMap contributors © CARTO'
  />
  <MapController stationToZoom={stationToZoom} />
  <BackgroundClickHandler onBackgroundClick={() => { setActiveStation(null); setFlows([]); }} />
  
  {/* Flow lines (render before markers so markers are on top) */}
  {flows.map(flow => (
    <FlowLine
      key={flow.end_station_id}
      activeStation={activeStation!}
      flow={flow}
      maxCount={flows[0]?.count ?? 1}
      isHovered={hoveredFlowId === flow.end_station_id}
      isSelected={selectedFlow?.end_station_id === flow.end_station_id}
      onHover={id => setHoveredFlowId(id)}
      onSelect={flow => setSelectedFlow(flow)}
    />
  ))}

  {/* Station markers */}
  {visibleStations.map(station => (
    <CircleMarker
      key={station.id}
      center={[station.lat, station.lng]}
      radius={activeStation?.id === station.id ? 8 : 4}
      pathOptions={{
        color: activeStation?.id === station.id ? '#00ccff' : '#ff4c4c',
        fillColor: activeStation?.id === station.id ? '#00ccff' : '#ff4c4c',
        fillOpacity: 1,
        weight: 1
      }}
      eventHandlers={{ click: () => handleStationClick(station) }}
    />
  ))}

  {/* Popup for selected flow */}
  {selectedFlow && activeStation && (
    <Popup position={[selectedFlow.end_lat, selectedFlow.end_lng]} onClose={() => setSelectedFlow(null)}>
      <div style={{ color: '#333' }}>
        <strong>{selectedFlow.end_station_name}</strong><br />
        {selectedFlow.count.toLocaleString()} trips
      </div>
    </Popup>
  )}
</MapContainer>
```

#### `MapController` (internal component)

Uses `useMap()` hook to fly to a station:

```typescript
function MapController({ stationToZoom }: { stationToZoom: Station | null }) {
  const map = useMap();
  useEffect(() => {
    if (stationToZoom) {
      map.flyTo([stationToZoom.lat, stationToZoom.lng], 14, { duration: 1.5 });
    }
  }, [stationToZoom]);
  return null;
}
```

#### `BackgroundClickHandler` (internal component)

```typescript
function BackgroundClickHandler({ onBackgroundClick }: { onBackgroundClick: () => void }) {
  useMapEvents({ click: onBackgroundClick });
  return null;
}
```

---

### `src/components/ControlPanel.tsx`

Fixed overlay panel. Positioned right on desktop, centered on mobile.

#### Props

```typescript
interface ControlPanelProps {
  stations: Station[];
  activeStation: Station | null;
  selectedMonth: number | null;
  hideRacks: boolean;
  onStationSelect: (station: Station) => void;
  onMonthChange: (month: number | null) => void;
  onHideRacksChange: (hide: boolean) => void;
}
```

#### Layout & Styling

```
┌─────────────────────────────┐
│  🚲 Divvy 2026 Year in Review│  ← title
│─────────────────────────────│
│  [Search stations...      ] │  ← input
│   • Wacker Dr & Washington  │  ← results (max 5)
│   • ...                     │
│─────────────────────────────│
│  Month: [All Year ▾]        │  ← select
│  [x] Hide Public Racks      │  ← checkbox
│─────────────────────────────│
│  ▶ FAQ                      │  ← collapsible
│─────────────────────────────│
```

**Color palette:**
- Background: `rgba(0, 0, 0, 0.85)`
- Accent: `#00ccff`
- Text: `#ffffff`
- Muted text: `#aaaaaa`
- Input background: `#1a1a1a`
- Border: `#333333`

**Positioning:**
```css
position: fixed;
top: 20px;
right: 20px;      /* desktop */
width: 300px;
z-index: 1000;
border-radius: 8px;
padding: 16px;

/* mobile override */
@media (max-width: 768px) {
  left: 50%;
  right: auto;
  transform: translateX(-50%);
}
```

#### Search Behavior

```typescript
const [searchQuery, setSearchQuery] = useState('');

const searchResults = searchQuery.length > 2
  ? stations
      .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 5)
  : [];
```

#### Month Dropdown Options

```typescript
const months = [
  { value: null, label: 'All Year' },
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  // ... through December
];
```

#### FAQ Content

```
Q: What is this?
A: A visualization of all Divvy bike trips taken in Chicago in 2026.
   Click any station to see where riders went.

Q: Where does the data come from?
A: Divvy (operated by Lyft) publishes monthly trip data at
   https://divvy-tripdata.s3.amazonaws.com/index.html

Q: What inspired this?
A: Zack Youngren's CitiBike visualization:
   https://www.citibikenyc.com/system-data

Q: What are Public Racks?
A: Informal bike lock spots that Divvy tracks as trip endpoints
   but aren't official stations. You can hide them with the checkbox.
```

---

### `src/components/FlowLine.tsx`

Renders a single flow as a polyline with an arrow head at the destination.

#### Props

```typescript
interface FlowLineProps {
  activeStation: Station;
  flow: Flow;
  maxCount: number;          // count of the highest-flow destination (for normalization)
  isHovered: boolean;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (flow: Flow) => void;
}
```

#### Line Weight & Opacity

Scale line thickness and opacity based on `flow.count / maxCount` ratio:

```typescript
const ratio = flow.count / maxCount;
const weight = isHovered ? Math.max(3, ratio * 10) + 3 : Math.max(1.5, ratio * 10);
const opacity = isHovered ? Math.min(1, 0.3 + ratio * 0.7 + 0.2) : Math.min(0.9, 0.3 + ratio * 0.7);
```

#### Arrow Decorator

Uses `leaflet-polylinedecorator` to add an arrow head:

```typescript
// After polyline is created, add decorator
const decorator = L.polylineDecorator(polylineRef.current, {
  patterns: [{
    offset: '100%',
    repeat: 0,
    symbol: L.Symbol.arrowHead({
      pixelSize: isHovered ? 14 : 10,
      polygon: false,
      pathOptions: {
        color: '#00ccff',
        opacity: opacity,
        weight: weight
      }
    })
  }]
});
decorator.addTo(map);
```

Since `leaflet-polylinedecorator` doesn't have official React-Leaflet bindings, use `useEffect` + `useMap()` to imperatively add/remove decorators. Clean up in the effect's return function.

#### TypeScript Types

Create `src/types/leaflet-polylinedecorator.d.ts`:

```typescript
import * as L from 'leaflet';

declare module 'leaflet' {
  namespace Symbol {
    function arrowHead(options: {
      pixelSize: number;
      polygon?: boolean;
      pathOptions?: L.PathOptions;
    }): unknown;
  }

  function polylineDecorator(
    polyline: L.Polyline,
    options: { patterns: Array<{ offset: string | number; repeat: number; symbol: unknown }> }
  ): L.Layer;
}
```

---

## `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/bike.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Divvy 2026 Wrapped</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## Important: Leaflet + React Notes

1. **Always import Leaflet CSS** in `main.tsx`: `import 'leaflet/dist/leaflet.css'`
2. **Leaflet default icon fix** — Leaflet's default marker icons break with Vite's asset hashing. Since this app only uses `CircleMarker` (no default icons), this is not needed, but be aware if adding Popup markers.
3. **`useMap()` only works inside `MapContainer`** — put `MapController` and `BackgroundClickHandler` as children of `MapContainer`.
4. **`leaflet-polylinedecorator` is imperative** — manage its lifecycle with `useEffect` and return a cleanup function that calls `decorator.remove()`.
5. **Z-index**: Leaflet tiles = 100–400, overlays = 400+, control panel = 1000+.
