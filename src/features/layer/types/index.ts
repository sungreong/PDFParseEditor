import type { Layer as BaseLayer, Box as BaseBox, GroupBox, Canvas } from '@/types';

// 페이지별 박스 관리를 위한 인터페이스
export interface PageBoxes {
  pageNumber: number;
  boxes: Box[];
}

// 레이어에 페이지별 박스 관리 추가
export interface Layer extends BaseLayer {
  boxesByPage: Record<number, Box[]>;  // 페이지 번호를 키로 사용
}

export type Box = BaseBox;

export interface LayerState {
  layers: Layer[];
  activeLayer: Layer | null;
  selectedBox: Box | null;
  layersByDocument: Record<string, {
    layers: Layer[];
    pageBoxes: Record<number, Box[]>;  // 페이지별 박스 관리
  }>;
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

// 페이지별 박스 관리를 위한 유틸리티 타입
export interface PageData {
  pageNumber: number;
  boxes: Box[];
  canvases: Canvas[];
  groupBoxes: GroupBox[];
}

export interface DocumentData {
  documentId: string;
  pages: Record<number, PageData>;
  layers: Layer[];
} 