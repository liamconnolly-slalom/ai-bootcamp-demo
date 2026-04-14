import { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import FlowLine from './FlowLine';
import ControlPanel from './ControlPanel';

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

// ─── Internal: fly-to helper ─────────────────────────────────────────────────

function MapController({ stationToZoom }: { stationToZoom: Station | null }) {
  const map = useMap();
  useEffect(() => {
    if (stationToZoom) {
      map.flyTo([stationToZoom.lat, stationToZoom.lng], 14, { duration: 1.5 });
    }
  }, [stationToZoom, map]);
  return null;
}

// ─── Internal: clear selection when clicking empty map ───────────────────────

function BackgroundClickHandler({
  onBackgroundClick,
}: {
  onBackgroundClick: () => void;
}) {
  useMapEvents({ click: onBackgroundClick });
  return null;
}

// ─── Main component ──────────────────────────────────────────────────────────

const Map = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [activeStation, setActiveStation] = useState<Station | null>(null);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [hoveredFlowId, setHoveredFlowId] = useState<string | null>(null);
  const [hideRacks, setHideRacks] = useState(false);
  const [stationToZoom, setStationToZoom] = useState<Station | null>(null);
  const justClickedStation = useRef(false);

  // Load stations once on mount
  useEffect(() => {
    fetch('/data/stations.json')
      .then((r) => r.json())
      .then(setStations);
  }, []);

  // Fetch flows whenever active station or selected month changes
  useEffect(() => {
    if (!activeStation) {
      setFlows([]);
      return;
    }
    const url = selectedMonth
      ? `/api/station/${activeStation.id}/flows?month=${selectedMonth}`
      : `/api/station/${activeStation.id}/flows`;
    fetch(url)
      .then((r) => r.json())
      .then(setFlows);
  }, [activeStation, selectedMonth]);

  const visibleStations = hideRacks
    ? stations.filter(
        (s) =>
          !s.name.includes('Public Rack') && !s.name.includes('Corral')
      )
    : stations;

  const handleStationClick = (station: Station) => {
    justClickedStation.current = true;
    setActiveStation(station);
    setSelectedFlow(null);
    setStationToZoom(station);
  };

  const handleStationSelect = (station: Station) => {
    handleStationClick(station);
  };

  const handleBackgroundClick = () => {
    if (justClickedStation.current) {
      justClickedStation.current = false;
      return;
    }
    setActiveStation(null);
    setFlows([]);
    setSelectedFlow(null);
  };

  return (
    <>
      <MapContainer
        center={[41.8781, -87.6298]}
        zoom={12}
        style={{ height: '100vh', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com">Esri</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <MapController stationToZoom={stationToZoom} />
        <BackgroundClickHandler onBackgroundClick={handleBackgroundClick} />

        {/* Flow lines — rendered before markers so markers stay on top */}
        {flows.map((flow) => (
          <FlowLine
            key={flow.end_station_id}
            activeStation={activeStation!}
            flow={flow}
            maxCount={flows[0]?.count ?? 1}
            isHovered={hoveredFlowId === flow.end_station_id}
            isSelected={selectedFlow?.end_station_id === flow.end_station_id}
            onHover={(id) => setHoveredFlowId(id)}
            onSelect={(f) => {
              justClickedStation.current = true;
              setSelectedFlow(f);
            }}
          />
        ))}

        {/* Station markers */}
        {visibleStations.map((station) => (
          <CircleMarker
            key={station.id}
            center={[station.lat, station.lng]}
            radius={activeStation?.id === station.id ? 8 : 4}
            pathOptions={{
              color:
                activeStation?.id === station.id ? '#00ccff' : '#ff4c4c',
              fillColor:
                activeStation?.id === station.id ? '#00ccff' : '#ff4c4c',
              fillOpacity: 1,
              weight: 1,
            }}
            eventHandlers={{
              click: () => handleStationClick(station),
            }}
          />
        ))}

        {/* Popup for selected flow endpoint */}
        {selectedFlow && activeStation && (
          <Popup
            position={[selectedFlow.end_lat, selectedFlow.end_lng]}
            onClose={() => setSelectedFlow(null)}
          >
            <div style={{ color: '#333' }}>
              <strong>{selectedFlow.end_station_name}</strong>
              <br />
              {selectedFlow.count.toLocaleString()} trips
            </div>
          </Popup>
        )}
      </MapContainer>

      {/* Control panel sits outside MapContainer to avoid Leaflet event bubbling */}
      <ControlPanel
        stations={stations}
        activeStation={activeStation}
        selectedMonth={selectedMonth}
        hideRacks={hideRacks}
        onStationSelect={handleStationSelect}
        onMonthChange={(month) => {
          setSelectedMonth(month);
          setSelectedFlow(null);
        }}
        onHideRacksChange={setHideRacks}
      />
    </>
  );
};

export default Map;
