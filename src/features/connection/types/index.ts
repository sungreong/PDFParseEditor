import type { Box } from '@/types';

export interface Connection {
  id: string;
  startBox: Box;
  endBox: Box;
  layerId: string;
}

export interface ConnectionState {
  connections: Connection[];
  selectedConnection: Connection | null;
}

export interface ConnectionContextType extends ConnectionState {
  addConnection: (startBox: Box, endBox: Box) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;
  setSelectedConnection: (connection: Connection | null) => void;
  getConnectionsByPage: (pageNumber: number) => Connection[];
}

export interface ConnectionDrawingState {
  isDrawing: boolean;
  startBox: Box | null;
  endBox: Box | null;
}

export interface ConnectionPoint {
  x: number;
  y: number;
}

export interface ConnectionPoints {
  start: ConnectionPoint;
  end: ConnectionPoint;
  controlPoints: [ConnectionPoint, ConnectionPoint];
}

export interface ConnectionRenderProps {
  connection: Connection;
  startBox: Box;
  endBox: Box;
  isSelected: boolean;
  onClick?: () => void;
}

export interface ConnectionEditorProps {
  connection: Connection;
  onUpdate: (updates: Partial<Connection>) => void;
  onDelete: () => void;
  onClose: () => void;
} 