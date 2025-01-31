import React from 'react';
import type { Box } from '@/features/box/types';
import type { Connection } from '../types';
import { useConnection } from '../contexts/ConnectionContext';

interface ConnectionLinesProps {
  scale: number;
  pageNumber: number;
  boxes: Box[];
  width: number;
  height: number;
  onConnectionSelect: (connection: Connection) => void;
  onConnectionDelete: (connectionId: string) => void;
}

const getBoxCenter = (box: Box) => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({
  scale,
  pageNumber,
  boxes,
  width,
  height,
  onConnectionSelect,
  onConnectionDelete
}) => {
  const { getConnectionsByPage } = useConnection();
  const pageConnections = getConnectionsByPage(pageNumber);

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
      {pageConnections.map(connection => {
        const startBox = boxes.find(box => box.id === connection.startBoxId);
        const endBox = boxes.find(box => box.id === connection.endBoxId);
        
        if (!startBox || !endBox) return null;
        
        const start = getBoxCenter(startBox);
        const end = getBoxCenter(endBox);
        
        return (
          <g key={connection.id}>
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={connection.style.color}
              strokeWidth={connection.style.strokeWidth}
              strokeDasharray={connection.style.dashArray}
              markerEnd={connection.style.arrowHead ? "url(#arrowhead)" : undefined}
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
                onConnectionSelect(connection);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (window.confirm('연결선을 삭제하시겠습니까?')) {
                  onConnectionDelete(connection.id);
                }
              }}
            />
          </g>
        );
      })}
    </svg>
  );
};

export default ConnectionLines; 
