export type ToolType = 'draw' | 'connect';

export interface Tool {
  id: ToolType;
  name: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  description?: string;
}

export interface ToolState {
  isDrawMode: boolean;
  isDrawingArrow: boolean;
  startBox: any | null;
}

export interface ToolActions {
  onToggleDrawMode: () => void;
  onToggleArrowDrawing: () => void;
  setStartBox: (box: any | null) => void;
} 