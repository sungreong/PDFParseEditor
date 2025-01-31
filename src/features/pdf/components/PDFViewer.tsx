'use client';

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Document, Page, pdfjs } from 'react-pdf';
import { useLayerManager } from '@/features/layer/hooks/useLayerManager';
import { usePDFState } from '../hooks/usePDFState';
import { useToolState } from '../hooks/useToolState';
import { usePDFUpload } from '../hooks/usePDFUpload';
import { useDocumentManager } from '@/features/document/hooks/useDocumentManager';
import type { PDFViewerProps } from '../types';
import type { Layer, Box, GroupBox, Connection, Point, Document as DocumentType, TextPosition, TextItem } from '@/types';
import { useConnection } from '@/features/connection/contexts/ConnectionContext';
import { LayerBoxManager } from '@/features/layer/components/LayerBoxManager';
import useWindowSize from '@/hooks/useWindowSize';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import BoxDetailEditor from '@/components/BoxDetailEditor';
import { API_ENDPOINTS } from '@/config/api';

// PDF.js 워커 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const PDFDropzone = dynamic(() => import('./PDFDropzone'), {
  ssr: false
});

interface DrawingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

interface LayerBoxManagerProps {
  isOpen: boolean;
  onClose: () => void;
  layers: Layer[];
  activeLayer: Layer;
  selectedBox: Box | null;
  onLayerSelect: (layerId: string) => void;
  onLayerAdd: () => void;
  onLayerDelete: (layerId: string) => void;
  onLayerVisibilityToggle: (layerId: string) => void;
  onLayerNameChange: (layerId: string, name: string) => void;
  onLayerColorChange: (layerId: string, color: string) => void;
  onMoveBoxToLayer: (boxId: string, fromLayerId: string, toLayerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  onMergeLayers: (sourceLayerId: string, targetLayerId: string) => void;
  onExportLayer: (layerId: string) => void;
  onImportLayer: (file: File) => void;
  isDrawMode: boolean;
  onToggleDrawMode: () => void;
  isDrawingArrow: boolean;
  onToggleArrowDrawing: () => void;
  connections: Connection[];
  removeBox: (boxId: string) => void;
  updateBox: (boxId: string, updates: Partial<Box>) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ 
  file, 
  onFileChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const windowSize = useWindowSize();
  const { selectedConnection, setSelectedConnection, addConnection, updateConnection, deleteConnection } = useConnection();
  const [startBox, setStartBox] = useState<Box | null>(null);
  const [isDrawingArrow, setIsDrawingArrow] = useState(false);
  const [isBoxDetailOpen, setIsBoxDetailOpen] = useState(false);
  const [originalBox, setOriginalBox] = useState<Box | null>(null);
  const [pageRefs, setPageRefs] = useState<{ [key: number]: HTMLDivElement | null }>({});
  const [isBoxEditorOpen, setIsBoxEditorOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<Box | null>(null);

  // 문서 관리
  const {
    documents,
    currentDocument,
    setCurrentDocument,
    addDocument,
    updateDocument,
    deleteDocument,
    getDocumentById,
  } = useDocumentManager();

  // PDF 상태 관리
  const {
    numPages,
    pageNumber,
    scale,
    isScrollMode,
    visiblePages,
    isSidebarOpen,
    isLayerSidebarOpen,
    setNumPages,
    setPageNumber,
    setScale,
    setIsScrollMode,
    setVisiblePages,
    setIsSidebarOpen,
    setIsLayerSidebarOpen,
  } = usePDFState();

  // 도구 상태 관리
  const { toolState, toolActions, handleBoxSelect: handleToolBoxSelect } = useToolState();

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
    setCanvasRef,
    updateLayerName,
    updateLayerColor,
    moveBoxToLayer,
    duplicateLayer,
    mergeLayer,
    clearLayer,
    exportLayer,
    importLayer,
    generateBoxId,
  } = useLayerManager();

  // PDF 업로드 관리
  const { uploadPDF, isUploading, uploadError } = usePDFUpload();

  // 모든 박스 정보 가져오기
  const allBoxes = useMemo(() => {
    if (!file || !activeLayer) return [];
    
    const pageData = getPageData(file.name, pageNumber);
    console.log('AllBoxes - Page data:', pageNumber, pageData);
    if (!pageData) return [];

    return pageData.boxes.filter(box => 
      box.pageNumber === pageNumber && 
      box.layerId === activeLayer.id
    );
  }, [file, pageNumber, activeLayer, getPageData]);

  // PDF 크기 계산
  const pdfDimensions = useMemo(() => {
    const maxWidth = Math.min(windowSize.width * 0.8, 1200);
    const baseWidth = maxWidth;
    const baseHeight = baseWidth * 1.414; // A4 비율

    return {
      width: baseWidth,
      height: baseHeight,
      baseWidth,
      baseHeight,
      scaledWidth: baseWidth * scale,
      scaledHeight: baseHeight * scale
    };
  }, [windowSize.width, scale]);

  // 박스 그리기 관련 상태 추가
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentBox, setCurrentBox] = useState<DrawingBox | null>(null);

  // 페이지별 텍스트 데이터 관리
  const [pageTextContents, setPageTextContents] = useState<{
    [pageNumber: number]: Array<{
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
      transform: number[];
    }>;
  }>({});

  const setPageTextContent = useCallback((pageNumber: number, textContent: any[]) => {
    setPageTextContents(prev => ({
      ...prev,
      [pageNumber]: textContent
    }));
  }, []);

