import type { Box } from '@/hooks/useLayerManager';

export type ToolType = 'draw' | 'connect';

export interface Tool {
  id: ToolType;
  name: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  description?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface ToolState {
  isDrawMode: boolean;
  isDrawingArrow: boolean;
  isMultiSelectMode: boolean;
  startBox: Box | null;
  selectedBoxes: string[];
  selectionCoords?: {
    start: Point;
    end: Point;
  } | null;
}

export type ToolActions = {
  onToggleDrawMode: () => void;
  onToggleArrowDrawing: () => void;
  onToggleMultiSelect: () => void;
  setStartBox: (box: Box | null) => void;
  setSelectedBoxes: (boxes: string[]) => void;
} 