export interface Point {
  x: number;
  y: number;
}

export interface Document {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  pageCount: number;
  status: 'processing' | 'ready' | 'error';
}

export interface Layer {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
  boxes: Box[];
}

export interface Box {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  layerId: string;
  type: 'box' | 'group';
  color?: string;
  text?: string;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    [key: string]: any;
  };
}

export interface Canvas {
  layerId: string;
  canvasRef: HTMLCanvasElement | null;
}

export interface Connection {
  id: string;
  startBox: Box;
  endBox: Box;
  type: string;
  layerId: string;
  metadata?: {
    [key: string]: any;
  };
}

export interface PageData {
  layers: Layer[];
  boxes: Box[];
  canvases: Canvas[];
  groupBoxes: GroupBox[];
}

export interface GroupBox {
  id: string;
  name: string;
  layerId: string;
  pageNumber: number;
  color: string;
  boxIds: string[];
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  createdAt: number;
}

export interface DocumentPageData {
  boxes: Box[];
  connections: Connection[];
} 