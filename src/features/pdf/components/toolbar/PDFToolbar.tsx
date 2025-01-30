import React from 'react';
import type { ToolState, ToolActions } from '../../types';
import { ToolButton } from './ToolButton';

interface PDFToolbarProps {
  toolState: ToolState;
  toolActions: ToolActions;
  scale: number;
  onScaleChange: (scale: number) => void;
}

export const PDFToolbar: React.FC<PDFToolbarProps> = ({
  toolState,
  toolActions,
  scale,
  onScaleChange,
}) => {
  const scaleOptions = [
    { label: '50%', value: 0.5 },
    { label: '75%', value: 0.75 },
    { label: '100%', value: 1 },
    { label: '125%', value: 1.25 },
    { label: '150%', value: 1.5 },
    { label: '200%', value: 2 },
  ];

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white rounded-lg shadow-lg p-2 flex items-center space-x-2">
      <div className="flex items-center space-x-1 border-r pr-2">
        <ToolButton
          icon="✏️"
          isActive={toolState.isDrawMode}
          onClick={toolActions.onToggleDrawMode}
          tooltip="박스 그리기"
        />
        <ToolButton
          icon="➡️"
          isActive={toolState.isDrawingArrow}
          onClick={toolActions.onToggleArrowDrawing}
          tooltip="화살표 그리기"
        />
        <ToolButton
          icon="🔍"
          isActive={toolState.isMultiSelectMode}
          onClick={toolActions.onToggleMultiSelect}
          tooltip="다중 선택"
        />
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onScaleChange(Math.max(0.5, scale - 0.1))}
          className="p-1 hover:bg-gray-100 rounded"
          title="축소"
        >
          -
        </button>
        <select
          value={scale}
          onChange={(e) => onScaleChange(parseFloat(e.target.value))}
          className="px-2 py-1 border rounded bg-white"
        >
          {scaleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => onScaleChange(Math.min(2, scale + 0.1))}
          className="p-1 hover:bg-gray-100 rounded"
          title="확대"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default PDFToolbar; 