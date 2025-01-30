import React from 'react';
import type { Connection } from '../hooks/useConnectionManager';
import type { Layer } from '../hooks/useLayerManager';

interface ConnectionLinesProps {
  connections: Connection[];
  layers: Layer[];
  width: number;
  height: number;
  scale: number;
  onDelete: (connectionId: string) => void;
}

const getBoxCenter = (box: { x: number; y: number; width: number; height: number }) => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2
});

const ConnectionLines: React.FC<ConnectionLinesProps> = ({
  connections,
  layers,
  width,
  height,
  scale,
  onDelete
}) => {
  return (
    <svg 
      className="absolute inset-0 pointer-events-none" 
      style={{ 
        width,
        height,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        zIndex: 2 
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
        </marker>
      </defs>
      {connections.map(connection => {
        const start = getBoxCenter(connection.startBox);
        const end = getBoxCenter(connection.endBox);
        const layer = layers.find(l => l.id === connection.layerId);
        
        return (
          <g key={connection.id}>
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={layer?.color || '#000'}
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
              style={{ pointerEvents: 'none' }}
            />
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="transparent"
              strokeWidth="10"
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(connection.id);
              }}
            />
          </g>
        );
      })}
    </svg>
  );
};

export default ConnectionLines; 