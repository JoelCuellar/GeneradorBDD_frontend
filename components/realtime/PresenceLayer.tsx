'use client';

import React from 'react';
import { useRealtime } from './RealtimeProvider';

export default function PresenceLayer() {
  const { presence, me } = useRealtime();
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {Object.entries(presence).map(([uid, p]) => {
        if (!p.cursor || uid === me.id) return null;
        return (
          <div key={uid}
               style={{ position: 'absolute', left: p.cursor.x + 8, top: p.cursor.y + 8, transform: 'translate(-50%,-50%)' }}>
            <div style={{
              background: p.color ?? '#111827',
              color: 'white',
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 6,
              boxShadow: '0 1px 2px rgba(0,0,0,.2)',
              whiteSpace: 'nowrap',
            }}>
              {uid.slice(0,6)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
