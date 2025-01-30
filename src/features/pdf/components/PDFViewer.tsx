'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useLayerManager } from '@/features/layer/hooks/useLayerManager';
import { usePDFState } from '../hooks/usePDFState';
import { useToolState } from '../hooks/useToolState';
import { usePDFUpload } from '../hooks/usePDFUpload';
import type { PDFViewerProps } from '../types';

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

const PDFViewer: React.FC<PDFViewerProps> = ({ file, onFileChange }) => {
  // PDF 상태 관리
  const {
    numPages,
    pageNumber,
    scale,
    isScrollMode,
    isTextSelectable,
    visiblePages,
    isSidebarOpen,
    isLayerSidebarOpen,
    setNumPages,
    setPageNumber,
    setScale,
    setIsScrollMode,
    setIsTextSelectable,
    setVisiblePages,
    setIsSidebarOpen,
    setIsLayerSidebarOpen,
  } = usePDFState();

  // 도구 상태 관리
  const { toolState, toolActions, handleBoxSelect } = useToolState();

  // 레이어 관리
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

  // PDF 업로드 관리
  const { uploadPDF, isUploading, uploadError } = usePDFUpload();

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