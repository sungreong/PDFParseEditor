export interface PDFViewerProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export interface PDFDocumentProps extends PDFViewerProps {
  pageNumber: number;
  scale: number;
  isScrollMode: boolean;
  isTextSelectable: boolean;
  visiblePages: number[];
  toolState: ToolState;
  toolActions: ToolActions;
  onBoxSelect: (boxId: string) => void;
  onLoadSuccess: ({ numPages }: { numPages: number }) => void;
}

export interface PDFDropzoneProps {
  onFileUpload: (file: File) => void;
}

export interface PDFState {
  numPages: number;
  pageNumber: number;
  scale: number;
  isScrollMode: boolean;
  isTextSelectable: boolean;
  visiblePages: number[];
  isSidebarOpen: boolean;
  isLayerSidebarOpen: boolean;
}

export interface PDFInfo {
  page_count: number;
  // 필요한 다른 PDF 정보들을 여기에 추가
}

export interface ToolState {
  isDrawMode: boolean;
  isDrawingArrow: boolean;
  isMultiSelectMode: boolean;
  startBox: Box | null;
  selectedBoxes: string[];
  selectionCoords: { start: Point; end: Point } | null;
}

export interface ToolActions {
  onToggleDrawMode: () => void;
  onToggleArrowDrawing: () => void;
  onToggleMultiSelect: () => void;
  setStartBox: (box: Box | null) => void;
  setSelectedBoxes: (boxes: string[]) => void;
  setSelectionCoords: (coords: { start: Point; end: Point } | null) => void;
}

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  type?: string;
} 