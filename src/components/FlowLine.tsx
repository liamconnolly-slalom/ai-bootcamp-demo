import { useEffect, useRef } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet-polylinedecorator';

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

interface FlowLineProps {
  activeStation: Station;
  flow: Flow;
  maxCount: number;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (flow: Flow) => void;
}

const FlowLine = ({
  activeStation,
  flow,
  maxCount,
  isHovered,
  isSelected,
  onHover,
  onSelect,
}: FlowLineProps) => {
  const map = useMap();
  const polylineRef = useRef<L.Polyline | null>(null);
  const decoratorRef = useRef<L.Layer | null>(null);

  const ratio = flow.count / maxCount;
  const weight = isHovered
    ? Math.max(3, ratio * 10) + 3
    : Math.max(1.5, ratio * 10);
  const opacity = isHovered
    ? Math.min(1, 0.3 + ratio * 0.7 + 0.2)
    : Math.min(0.9, 0.3 + ratio * 0.7);

  const positions: [number, number][] = [
    [activeStation.lat, activeStation.lng],
    [flow.end_lat, flow.end_lng],
  ];

  useEffect(() => {
    if (!polylineRef.current) return;

    // Remove previous decorator
    if (decoratorRef.current) {
      decoratorRef.current.remove();
      decoratorRef.current = null;
    }

    const decorator = L.polylineDecorator(polylineRef.current, {
      patterns: [
        {
          offset: '100%',
          repeat: 0,
          symbol: L.Symbol.arrowHead({
            pixelSize: isHovered ? 14 : 10,
            polygon: false,
            pathOptions: {
              color: '#00ccff',
              opacity,
              weight,
            },
          }),
        },
      ],
    });

    decorator.addTo(map);
    decoratorRef.current = decorator;

    return () => {
      if (decoratorRef.current) {
        decoratorRef.current.remove();
        decoratorRef.current = null;
      }
    };
  }, [map, isHovered, isSelected, opacity, weight]);

  return (
    <Polyline
      ref={polylineRef}
      positions={positions}
      pathOptions={{
        color: isSelected ? '#ffffff' : '#00ccff',
        weight,
        opacity,
      }}
      eventHandlers={{
        mouseover: () => onHover(flow.end_station_id),
        mouseout: () => onHover(null),
        click: () => onSelect(flow),
      }}
    />
  );
};

export default FlowLine;