  // PDF 텍스트 추출 유틸리티 함수
  const extractTextFromBox = useCallback((pageNumber: number, box: Box) => {
    console.log('텍스트 추출 시작:', { pageNumber, box, scale });
    
    const pageTextContent = pageTextContents[pageNumber];
    if (!pageTextContent) {
      console.warn('페이지 텍스트 데이터 없음:', pageNumber);
      return { text: '', textItems: [] };
    }

    // 박스 영역을 스케일 독립적인 좌표로 변환
    const normalizedBoxArea = {
      left: box.x * scale,
      right: (box.x + box.width) * scale,
      top: box.y * scale,
      bottom: (box.y + box.height) * scale
    };

    console.log('정규화된 박스 영역:', normalizedBoxArea);

    const textItems: TextItem[] = [];
    
    // PDF 기본 크기 (A4)
    const PDF_WIDTH = 595.276; // PDF 포인트 단위
    const PDF_HEIGHT = 841.89; // PDF 포인트 단위

    // 뷰포트와 PDF 사이의 스케일 계산
    const viewportToPDFScaleX = PDF_WIDTH / pdfDimensions.baseWidth;
    const viewportToPDFScaleY = PDF_HEIGHT / pdfDimensions.baseHeight;
    
    // 각 텍스트 아이템 처리
    pageTextContent.forEach((item, index) => {
      // PDF 좌표계에서의 텍스트 정보
      const [itemScaleX, skewX, skewY, itemScaleY, pdfX, pdfY] = item.transform;
      const pdfWidth = item.width;
      const pdfHeight = item.height;

      // PDF 좌표를 스케일 독립적인 뷰포트 좌표로 변환
      const baseViewportX = (pdfX * pdfDimensions.baseWidth) / PDF_WIDTH;
      const baseViewportY = pdfDimensions.baseHeight - ((pdfY + pdfHeight) * pdfDimensions.baseHeight / PDF_HEIGHT);
      const baseViewportWidth = (pdfWidth * pdfDimensions.baseWidth) / PDF_WIDTH;
      const baseViewportHeight = (pdfHeight * pdfDimensions.baseHeight) / PDF_HEIGHT;

      // 현재 스케일에 맞춰 좌표 조정
      const viewportX = baseViewportX * scale;
      const viewportY = baseViewportY * scale;
      const viewportWidth = baseViewportWidth * scale;
      const viewportHeight = baseViewportHeight * scale;

      console.log(`텍스트 아이템 #${index} 좌표 변환:`, {
        text: item.text,
        pdf: { 
          x: pdfX, 
          y: pdfY, 
          width: pdfWidth, 
          height: pdfHeight,
          scale: [itemScaleX, itemScaleY]
        },
        baseViewport: {
          x: baseViewportX,
          y: baseViewportY,
          width: baseViewportWidth,
          height: baseViewportHeight
        },
        scaledViewport: { 
          x: viewportX, 
          y: viewportY, 
          width: viewportWidth, 
          height: viewportHeight 
        },
        scales: {
          viewportToPDFScaleX,
          viewportToPDFScaleY,
          userScale: scale
        }
      });

      // 텍스트 영역 확장 (여백 추가)
      const padding = Math.min(viewportWidth, viewportHeight) * 0.2; // 20% 패딩
      const expandedTextArea = {
        left: viewportX - padding,
        right: viewportX + viewportWidth + padding,
        top: viewportY - padding,
        bottom: viewportY + viewportHeight + padding
      };

      // 박스와 확장된 텍스트 영역의 겹침 확인
      const isIntersecting = (
        expandedTextArea.left < normalizedBoxArea.right &&
        expandedTextArea.right > normalizedBoxArea.left &&
        expandedTextArea.top < normalizedBoxArea.bottom &&
        expandedTextArea.bottom > normalizedBoxArea.top
      );

      if (isIntersecting) {
        // 겹치는 영역 계산
        const intersection = {
          left: Math.max(normalizedBoxArea.left, expandedTextArea.left),
          right: Math.min(normalizedBoxArea.right, expandedTextArea.right),
          top: Math.max(normalizedBoxArea.top, expandedTextArea.top),
          bottom: Math.min(normalizedBoxArea.bottom, expandedTextArea.bottom)
        };

        const intersectionArea = 
          (intersection.right - intersection.left) * 
          (intersection.bottom - intersection.top);
        
        const textArea = 
          (expandedTextArea.right - expandedTextArea.left) * 
          (expandedTextArea.bottom - expandedTextArea.top);
        
        const overlapRatio = intersectionArea / textArea;

        console.log(`텍스트 "${item.text}" 겹침 분석:`, {
          intersection,
          intersectionArea,
          textArea,
          overlapRatio,
          isIncluded: overlapRatio > 0.2
        });

        // 겹침 비율 임계값을 낮춤 (0.3 -> 0.2)
        if (overlapRatio > 0.2) {
          textItems.push({
            text: item.text,
            x: baseViewportX,  // 스케일 독립적인 좌표 저장
            y: baseViewportY,
            width: baseViewportWidth,
            height: baseViewportHeight,
            transform: item.transform
          });
        }
      }
    });

    // 텍스트 아이템을 위에서 아래로, 왼쪽에서 오른쪽으로 정렬
    textItems.sort((a, b) => {
      const lineThreshold = Math.min(a.height, b.height) * scale;  // 스케일 적용
      const yDiff = Math.abs(a.y - b.y);

      if (yDiff <= lineThreshold) {
        return a.x - b.x; // 같은 줄에서는 왼쪽에서 오른쪽으로
      }
      return a.y - b.y; // 다른 줄은 위에서 아래로
    });

    // 정렬된 텍스트 조합
    const extractedText = textItems
      .map(item => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('추출된 텍스트:', { 
      text: extractedText, 
      itemCount: textItems.length,
      items: textItems.map(item => ({
        text: item.text,
        position: { 
          x: item.x * scale,  // 현재 스케일에 맞춰 좌표 변환
          y: item.y * scale 
        }
      }))
    });

    return { text: extractedText, textItems };
  }, [pageTextContents, pdfDimensions, scale]);

  // 박스 추가 핸들러 수정
  const handleAddBox = useCallback((box: Box) => {
    if (!file || !activeLayer) {
      console.log('AddBox - Early return:', { hasFile: !!file, hasActiveLayer: !!activeLayer });
      return;
    }
    
    console.log('AddBox - 박스 추가:', {
      boxId: box.id,
      fileName: file.name,
      activeLayerId: activeLayer.id,
      pageNumber: box.pageNumber
    });

    try {
      // 전체 박스 데이터에 추가 (useLayerManager의 addBox만 사용)
      addBox(file.name, box);
      return box;
    } catch (error) {
      console.error('AddBox - Error adding box:', error);
      return null;
    }
  }, [file, activeLayer, addBox]);

  // 박스 생성 핸들러 수정
  const handleBoxCreated = useCallback((box: DrawingBox) => {
    if (!file || !activeLayer) return;

    // 박스 ID를 한 번만 생성
    const boxId = generateBoxId();
    console.log('새로운 박스 ID 생성:', boxId);

    // 박스 좌표 정규화
    const normalizedBox: Box = {
      id: boxId,
      layerId: activeLayer.id,
      pageNumber: box.pageNumber,
      x: Math.min(box.x, box.x + box.width),
      y: Math.min(box.y, box.y + box.height),
      width: Math.abs(box.width),
      height: Math.abs(box.height),
      type: 'box',
      color: activeLayer.color,
      text: '',
      textItems: [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    // 텍스트 추출
    const { text, textItems } = extractTextFromBox(box.pageNumber, normalizedBox);
    normalizedBox.text = text;
    normalizedBox.textItems = textItems;

    console.log('박스 생성 완료:', { boxId, box: normalizedBox });
    handleAddBox(normalizedBox);
    
    setCurrentBox(null);
    setStartPoint(null);
    setSelectedBox(normalizedBox);
  }, [file, activeLayer, handleAddBox, setSelectedBox, extractTextFromBox, generateBoxId]);

  // 파일 업로드 처리
  const handleFileUpload = async (file: File) => {
    try {
        onFileChange(file);
        setPageNumber(1);
        
        if (file) {
        // 새 문서 추가
        const newDocument: DocumentType = {
          id: `doc_${Date.now()}`,
          name: file.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pageCount: 0,
          status: 'processing',
        };
        
        addDocument(newDocument);
        setCurrentDocument(newDocument);
          initializeDocumentPage(file.name, 1);
      }
    } catch (error) {
      console.error('파일 업로드 실패:', error);
    }
  };

  // 페이지 ref 설정
  const setPageRef = useCallback((pageNum: number, ref: HTMLDivElement | null) => {
    if (pageRefs[pageNum] !== ref) {
      setPageRefs(prev => ({
        ...prev,
        [pageNum]: ref
      }));
    }
  }, [pageRefs]);

  // 박스 중앙 좌표 계산
  const getBoxCenter = (box: Box): Point => {
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2
    };
  };

  // 연결선 렌더링 컴포넌트
  const ConnectionLines = () => {
    if (!activeLayer || !selectedConnection) return null;

    const startBox = selectedConnection.startBox;
    const endBox = selectedConnection.endBox;

    if (!startBox || !endBox) return null;

    return (
      <svg 
        className="absolute inset-0 pointer-events-none" 
        style={{ 
          width: pdfDimensions.width,
          height: pdfDimensions.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          zIndex: 2 
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill={activeLayer.color}
            />
          </marker>
        </defs>
        <g key={selectedConnection.id}>
          <line
            x1={getBoxCenter(startBox).x}
            y1={getBoxCenter(startBox).y}
            x2={getBoxCenter(endBox).x}
            y2={getBoxCenter(endBox).y}
            stroke={activeLayer.color}
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
            style={{ pointerEvents: 'none' }}
          />
        </g>
      </svg>
    );
  };

  // 다중 선택 상태 추가
  const [selectedBoxIds, setSelectedBoxIds] = useState<Set<string>>(new Set());

  // 다중 삭제 핸들러 추가
  const handleMultipleDelete = async () => {
    if (selectedBoxIds.size === 0) return;
    
    if (window.confirm(`선택한 ${selectedBoxIds.size}개의 박스를 삭제하시겠습니까?`)) {
      try {
        // 선택된 모든 박스 삭제
        for (const boxId of selectedBoxIds) {
          await handleRemoveBox(boxId);
        }
        
        // 선택 상태 초기화
        setSelectedBoxIds(new Set());
        setSelectedBox(null);
        
        // 성공 메시지 표시
        const popup = document.createElement('div');
        popup.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded shadow-lg z-[9999] flex items-center gap-2';
        popup.innerHTML = `
          <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span class="font-medium">${selectedBoxIds.size}개의 박스가 삭제되었습니다</span>
        `;
        
        document.body.appendChild(popup);
        setTimeout(() => {
          popup.classList.add('opacity-0', 'transition-opacity', 'duration-300');
          setTimeout(() => document.body.removeChild(popup), 300);
        }, 1500);
      } catch (error) {
        console.error('박스 다중 삭제 중 오류 발생:', error);
        alert('박스 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // 박스 선택 핸들러
  const handleBoxClick = useCallback((box: Box, openDetail: boolean = false) => {
    if (isDrawingArrow) {
      if (!startBox) {
        setStartBox(box);
      } else if (box.pageNumber === startBox.pageNumber) {
        addConnection(startBox, box);
        setStartBox(null);
        setIsDrawingArrow(false);
      }
    } else {
      handleToolBoxSelect(box.id);
      if (openDetail) {
        setSelectedBox(box);
        setIsBoxDetailOpen(true);
      }
    }
  }, [isDrawingArrow, startBox, handleToolBoxSelect, addConnection, setSelectedBox]);

  // 페이지 렌더링
  const renderPage = (pageNum: number) => {
    const pageData = file ? getPageData(file.name, pageNum) : null;
    
    return (
      <div
        key={pageNum}
        ref={(ref) => setPageRef(pageNum, ref)}
        className="pdf-page-container relative"
        data-page={pageNum}
        onMouseDown={(e) => {
          if (toolState.isDrawMode) {
            handleCanvasMouseDown(e, pageNum);
          }
        }}
        onMouseMove={(e) => {
          if (toolState.isDrawMode) {
            handleCanvasMouseMove(e, pageNum);
          }
        }}
        onMouseUp={(e) => {
          if (toolState.isDrawMode) {
            handleCanvasMouseUp(e, pageNum);
          }
        }}
        style={{
          width: `${pdfDimensions.scaledWidth}px`,
          height: `${pdfDimensions.scaledHeight}px`,
          userSelect: toolState.isDrawMode ? 'none' : 'text',
        }}
      >
        <div className="relative">
          <Page
            pageNumber={pageNum}
            width={pdfDimensions.width}
            height={pdfDimensions.height}
            renderTextLayer={true}
            renderAnnotationLayer={false}
            scale={scale}
            loading={
              <div className="w-full h-[500px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            }
            onGetTextSuccess={(textContent) => {
              console.log('=== PDF Text Content Retrieved ===');
              console.log('Raw Text Content:', {
                pageNumber: pageNum,
                itemCount: textContent.items.length,
                rawItems: textContent.items
              });

              const textItems = textContent.items.map((item: any, index: number) => {
                const [scaleX, skewX, skewY, scaleY, x, y] = item.transform;
                
                console.log(`Text Item #${index}:`, {
                  text: item.str,
                  originalTransform: item.transform,
                  coordinates: {
                    x: x,
                    y: y,
                    width: item.width,
                    height: item.height
                  },
                  transformMatrix: {
                    scaleX,
                    skewX,
                    skewY,
                    scaleY,
                    translateX: x,
                    translateY: y
                  },
                  fontSize: item.fontSize,
                  fontName: item.fontName
                });

                return {
                  text: item.str,
                  x: item.transform[4],
                  y: item.transform[5],
                  width: item.width,
                  height: item.height,
                  transform: item.transform
                };
              });

              console.log('Processed Text Items:', {
                pageNumber: pageNum,
                processedItemCount: textItems.length,
                items: textItems.map(item => ({
                  text: item.text,
                  position: {
                    x: item.x,
                    y: item.y,
                    width: item.width,
                    height: item.height
                  }
                }))
              });

              setPageTextContents(prev => {
                const updated = {
                  ...prev,
                  [pageNum]: textItems
                };
                console.log('Updated Page Text Contents:', {
                  pageNumber: pageNum,
                  totalPages: Object.keys(updated).length,
                  currentPageItemCount: textItems.length
                });
                return updated;
              });
            }}
          />
          <style jsx global>{`
            .react-pdf__Page__textContent {
              pointer-events: ${toolState.isDrawMode ? 'none' : 'auto'} !important;
              user-select: ${toolState.isDrawMode ? 'none' : 'text'} !important;
              -webkit-user-select: ${toolState.isDrawMode ? 'none' : 'text'} !important;
              -moz-user-select: ${toolState.isDrawMode ? 'none' : 'text'} !important;
              -ms-user-select: ${toolState.isDrawMode ? 'none' : 'text'} !important;
            }
            .react-pdf__Page__textContent span {
              opacity: 0.4;
              cursor: ${toolState.isDrawMode ? 'crosshair' : 'text'};
            }
            .react-pdf__Page__textContent span::selection {
              background: rgba(0, 0, 255, 0.3);
            }
          `}</style>
          {/* 현재 그리고 있는 박스 미리보기 */}
          {currentBox && toolState.isDrawMode && pageNum === currentBox.pageNumber && (
            <div
              className="absolute border-2 border-dashed pointer-events-none"
              style={{
                left: `${currentBox.x * scale}px`,
                top: `${currentBox.y * scale}px`,
                width: `${Math.abs(currentBox.width) * scale}px`,
                height: `${Math.abs(currentBox.height) * scale}px`,
                borderColor: activeLayer?.color || '#000',
                backgroundColor: `${activeLayer?.color}20` || '#00000020'
              }}
            />
          )}
          {pageData?.boxes
            .filter(box => box.pageNumber === pageNum)
            .map(box => {
              const layer = layers.find(l => l.id === box.layerId);
              if (!layer?.isVisible) return null;
              
              const isSelected = selectedBoxIds.has(box.id);
              const isEditing = editingBox?.id === box.id;
              
              return (
                <div
                  key={box.id}
                  className={`absolute border-2 transition-all duration-200 ${
                    isSelected 
                      ? 'ring-2 ring-blue-500 shadow-lg' 
                      : ''
                  } ${
                    isEditing
                      ? 'ring-4 ring-blue-400 ring-opacity-50 border-blue-500 animate-pulse shadow-xl' 
                      : ''
                  }`}
                  style={{
                    left: `${box.x * scale}px`,
                    top: `${box.y * scale}px`,
                    width: `${box.width * scale}px`,
                    height: `${box.height * scale}px`,
                    borderColor: isSelected ? '#3B82F6' : (box.color || layer.color),
                    backgroundColor: `${box.color || layer.color}20`,
                    cursor: isDrawingArrow ? 'crosshair' : 'pointer',
                    zIndex: isSelected || isEditing ? 10 : 1
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBoxClick(box, !toolState.isMultiSelectMode);
                  }}
                />
              );
            })}
        </div>
      </div>
    );
  };

  // 박스 그리기 시작
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (!toolState.isDrawMode || !activeLayer) return;
    
    const pdfContainer = e.currentTarget.querySelector('.react-pdf__Page') as HTMLElement;
    if (!pdfContainer) return;

    const pdfRect = pdfContainer.getBoundingClientRect();
    const x = (e.clientX - pdfRect.left) / scale;
    const y = (e.clientY - pdfRect.top) / scale;

    setStartPoint({ x, y });
    setCurrentBox({
      x,
      y,
      width: 0,
      height: 0,
      pageNumber: pageNum
    });
  }, [toolState.isDrawMode, activeLayer, scale]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    console.log('handleCanvasMouseMove', e);
    if (!toolState.isDrawMode || !startPoint || !currentBox || !activeLayer) {
      console.log('MouseMove - Early return:', {
        toolState: toolState.isDrawMode,
        hasStartPoint: !!startPoint,
        hasCurrentBox: !!currentBox,
        hasActiveLayer: !!activeLayer
      });
      return;
    }
    
    const pdfContainer = e.currentTarget.querySelector('.react-pdf__Page') as HTMLElement;
    if (!pdfContainer) {
      console.log('MouseMove - No PDF container found');
      return;
    }

    const pdfRect = pdfContainer.getBoundingClientRect();
    const x = (e.clientX - pdfRect.left) / scale;
    const y = (e.clientY - pdfRect.top) / scale;
    
    console.log('MouseMove - Coordinates:', {
      startPoint,
      currentBox,
      newX: x,
      newY: y,
      calculatedWidth: x - startPoint.x,
      calculatedHeight: y - startPoint.y
    });

    if (startPoint) {
      setCurrentBox({
        ...currentBox,
        width: x - startPoint.x,
        height: y - startPoint.y,
        pageNumber: pageNum
      });
    }
  }, [toolState.isDrawMode, startPoint, currentBox, activeLayer, scale]);

  // 박스 그리기 완료
  const handleCanvasMouseUp = useCallback(async (e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (!toolState.isDrawMode || !startPoint || !currentBox || !activeLayer || !file) {
      return;
    }
    
    const pdfContainer = e.currentTarget.querySelector('.react-pdf__Page') as HTMLElement;
    if (!pdfContainer) return;

    const pdfRect = pdfContainer.getBoundingClientRect();
    const x = (e.clientX - pdfRect.left) / scale;
    const y = (e.clientY - pdfRect.top) / scale;
    
    const width = Math.abs(x - startPoint.x);
    const height = Math.abs(y - startPoint.y);
    
    const minSize = 10 / scale;
    if (width > minSize && height > minSize) {
      const newBox: DrawingBox = {
        x: startPoint.x,
        y: startPoint.y,
        width: x - startPoint.x,
        height: y - startPoint.y,
        pageNumber: pageNum
      };
      
      handleBoxCreated(newBox);
    }

    setStartPoint(null);
    setCurrentBox(null);
  }, [toolState.isDrawMode, startPoint, currentBox, activeLayer, file, scale, handleBoxCreated]);

  // 박스 삭제 핸들러 수정
  const handleRemoveBox = useCallback((boxId: string) => {
    if (!file) return;
    
    console.log('RemoveBox - 박스 삭제:', { boxId, fileName: file.name });
    
    try {
      // useLayerManager의 removeBox만 사용
      removeBox(file.name, boxId);
      
      // 선택된 박스 초기화
      if (selectedBox?.id === boxId) {
        setSelectedBox(null);
        setBoxImage(null);
      }
    } catch (error) {
      console.error('RemoveBox - Error removing box:', error);
    }
  }, [file, selectedBox, removeBox, setSelectedBox]);

  // 박스 업데이트 핸들러 수정
  const handleUpdateBox = useCallback((boxId: string, updates: Partial<Box>) => {
    if (!file || !activeLayer) return;
    
    console.log('UpdateBox - Attempting to update box:', {
      boxId,
      updates,
      fileName: file.name,
      activeLayerId: activeLayer.id
    });

    try {
      updateBox(boxId, updates);
      // 박스 크기나 위치가 변경된 경우 캐시된 이미지 삭제
      if (updates.x !== undefined || updates.y !== undefined || 
          updates.width !== undefined || updates.height !== undefined) {
        capturedBoxes.delete(boxId);
      }
      setIsBoxEditorOpen(false);
      setEditingBox(null);
    } catch (error) {
      console.error('UpdateBox - Error updating box:', error);
    }
  }, [file, activeLayer, updateBox]);

  // 페이지 변경 시 데이터 초기화 확인
  const handlePageChange = useCallback((newPage: number) => {
    const validatedPage = Math.max(1, Math.min(newPage, numPages));
    if (validatedPage === pageNumber) return;
    
    console.log('PageChange - Changing to page:', {
      from: pageNumber,
      to: validatedPage,
      numPages
    });
    
    setPageNumber(validatedPage);
  }, [pageNumber, numPages]);

  // PDF 로드 완료 시 모든 페이지 데이터 초기화
  const handlePDFLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('PDFLoadSuccess - PDF loaded with pages:', numPages);
    
    setNumPages(numPages);
    
    if (file && currentDocument) {
      // 모든 페이지에 대해 데이터 초기화
      for (let i = 1; i <= numPages; i++) {
        const pageData = getPageData(file.name, i);
        if (!pageData) {
          console.log('PDFLoadSuccess - Initializing page data for page:', i);
          initializeDocumentPage(file.name, i);
        }
      }

      updateDocument(currentDocument.id, {
        ...currentDocument,
        pageCount: numPages,
        status: 'ready'
      });
    }
  }, [file, currentDocument, updateDocument, initializeDocumentPage, getPageData]);

  // 스크롤 모드에서 보이는 페이지 업데이트
  useEffect(() => {
    if (!isScrollMode || !containerRef.current) return;

    const container = containerRef.current;
    const handleScroll = () => {
      if (!container) return;

      const { scrollTop, clientHeight } = container;
      const pageElements = container.querySelectorAll('.pdf-page-container');
      const newVisiblePages: number[] = [];

      pageElements.forEach((element: Element) => {
        const rect = element.getBoundingClientRect();
        const pageNum = parseInt(element.getAttribute('data-page') || '1');
        
        if (rect.top < clientHeight && rect.bottom > 0) {
          newVisiblePages.push(pageNum);
        }
      });

      if (newVisiblePages.length > 0) {
        setVisiblePages(newVisiblePages);
        setPageNumber(newVisiblePages[0]);
      }
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [isScrollMode, setVisiblePages]);

  // 박스 편집 핸들러
  const handleEditBox = useCallback((box: Box) => {
    setEditingBox(box);
    setIsBoxEditorOpen(true);
  }, []);

  // 캡처 관련 상태 추가
  const [isCapturing, setIsCapturing] = useState(false);
  const [boxImage, setBoxImage] = useState<string | null>(null);
  const [capturedBoxes] = useState(() => new Map<string, string>()); // boxId -> imageUrl 매핑
  const [selectedBoxForCapture, setSelectedBoxForCapture] = useState<Box | null>(null);

  // PDF 좌표 변환 유틸리티 함수 추가
  const convertToServerCoordinates = useCallback((box: Box) => {
    // PDF 기본 크기 (A4)
    const PDF_WIDTH = 595.276; // PDF 포인트 단위
    const PDF_HEIGHT = 841.89; // PDF 포인트 단위

    // 뷰포트 좌표를 PDF 좌표로 변환
    const pdfX = (box.x * PDF_WIDTH) / pdfDimensions.baseWidth;
    const pdfY = PDF_HEIGHT - ((box.y * PDF_HEIGHT) / pdfDimensions.baseHeight) - ((box.height * PDF_HEIGHT) / pdfDimensions.baseHeight);
    const pdfWidth = (box.width * PDF_WIDTH) / pdfDimensions.baseWidth;
    const pdfHeight = (box.height * PDF_HEIGHT) / pdfDimensions.baseHeight;

    console.log('좌표 변환:', {
      original: {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height
      },
      converted: {
        x: pdfX,
        y: pdfY,
        width: pdfWidth,
        height: pdfHeight
      },
      scale,
      dimensions: {
        pdf: { width: PDF_WIDTH, height: PDF_HEIGHT },
        viewport: { width: pdfDimensions.baseWidth, height: pdfDimensions.baseHeight }
      }
    });

    return {
      x: Math.round(pdfX),
      y: Math.round(pdfY),
      width: Math.round(pdfWidth),
      height: Math.round(pdfHeight)
    };
  }, [pdfDimensions, scale]);

  // 캡처 함수 수정
  const captureBoxArea = useCallback(async (targetBox: Box, forceCapture: boolean = false) => {
    if (!file || !targetBox) {
      console.warn('필수 정보가 누락되었습니다:', { file, targetBox });
      return;
    }

    // 이미 캡처된 박스인지 확인
    const existingImage = capturedBoxes.get(targetBox.id);
    if (existingImage && !forceCapture) {
      console.log('이미 캡처된 박스입니다. 캐시된 이미지를 사용합니다:', targetBox.id);
      setBoxImage(existingImage);
      return;
    }

    try {
      setIsCapturing(true);

      // 박스 좌표를 PDF 좌표계로 변환
      const pdfCoordinates = convertToServerCoordinates(targetBox);

      console.log('캡처 요청 데이터:', {
        box_id: targetBox.id,
        original: {
          x: targetBox.x,
          y: targetBox.y,
          width: targetBox.width,
          height: targetBox.height,
        },
        converted: pdfCoordinates,
        scale,
        viewer: {
          width: pdfDimensions.width,
          height: pdfDimensions.height,
          baseWidth: pdfDimensions.baseWidth,
          baseHeight: pdfDimensions.baseHeight
        }
      });

      const response = await fetch(API_ENDPOINTS.CAPTURE_BOX(file.name, targetBox.pageNumber), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          box_id: targetBox.id,
          ...pdfCoordinates,
          viewer_width: Math.round(pdfDimensions.baseWidth),
          viewer_height: Math.round(pdfDimensions.baseHeight),
          scale: scale
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '알 수 없는 오류가 발생했습니다.' }));
        throw new Error(errorData.detail || '캡처 요청 실패');
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('빈 이미지가 반환되었습니다.');
      }

      const imageUrl = URL.createObjectURL(blob);
      setBoxImage(imageUrl);
      capturedBoxes.set(targetBox.id, imageUrl); // 캡처된 이미지 캐시
      setSelectedBoxForCapture(targetBox);
    } catch (error) {
      console.error('PDF 영역 캡처 실패:', error);
      setBoxImage(null);
      capturedBoxes.delete(targetBox.id); // 에러 발생 시 캐시에서 제거
    } finally {
      setIsCapturing(false);
    }
  }, [file, scale, pdfDimensions, convertToServerCoordinates]);

  // 캡처 새로고침 핸들러 추가
  const handleRefreshCapture = useCallback((boxId: string) => {
    const box = selectedBox;
    if (box && box.id === boxId) {
      captureBoxArea(box, true); // forceCapture를 true로 설정하여 강제로 새로 캡처
    }
  }, [selectedBox, captureBoxArea]);

  return (
    <div className="flex flex-col items-center p-4 min-h-screen" ref={containerRef}>
      {!file && <PDFDropzone onFileUpload={handleFileUpload} />}

      {file && (
        <>
          <div className="flex flex-row w-full h-full">
            {/* 왼쪽 레이어 관리 사이드바 */}
            <div className={`fixed left-0 top-0 h-full bg-white shadow-lg transition-all duration-300 z-50 ${isLayerSidebarOpen ? 'w-80' : 'w-0'}`}>
              <div className="flex flex-col h-full">
                <div className="p-4 border-b flex justify-between items-center">
                  <h2 className="text-lg font-semibold">레이어 관리</h2>
                  <button
                    onClick={() => setIsLayerSidebarOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    ✕
                  </button>
                </div>
                
                {/* 레이어 목록 */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    <button
                      onClick={() => addLayer('새 레이어')}
                      className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      + 새 레이어
                    </button>
                    
                    {layers.map(layer => (
                      <div
                        key={layer.id}
                        className={`p-3 rounded border ${
                          activeLayer?.id === layer.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={layer.isVisible}
                              onChange={() => toggleLayerVisibility(layer.id)}
                              className="w-4 h-4"
                            />
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: layer.color }}
                            />
                            <span>{layer.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setActiveLayer(layer);
                                setIsBoxDetailOpen(true);
                              }}
                              className="text-blue-700 hover:bg-blue-100 hover:text-blue-700 transition-colors duration-200"
                            >
                              관리
                            </button>
                            <button
                              onClick={() => removeLayer(layer.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setActiveLayer(layer)}
                            className={`flex-1 px-2 py-1 rounded text-sm ${
                              activeLayer?.id === layer.id
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                          >
                            선택
                          </button>
                          <button
                            onClick={() => duplicateLayer(layer.id)}
                            className="flex-1 px-2 py-1 rounded text-sm bg-gray-100 hover:bg-gray-200"
                          >
                            복제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 메인 콘텐츠 */}
            <div className={`flex-1 transition-all duration-300 ${isLayerSidebarOpen ? 'ml-80' : 'ml-0'} ${isSidebarOpen ? 'mr-80' : 'mr-0'}`}>
              {/* 상단 툴바 */}
              <div className="sticky top-0 z-10 bg-white shadow-sm mb-4">
                <div className="flex items-center justify-between p-4">
                  <button
                    onClick={() => setIsLayerSidebarOpen(!isLayerSidebarOpen)}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    {isLayerSidebarOpen ? '◀' : '▶'}
                  </button>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handlePageChange(pageNumber - 1)}
                      disabled={pageNumber <= 1}
                      className="px-4 py-2 bg-gray-100 rounded disabled:opacity-50"
                    >
                      이전
                    </button>
                    <span>
                      {pageNumber} / {numPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(pageNumber + 1)}
                      disabled={pageNumber >= numPages}
                      className="px-4 py-2 bg-gray-100 rounded disabled:opacity-50"
                    >
                      다음
                    </button>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    {isSidebarOpen ? '▶' : '◀'}
                  </button>
                </div>
              </div>

              {/* PDF 뷰어 */}
              <Document
                file={file}
                onLoadSuccess={handlePDFLoadSuccess}
                className="mx-auto"
              >
                {isScrollMode ? (
                  visiblePages.map(renderPage)
                ) : (
                  renderPage(pageNumber)
                )}
              </Document>
            </div>

            {/* 오른쪽 문서 정보 사이드바 */}
            <div className={`fixed right-0 top-0 h-full bg-white shadow-lg transition-all duration-300 z-50 ${isSidebarOpen ? 'w-80' : 'w-0'}`}>
              <div className="flex flex-col h-full">
                <div className="p-4 border-b flex justify-between items-center">
                  <h2 className="text-lg font-semibold">문서 정보</h2>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                  {/* 문서 정보 */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <h3 className="font-medium mb-2">기본 정보</h3>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">파일명:</span> {file.name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="font-medium">페이지:</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handlePageChange(pageNumber - 1)}
                              disabled={pageNumber <= 1}
                              className="px-2 py-1 bg-gray-100 rounded text-xs disabled:opacity-50"
                            >
                              ◀
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={numPages}
                              value={pageNumber}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                if (value >= 1 && value <= numPages) {
                                  handlePageChange(value);
                                }
                              }}
                              className="w-16 px-2 py-1 border rounded text-center text-xs"
                            />
                            <span className="text-xs">/ {numPages}</span>
                            <button
                              onClick={() => handlePageChange(pageNumber + 1)}
                              disabled={pageNumber >= numPages}
                              className="px-2 py-1 bg-gray-100 rounded text-xs disabled:opacity-50"
                            >
                              ▶
                            </button>
                          </div>
                        </div>
                        <p><span className="font-medium">생성일:</span> {currentDocument?.createdAt ? new Date(currentDocument.createdAt).toLocaleString() : '-'}</p>
                        <p><span className="font-medium">수정일:</span> {currentDocument?.updatedAt ? new Date(currentDocument.updatedAt).toLocaleString() : '-'}</p>
                      </div>
                    </div>

                    {/* 보기 설정 */}
                    <div className="bg-white p-3 rounded border">
                      <h3 className="font-medium mb-2">보기 설정</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">확대/축소</span>
                          <div className="flex items-center gap-2">
                            <select
                              value={Math.round(scale * 100)}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                setScale(value / 100);
                              }}
                              className="px-2 py-1 border rounded text-sm"
                            >
                              <option value="50">50%</option>
                              <option value="75">75%</option>
                              <option value="100">100%</option>
                              <option value="125">125%</option>
                              <option value="150">150%</option>
                              <option value="175">175%</option>
                              <option value="200">200%</option>
                            </select>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => setScale(prev => Math.max(0.5, prev - 0.25))}
                                className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                                title="25% 축소"
                              >
                                -
                              </button>
                              <button
                                onClick={() => setScale(prev => Math.min(2, prev + 0.25))}
                                className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                                title="25% 확대"
                              >
                                +
                              </button>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => setScale(1)}
                                className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 text-xs"
                                title="기본 크기로 설정 (100%)"
                              >
                                맞춤
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">스크롤 모드</span>
                          <button
                            onClick={() => setIsScrollMode(!isScrollMode)}
                            className={`px-3 py-1 rounded text-sm ${
                              isScrollMode ? 'bg-blue-500 text-white' : 'bg-gray-100'
                            }`}
                          >
                            {isScrollMode ? '켜짐' : '꺼짐'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 현재 페이지 박스 정보 */}
                    <div className="bg-white p-3 rounded border mt-4">
                      <h3 className="font-medium mb-2">현재 페이지 박스 정보</h3>
                      <div className="space-y-2">
                        {file && getPageData(file.name, pageNumber)?.boxes
                          .filter(box => box.pageNumber === pageNumber)
                          .map((box: Box) => (
                          <div key={box.id} className="text-sm p-2 bg-gray-50 rounded">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">
                                {box.text ? `${box.text.substring(0, 20)}${box.text.length > 20 ? '...' : ''}` : '(텍스트 없음)'}
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEditBox(box)}
                                  className="text-blue-500 hover:text-blue-700 text-xs"
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() => handleRemoveBox(box.id)}
                                  className="text-red-500 hover:text-red-700 text-xs"
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              크기: {Math.round(box.width / scale)}×{Math.round(box.height / scale)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* LayerBoxManager */}
            {isBoxDetailOpen && activeLayer && (
              <LayerBoxManager
                isOpen={isBoxDetailOpen}
                onClose={() => setIsBoxDetailOpen(false)}
                layers={layers}
                activeLayer={activeLayer}
                selectedBox={selectedBox}
                onLayerSelect={(layerId) => {
                  const layer = layers.find(l => l.id === layerId);
                  if (layer) setActiveLayer(layer);
                }}
                onLayerAdd={() => addLayer('새 레이어')}
                onLayerDelete={removeLayer}
                onLayerVisibilityToggle={toggleLayerVisibility}
                onLayerNameChange={updateLayerName}
                onLayerColorChange={updateLayerColor}
                onMoveBoxToLayer={moveBoxToLayer}
                onDuplicateLayer={duplicateLayer}
                onMergeLayers={mergeLayer}
                onExportLayer={exportLayer}
                onImportLayer={importLayer}
                isDrawMode={toolState.isDrawMode}
                onToggleDrawMode={toolActions.onToggleDrawMode}
                isDrawingArrow={isDrawingArrow}
                onToggleArrowDrawing={() => setIsDrawingArrow(!isDrawingArrow)}
                connections={[]}
                onConnectionDelete={deleteConnection}
                onConnectionAdd={addConnection}
                layer={activeLayer}
                documentName={file.name}
                getPageData={getPageData}
                numPages={numPages}
                onBoxSelect={setSelectedBox}
                onBoxDelete={handleRemoveBox}
                onBoxUpdate={handleUpdateBox}
                onBoxesUpload={() => {}}
                setIsBoxDetailOpen={setIsBoxDetailOpen}
                setOriginalBox={setOriginalBox}
                setPageNumber={setPageNumber}
                updateGroupBox={() => {}}
                removeGroupBox={() => {}}
                getGroupBoxes={() => []}
                createGroupBox={() => {}}
                selectedBoxes={[]}
                onBoxesSelect={() => {}}
                isMultiSelectMode={toolState.isMultiSelectMode}
                onMultiSelectModeChange={toolActions.onToggleMultiSelect}
                edges={[]}
                onEdgeAdd={addConnection}
                onEdgeDelete={deleteConnection}
                onEdgeUpdate={updateConnection}
                scale={scale}
                currentPage={pageNumber}
                addBox={handleAddBox}
                removeBox={handleRemoveBox}
                updateBox={handleUpdateBox}
              />
            )}
          </div>

          {/* 도구 모음 - 메인 콘텐츠 밖으로 이동 */}
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-3 flex gap-3 z-[9999]">
            <div className="flex items-center gap-3 border-r pr-3">
              <button
                onClick={toolActions.onToggleDrawMode}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  toolState.isDrawMode 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } transition-colors`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>박스 그리기</span>
              </button>
              <button
                onClick={() => setIsDrawingArrow(!isDrawingArrow)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  isDrawingArrow 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } transition-colors`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <span>연결선 그리기</span>
              </button>
              <button
                onClick={toolActions.onToggleMultiSelect}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  toolState.isMultiSelectMode 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } transition-colors`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16M4 12h16m-7 7h7" />
                </svg>
                <span>다중 선택</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))}
                className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                </svg>
                <span>축소</span>
              </button>
              <span className="min-w-[80px] text-center font-medium">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale(prev => Math.min(2, prev + 0.1))}
                className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>확대</span>
              </button>
            </div>
            {selectedBoxIds.size > 0 && (
              <button
                onClick={handleMultipleDelete}
                className="px-3 py-1.5 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                선택한 박스 삭제 ({selectedBoxIds.size})
              </button>
            )}
          </div>

          {/* 박스 편집기 */}
          {isBoxEditorOpen && editingBox && (
            <BoxDetailEditor
              box={editingBox}
              originalBox={originalBox}
              onUpdate={(boxId: string, updates: Partial<Box>) => handleUpdateBox(boxId, updates)}
              onCancel={() => {
                setIsBoxEditorOpen(false);
                setEditingBox(null);
              }}
              onDelete={(boxId: string) => handleRemoveBox(boxId)}
              pageNumber={pageNumber}
              documentName={file.name}
              viewerWidth={pdfDimensions.width}
              viewerHeight={pdfDimensions.height}
              layers={layers}
              isOpen={isBoxEditorOpen}
              position={{ x: 500, y: 100 }}
              onPositionChange={(newPosition: { x: number; y: number }) => {
                console.log('박스 위치 변경:', newPosition);
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PDFViewer; 