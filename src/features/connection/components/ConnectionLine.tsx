import React from 'react';
import type { Box } from '@/features/box/types';
import { calculateConnectionPoints } from '../utils/connectionUtils';

interface ConnectionLineProps {
  startBox: Box;
  endBox: Box;
  type: 'arrow' | 'line';
  color?: string;
  isSelected?: boolean;
  onClick?: () => void;
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({
  startBox,
  endBox,
  type,
  color = '#000000',
  isSelected = false,
  onClick,
}) => {
  const { start, end, controlPoints } = calculateConnectionPoints(startBox, endBox);

  const pathData = `
    M ${start.x} ${start.y}
    C ${controlPoints[0].x} ${controlPoints[0].y},
      ${controlPoints[1].x} ${controlPoints[1].y},
      ${end.x} ${end.y}
  `;

  const arrowMarker = type === 'arrow' ? `url(#arrow-${color.replace('#', '')})` : '';

  return (
    <g onClick={onClick}>
      <defs>
        <marker
          id={`arrow-${color.replace('#', '')}`}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            fill={color}
          />
        </marker>
      </defs>

      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={isSelected ? 3 : 2}
        markerEnd={arrowMarker}
        className="transition-all duration-200"
      />

      {isSelected && (
        <>
          <circle
            cx={start.x}
            cy={start.y}
            r="4"
            fill={color}
            className="cursor-move"
          />
          <circle
            cx={end.x}
            cy={end.y}
            r="4"
            fill={color}
            className="cursor-move"
          />
        </>
      )}
    </g>
  );
};

export default ConnectionLine; 