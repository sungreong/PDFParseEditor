import type { Box } from '@/features/box/types';

export interface Connection {
  id: string;
  startBoxId: string;
  endBoxId: string;
  type: 'arrow' | 'line';
  color?: string;
  label?: string;
}

export interface ConnectionState {
  connections: Connection[];
  selectedConnectionId: string | null;
  editingConnectionId: string | null;
}

export interface ConnectionDrawingState {
  isDrawing: boolean;
  startBoxId: string | null;
  endBoxId: string | null;
  type: 'arrow' | 'line';
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