import { useState } from 'react';

const MobileWarning = () => {
  const [show, setShow] = useState(window.innerWidth < 768);

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#cc0000',
        color: 'white',
        padding: '10px 16px',
        textAlign: 'center',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
      }}
    >
      <span>This app is best experienced on a larger screen.</span>
      <button
        onClick={() => setShow(false)}
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.6)',
          color: 'white',
          borderRadius: '4px',
          padding: '2px 8px',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        ✕
      </button>
    </div>
  );
};

export default MobileWarning;
