export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  boxes: Box[];
  color?: string;
}

export interface Box {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  type?: string;
  layerId: string;
}

export interface LayerState {
  layers: Layer[];
  activeLayer: Layer | null;
  selectedBox: Box | null;
  layersByDocument: Record<string, Layer[]>;
}

export interface LayerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  layers: Layer[];
  activeLayer: Layer | null;
  onLayerAdd: (name: string) => void;
  onLayerDelete: (layerId: string) => void;
  onLayerVisibilityToggle: (layerId: string) => void;
  onLayerSelect: (layer: Layer) => void;
}

export interface DocumentPageData {
  layers: Layer[];
  boxes: Box[];
} 