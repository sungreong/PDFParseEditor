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
import BoxEditor from '@/features/box/components/BoxEditor';

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
    setCanvasRef,
    updateLayerName,
    updateLayerColor,
    moveBoxToLayer,
    duplicateLayer,
    mergeLayer,
    clearLayer,
    exportLayer,
    importLayer,
  } = useLayerManager();

  // PDF 업로드 관리
  const { uploadPDF, isUploading, uploadError } = usePDFUpload();

  // 모든 박스 정보 가져오기
  const allBoxes = useMemo(() => {
    if (!file || !activeLayer) return [];
    
    const pageData = getPageData(file.name, pageNumber);
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

  // boxesByPage Map을 관리하는 로직 추가
  const [boxesByPage] = useState(() => new Map<number, Box[]>());

  // 페이지별 박스 데이터 관리 함수
  const updateBoxesByPage = useCallback((box: Box, action: 'add' | 'remove' | 'update') => {
    if (!file) return;

    boxesByPage.set(box.pageNumber, 
      action === 'remove' 
        ? (boxesByPage.get(box.pageNumber) || []).filter(b => b.id !== box.id)
        : action === 'update'
          ? (boxesByPage.get(box.pageNumber) || []).map(b => b.id === box.id ? box : b)
          : [...(boxesByPage.get(box.pageNumber) || []), box]
    );
  }, [file, boxesByPage]);

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

  // 박스 영역의 텍스트 추출 함수
  const extractTextFromBox = useCallback((pageNumber: number, boxRect: { left: number; right: number; top: number; bottom: number }) => {
    const pageTextContent = pageTextContents[pageNumber];
    if (!pageTextContent) return { text: '', textItems: [] };

    const textItems: TextItem[] = [];
    let extractedText = '';

    pageTextContent.forEach(item => {
      const itemX = item.x;
      const itemY = item.y;
      const itemWidth = item.width;
      const itemHeight = item.height;

      // 텍스트 아이템이 박스 영역과 겹치는지 확인
      if (
        itemX >= boxRect.left &&
        itemX + itemWidth <= boxRect.right &&
        itemY >= boxRect.top &&
        itemY + itemHeight <= boxRect.bottom
      ) {
        textItems.push({
          text: item.text,
          x: itemX,
          y: itemY,
          width: itemWidth,
          height: itemHeight,
          transform: item.transform
        });
        extractedText += item.text + ' ';
      }
    });

    // 텍스트 위치를 y좌표 기준으로 정렬
    textItems.sort((a, b) => {
      const yDiff = Math.abs(a.y - b.y);
      if (yDiff < 5) { // 같은 줄로 간주
        return a.x - b.x;
      }
      return a.y - b.y;
    });

    return {
      text: extractedText.trim(),
      textItems
    };
  }, [pageTextContents]);

  // 박스 추가 핸들러
  const handleAddBox = useCallback((box: Box) => {
    if (!file || !activeLayer) {
      console.log('AddBox - Early return:', { hasFile: !!file, hasActiveLayer: !!activeLayer });
      return;
    }
    
    const pageNumber = box.pageNumber;
    
    console.log('AddBox - Attempting to add box:', {
      box,
      fileName: file.name,
      activeLayerId: activeLayer.id,
      pageNumber
    });

    try {
      // 페이지별 박스 데이터 업데이트
      const currentBoxes = boxesByPage.get(pageNumber) || [];
      boxesByPage.set(pageNumber, [...currentBoxes, box]);
      
      // 전체 박스 데이터에 추가
      addBox(file.name, box);
      
      
      return box;
    } catch (error) {
      console.error('AddBox - Error adding box:', error);
      return null;
    }
  }, [file, activeLayer, boxesByPage, addBox]);

  // 박스 생성 핸들러
  const handleBoxCreated = useCallback((box: DrawingBox) => {
    if (!file || !activeLayer) return;
    
    const newBox: Box = {
      id: `box_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 고유한 ID 생성
      layerId: activeLayer.id,
      pageNumber: box.pageNumber,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      type: 'box',
      color: activeLayer.color,
      text: '',
      textItems: [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    // 박스 추가
    handleAddBox(newBox);
    setCurrentBox(null);
    setStartPoint(null);
    
    // 새로 생성된 박스 선택
    setSelectedBox(newBox);
  }, [file, activeLayer, handleAddBox, setSelectedBox]);

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
            onGetTextSuccess={(textContent) => {
              const textItems = textContent.items.map((item: any) => ({
                text: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width,
                height: item.height,
                transform: item.transform
              }));
              setPageTextContents(prev => ({
                ...prev,
                [pageNum]: textItems
              }));
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
            .filter(box => box.pageNumber === pageNum)  // 현재 페이지의 박스만 필터링
            .map(box => {
              console.log('Rendering box:', { 
                boxId: box.id, 
                pageNum, 
                boxPageNumber: box.pageNumber,
                box: box
              });
              const layer = layers.find(l => l.id === box.layerId);
              if (!layer?.isVisible) return null;
              
              return (
                <div
                  key={box.id}
                  className={`absolute border-2 ${selectedBox?.id === box.id ? 'ring-2 ring-blue-500' : ''}`}
                  style={{
                    left: `${box.x * scale}px`,
                    top: `${box.y * scale}px`,
                    width: `${box.width * scale}px`,
                    height: `${box.height * scale}px`,
                    borderColor: box.color || layer.color,
                    backgroundColor: `${box.color || layer.color}20`,
                    cursor: isDrawingArrow ? 'crosshair' : 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDrawingArrow) {
                      if (!startBox) {
                        setStartBox(box);
                      } else if (box.pageNumber === startBox.pageNumber) {
                        addConnection(startBox, box);
                        setStartBox(null);
                        setIsDrawingArrow(false);
                      }
                    } else {
                      setSelectedBox(box);
                      setIsBoxDetailOpen(true);
                    }
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

  // 박스 그리기 완료 및 텍스트 추출
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
      try {
        // 박스 영역 계산
        const boxRect = {
          left: Math.min(startPoint.x, x),
          right: Math.max(startPoint.x, x),
          top: Math.min(startPoint.y, y),
          bottom: Math.max(startPoint.y, y)
        };

        // 현재 페이지의 저장된 텍스트 데이터 가져오기
        const pageTextContent = pageTextContents[pageNum];
        if (!pageTextContent) {
          console.warn('페이지의 텍스트 데이터가 없습니다:', pageNum);
          return;
        }

        // 박스 영역 내의 텍스트 필터링
        let extractedText = '';
        const textItems: TextItem[] = [];

        pageTextContent.forEach(item => {
          const itemX = item.x;
          const itemY = item.y;
          const itemWidth = item.width;
          const itemHeight = item.height;

          // 텍스트 아이템이 박스 영역과 겹치는지 확인
          if (
            itemX >= boxRect.left &&
            itemX + itemWidth <= boxRect.right &&
            itemY >= boxRect.top &&
            itemY + itemHeight <= boxRect.bottom
          ) {
            textItems.push({
              text: item.text,
              x: itemX,
              y: itemY,
              width: itemWidth,
              height: itemHeight,
              transform: item.transform
            });
            extractedText += item.text + ' ';
          }
        });

        // 텍스트 위치를 y좌표 기준으로 정렬
        textItems.sort((a, b) => {
          const yDiff = Math.abs(a.y - b.y);
          if (yDiff < 5) { // 같은 줄로 간주
            return a.x - b.x;
          }
          return a.y - b.y;
        });

        // 정렬된 순서로 텍스트 재구성
        extractedText = textItems.map(item => item.text).join(' ');

        const newBox: Box = {
          id: `box_${Date.now()}`,
          layerId: activeLayer.id,
          pageNumber: pageNum,
          x: boxRect.left,
          y: boxRect.top,
          width,
          height,
          type: 'box',
          color: activeLayer.color,
          text: extractedText.trim(),
          textItems,  // 텍스트 아이템 정보 저장
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            extractedAt: new Date().toISOString()
          }
        };

        console.log('박스 생성:', {
          box: newBox,
          textItems,
          extractedText: extractedText.trim()
        });

        handleBoxCreated(newBox);
      } catch (error) {
        console.error('텍스트 추출 중 오류 발생:', error);
        // 에러가 발생해도 박스는 생성
        const newBox: Box = {
          id: `box_${Date.now()}`,
          layerId: activeLayer.id,
          pageNumber: pageNum,
          x: Math.min(startPoint.x, x),
          y: Math.min(startPoint.y, y),
          width,
          height,
          type: 'box',
          color: activeLayer.color,
          text: '',
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        };
        handleBoxCreated(newBox);
      }
    }

    setStartPoint(null);
    setCurrentBox(null);
  }, [toolState.isDrawMode, startPoint, currentBox, activeLayer, file, scale, handleBoxCreated, pageTextContents]);

  // 박스 삭제 핸들러 수정
  const handleRemoveBox = useCallback((boxId: string) => {
    if (!file || !selectedBox) return;
    
    const pageNum = selectedBox.pageNumber;
    const currentBoxes = boxesByPage.get(pageNum) || [];
    const box = currentBoxes.find(b => b.id === boxId);
    
    if (box) {
      // 페이지별 박스 데이터에서 제거
      const updatedBoxes = currentBoxes.filter(b => b.id !== boxId);
      boxesByPage.set(pageNum, updatedBoxes);
      
      // 전체 박스 데이터에서 제거
      removeBox(file.name, boxId);
      
      // 선택된 박스 초기화
      if (selectedBox.id === boxId) {
        setSelectedBox(null);
      }
      
    }
  }, [file, selectedBox, boxesByPage, removeBox, setSelectedBox]);

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
                              className="text-blue-500 hover:text-blue-700"
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
          </div>

          {/* 박스 편집기 */}
          {isBoxEditorOpen && editingBox && (
            <BoxEditor
              box={editingBox}
              onSave={(updates) => handleUpdateBox(editingBox.id, updates)}
              onCancel={() => {
                setIsBoxEditorOpen(false);
                setEditingBox(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PDFViewer; 