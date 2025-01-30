import React from 'react';
import type { Box } from '@/features/box/types';
import type { Connection } from '../types';

interface ConnectionLinesProps {
  connections: Array<Connection & { startBox: Box; endBox: Box }>;
  scale: number;
  width: number;
  height: number;
  onDelete: (connectionId: string) => void;
  activeLayerColor?: string;
}

const getBoxCenter = (box: Box) => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({
  connections,
  scale,
  width,
  height,
  onDelete,
  activeLayerColor = '#000',
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
          id={`arrowhead-${activeLayerColor.replace('#', '')}`}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={activeLayerColor}
          />
        </marker>
      </defs>
      {connections.map(connection => {
        const start = getBoxCenter(connection.startBox);
        const end = getBoxCenter(connection.endBox);
        
        return (
          <g key={connection.id}>
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={connection.color || activeLayerColor}
              strokeWidth="2"
              markerEnd={`url(#arrowhead-${activeLayerColor.replace('#', '')})`}
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
