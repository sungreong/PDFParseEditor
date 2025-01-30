export interface Point {
  x: number;
  y: number;
}

export interface Layer {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
}

export interface Box {
  id: string;
  layerId: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  color?: string;
  text?: string;
}

export interface Canvas {
  layerId: string;
  canvasRef: HTMLCanvasElement | null;
}

export interface Connection {
  id: string;
  startBox: Box;
  endBox: Box;
  layerId: string;
}

export interface PageData {
  layers: Layer[];
  boxes: Box[];
  canvases: Canvas[];
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