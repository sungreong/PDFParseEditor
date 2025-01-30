import React from 'react';
import type { Box } from '../types';
import { BoxResizeHandles } from './BoxResizeHandles';

interface BoxOverlayProps {
  box: Box;
  isSelected: boolean;
  onSelect: (boxId: string) => void;
  onDelete: (boxId: string) => void;
  onUpdate: (boxId: string, updates: Partial<Box>) => void;
}

export const BoxOverlay: React.FC<BoxOverlayProps> = ({
  box,
  isSelected,
  onSelect,
  onDelete,
  onUpdate,
}) => {
  return (
    <div
      className={`absolute border-2 ${
        isSelected ? 'border-blue-500' : 'border-gray-500'
      } group cursor-pointer`}
      style={{
        left: `${box.x}px`,
        top: `${box.y}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
      }}
      onClick={() => onSelect(box.id)}
    >
      {box.text && (
        <div className="absolute inset-0 p-1 text-sm overflow-hidden">
          {box.text}
        </div>
      )}
      
      {isSelected && (
        <>
          <button
            className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(box.id);
            }}
          >
            ✕
          </button>
          
          <BoxResizeHandles
            box={box}
            onResize={(updates) => onUpdate(box.id, updates)}
          />
        </>
      )}
    </div>
  );
};

export default BoxOverlay; 