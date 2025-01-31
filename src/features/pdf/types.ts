export interface Point {
  x: number;
  y: number;
}

export interface DrawingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

export interface Box extends DrawingBox {
  id: string;
  layerId: string;
  type: 'box';
  color?: string;
  text?: string;
}

export interface Layer {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
}

export interface Connection {
  id: string;
  fromBoxId: string;
  toBoxId: string;
  type: string;
  pageNumber: number;
}

export interface DocumentPage {
  boxes: Box[];
  canvases: {
    layerId: string;
    canvasRef: HTMLCanvasElement | null;
  }[];
}

export interface DocumentType {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  pageCount: number;
  status: 'processing' | 'completed' | 'error';
}

export interface PDFViewerProps {
  file: File | null;
  onFileChange: (file: File) => void;
} 