export interface Layer {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
}

export interface Box {
  id: string;
  layerId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export interface Canvas {
  layerId: string;
  canvasRef: HTMLCanvasElement | null;
}

export interface Connection {
  id: string;
  source: Box;
  target: Box;
  layerId: string;
}

export interface PageData {
  layers: Layer[];
  boxes: Box[];
  canvases: Canvas[];
} 