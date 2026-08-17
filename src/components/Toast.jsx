import React, { useEffect } from 'react';

export default function Toast({ toasts, setToasts }) {
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts((prev) => prev.slice(1));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toasts, setToasts]);

  return (
    <div id="toast-container">
      {toasts.map((t, idx) => (
        <div
          key={t.id || idx}
          className="toast-item glass-panel"
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            borderLeft: `3px solid ${t.type === 'error' ? '#ef4444' : '#06b6d4'}`,
            color: t.type === 'error' ? '#f87171' : '#86efac',
            fontSize: '13px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            minWidth: '220px',
            maxWidth: '300px',
            transition: 'all 0.3s',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
