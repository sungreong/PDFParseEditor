'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useLayerManager } from '@/hooks/useLayerManager';
import { usePDFUpload } from '@/hooks/usePDFUpload';
import type { Layer, Box } from '@/hooks/useLayerManager';
import type { ToolState, ToolActions, Point } from '@/types/tools';

// 클라이언트 사이드에서만 렌더링되도록 동적 임포트
const PDFDocument = dynamic(() => import('./PDFDocument'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  )
});

const PDFDropzone = dynamic(() => import('./PDFDropzone'), {
  ssr: false
});

const DocumentSidebar = dynamic(() => import('./sidebar/DocumentSidebar'), {
  ssr: false
});

const LayerSidebar = dynamic(() => import('./sidebar/LayerSidebar'), {
  ssr: false
});

interface PDFViewerProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ file, onFileChange }) => {
  // 기본 상태 관리
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [isScrollMode, setIsScrollMode] = useState<boolean>(false);
  const [isTextSelectable, setIsTextSelectable] = useState<boolean>(false);
  const [visiblePages, setVisiblePages] = useState<number[]>([1]);

  // 사이드바 상태 관리
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isLayerSidebarOpen, setIsLayerSidebarOpen] = useState<boolean>(false);

  // 레이어 관리자 훅
  const {
    layersByDocument,
    activeLayer,
    selectedBox,
    layers,
    setLayers,
    setActiveLayer,
    setSelectedBox,
    initializeDocumentPage,
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    addBox,
    removeBox,
    updateBox,
    getPageData,
    redrawAllCanvases,
  } = useLayerManager();

  // PDF 업로드 훅
  const { uploadPDF } = usePDFUpload();

  // 파일 업로드 처리
  const handleFileUpload = async (file: File) => {
    try {
      const pdfInfo = await uploadPDF(file);
      if (pdfInfo) {
        onFileChange(file);
        setNumPages(pdfInfo.page_count);
        setPageNumber(1);
        
        if (file) {
          initializeDocumentPage(file.name, 1);
        }
      }
    } catch (error) {
      console.error('파일 업로드 실패:', error);
    }
  };

  // 도구 상태 및 액션
  const [toolState, setToolState] = useState<ToolState>({
    isDrawMode: false,
    isDrawingArrow: false,
    isMultiSelectMode: false,
    startBox: null,
    selectedBoxes: [],
    selectionCoords: null
  });

  // 선택된 박스들 관리
  const handleBoxSelect = useCallback((boxId: string) => {
    if (toolState.isMultiSelectMode) {
      setToolState(prev => ({
        ...prev,
        selectedBoxes: prev.selectedBoxes.includes(boxId)
          ? prev.selectedBoxes.filter(id => id !== boxId)
          : [...prev.selectedBoxes, boxId]
      }));
    } else {
      setToolState(prev => ({
        ...prev,
        selectedBoxes: [boxId]
      }));
    }
  }, [toolState.isMultiSelectMode]);

  const toolActions: ToolActions = {
    onToggleDrawMode: () => {
      setToolState(prev => ({
        ...prev,
        isDrawMode: !prev.isDrawMode,
        isMultiSelectMode: false,
        isDrawingArrow: false
      }));
    },
    onToggleArrowDrawing: () => {
      setToolState(prev => ({
        ...prev,
        isDrawingArrow: !prev.isDrawingArrow,
        isDrawMode: false,
        isMultiSelectMode: false
      }));
    },
    onToggleMultiSelect: () => {
      setToolState(prev => ({
        ...prev,
        isMultiSelectMode: !prev.isMultiSelectMode,
        isDrawMode: false,
        isDrawingArrow: false
      }));
    },
    setStartBox: (box: Box | null) => {
      setToolState(prev => ({
        ...prev,
        startBox: box
      }));
    },
    setSelectedBoxes: (boxes: string[]) => {
      setToolState(prev => ({
        ...prev,
        selectedBoxes: boxes
      }));
    },
    setSelectionCoords: (coords: { start: Point; end: Point } | null) => {
      setToolState(prev => ({
        ...prev,
        selectionCoords: coords
      }));
    }
  };

  return (
    <div className="flex flex-col items-center p-4 min-h-screen">
      <PDFDropzone onFileUpload={handleFileUpload} />

      {file && (
        <div className="relative w-full">
          <PDFDocument
            file={file}
            pageNumber={pageNumber}
            scale={scale}
            isScrollMode={isScrollMode}
            isTextSelectable={isTextSelectable}
            visiblePages={visiblePages}
            toolState={toolState}
            toolActions={toolActions}
            onBoxSelect={handleBoxSelect}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          />

          <LayerSidebar
            isOpen={isLayerSidebarOpen}
            onClose={() => setIsLayerSidebarOpen(false)}
            layers={layers}
            activeLayer={activeLayer}
            onLayerAdd={addLayer}
            onLayerDelete={removeLayer}
            onLayerVisibilityToggle={toggleLayerVisibility}
            onLayerSelect={setActiveLayer}
          />

          <DocumentSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            file={file}
            numPages={numPages}
            pageNumber={pageNumber}
            scale={scale}
            isScrollMode={isScrollMode}
            isTextSelectable={isTextSelectable}
            onPageChange={setPageNumber}
            onScaleModeChange={setScale}
            onScrollModeChange={setIsScrollMode}
            onTextSelectableChange={setIsTextSelectable}
          />
        </div>
      )}
    </div>
  );
};

export default PDFViewer; 