export interface Box {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  type?: string;
  layerId?: string;
  color?: string;
  pageNumber?: number;
  metadata?: {
    createdAt: string;
    updatedAt: string;
  };
}

export interface BoxState {
  selectedBoxId: string | null;
  editingBoxId: string | null;
  boxes: Box[];
}

export interface BoxDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoxDrawingState {
  isDrawing: boolean;
  startPoint: { x: number; y: number } | null;
  endPoint: { x: number; y: number } | null;
}

export interface BoxSelectionState {
  isSelecting: boolean;
  startPoint: { x: number; y: number } | null;
  endPoint: { x: number; y: number } | null;
  selectedBoxIds: string[];
} 