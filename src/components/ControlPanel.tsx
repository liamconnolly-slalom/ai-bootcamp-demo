import { useState } from 'react';

interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  count: number;
}

interface ControlPanelProps {
  stations: Station[];
  activeStation: Station | null;
  selectedMonth: number | null;
  hideRacks: boolean;
  onStationSelect: (station: Station) => void;
  onMonthChange: (month: number | null) => void;
  onHideRacksChange: (hide: boolean) => void;
}

const months = [
  { value: null, label: 'All Year' },
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: '20px',
  right: '20px',
  width: '300px',
  zIndex: 1000,
  background: 'rgba(0, 0, 0, 0.85)',
  color: '#ffffff',
  borderRadius: '8px',
  padding: '16px',
  border: '1px solid #333333',
  boxSizing: 'border-box',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1a1a1a',
  border: '1px solid #333333',
  borderRadius: '4px',
  color: '#ffffff',
  padding: '8px 10px',
  fontSize: '13px',
  boxSizing: 'border-box',
  outline: 'none',
};

const dividerStyle: React.CSSProperties = {
  borderTop: '1px solid #333333',
  margin: '12px 0',
};

const ControlPanel = ({
  stations,
  activeStation,
  selectedMonth,
  hideRacks,
  onStationSelect,
  onMonthChange,
  onHideRacksChange,
}: ControlPanelProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [faqOpen, setFaqOpen] = useState(false);

  const searchResults =
    searchQuery.length > 2
      ? stations
          .filter((s) =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .slice(0, 5)
      : [];

  const handleSelect = (station: Station) => {
    onStationSelect(station);
    setSearchQuery('');
  };

  return (
    <div style={panelStyle}>
      {/* Title */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#00ccff' }}>
          🚲 Divvy 2026 Year in Review
        </div>
        <div style={{ fontSize: '12px', color: '#aaaaaa', marginTop: '4px' }}>
          Click a station to see where riders went
        </div>
      </div>

      {/* Active station display */}
      {activeStation && (
        <div
          style={{
            background: '#1a1a1a',
            border: '1px solid #00ccff',
            borderRadius: '4px',
            padding: '8px 10px',
            marginBottom: '10px',
            fontSize: '13px',
            color: '#00ccff',
          }}
        >
          <div style={{ fontWeight: 600 }}>{activeStation.name}</div>
          <div style={{ color: '#aaaaaa', fontSize: '12px', marginTop: '2px' }}>
            {activeStation.count.toLocaleString()} total departures
          </div>
        </div>
      )}

      <div style={dividerStyle} />

      {/* Search */}
      <div style={{ marginBottom: '10px', position: 'relative' }}>
        <input
          type="text"
          placeholder="Search stations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={inputStyle}
        />
        {searchResults.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#1a1a1a',
              border: '1px solid #333333',
              borderTop: 'none',
              borderRadius: '0 0 4px 4px',
              zIndex: 10,
            }}
          >
            {searchResults.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSelect(s)}
                style={{
                  padding: '8px 10px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #222',
                  color: '#ffffff',
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background =
                    '#2a2a2a')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background =
                    'transparent')
                }
              >
                {s.name}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={dividerStyle} />

      {/* Month filter */}
      <div style={{ marginBottom: '10px' }}>
        <label
          style={{ fontSize: '12px', color: '#aaaaaa', display: 'block', marginBottom: '6px' }}
        >
          Month
        </label>
        <select
          value={selectedMonth ?? ''}
          onChange={(e) =>
            onMonthChange(e.target.value === '' ? null : Number(e.target.value))
          }
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          {months.map((m) => (
            <option key={String(m.value)} value={m.value ?? ''}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Hide racks checkbox */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: '#aaaaaa',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={hideRacks}
          onChange={(e) => onHideRacksChange(e.target.checked)}
          style={{ accentColor: '#00ccff', cursor: 'pointer' }}
        />
        Hide Public Racks &amp; Corrals
      </label>

      <div style={dividerStyle} />

      {/* FAQ */}
      <div>
        <button
          onClick={() => setFaqOpen(!faqOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: '#aaaaaa',
            cursor: 'pointer',
            fontSize: '13px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            width: '100%',
          }}
        >
          <span style={{ fontSize: '10px' }}>{faqOpen ? '▼' : '▶'}</span>
          FAQ
        </button>

        {faqOpen && (
          <div
            style={{
              marginTop: '10px',
              fontSize: '12px',
              color: '#aaaaaa',
              lineHeight: '1.5',
            }}
          >
            <p style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#ffffff' }}>What is this?</strong>
              <br />
              A visualization of all Divvy bike trips taken in Chicago in 2026.
              Click any station to see where riders went.
            </p>
            <p style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#ffffff' }}>Where does the data come from?</strong>
              <br />
              Divvy (operated by Lyft) publishes monthly trip data at{' '}
              <a
                href="https://divvy-tripdata.s3.amazonaws.com/index.html"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#00ccff' }}
              >
                divvy-tripdata.s3.amazonaws.com
              </a>
            </p>
            <p style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#ffffff' }}>What inspired this?</strong>
              <br />
              Zack Youngren's{' '}
              <a
                href="https://www.citibikenyc.com/system-data"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#00ccff' }}
              >
                CitiBike visualization
              </a>
            </p>
            <p>
              <strong style={{ color: '#ffffff' }}>What are Public Racks?</strong>
              <br />
              Informal bike lock spots that Divvy tracks as trip endpoints but
              aren't official stations. You can hide them with the checkbox.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
