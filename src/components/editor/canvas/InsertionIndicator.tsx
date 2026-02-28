'use client';

import React from 'react';

interface InsertionIndicatorProps {
  type?: 'vertical' | 'horizontal';
}

export const InsertionIndicator: React.FC<InsertionIndicatorProps> = () => {
  return (
    <div 
      className="insertion-indicator"
      style={{
        width: '100%',
        height: '4px',
        backgroundColor: '#1890ff',
        borderRadius: '2px',
        margin: '4px 0',
        boxShadow: '0 0 8px rgba(24, 144, 255, 0.5)',
        animation: 'pulse 1s infinite ease-in-out',
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scaleY(1); }
          50% { opacity: 1; transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  );
};
