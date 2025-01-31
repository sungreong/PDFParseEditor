import type { Layer as BaseLayer, Box as BaseBox, GroupBox, Canvas } from '@/types';

export type Layer = BaseLayer;
export type Box = BaseBox;

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
  canvases: Canvas[];
  groupBoxes: GroupBox[];
} 