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
import PDFToolbar from './toolbar/PDFToolbar';
import DocumentSidebar from './sidebar/DocumentSidebar';
import PDFContent from './content/PDFContent';
import LayerSidebar from './sidebar/LayerSidebar';
import { useLayerSidebarManager } from '@/features/layer/hooks/useLayerSidebarManager';

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

// Edge 타입 수정
interface Edge {
  id: string;
  startBoxId: string;
  endBoxId: string;
  layerId: string;
  pageNumber: number;
  type: 'arrow';
  color: string;
}

// PageEdges 타입 정의
interface PageEdges {
  [pageNumber: number]: {
    [layerId: string]: Edge[];
  };
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
  const [isAutoConnectMode, setIsAutoConnectMode] = useState(false);
  // 페이지별 엣지 상태 추가
  const [pageEdges, setPageEdges] = useState<PageEdges>({});

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
    setNumPages,
    setPageNumber,
    setScale,
    setIsScrollMode,
    setVisiblePages,
    setIsSidebarOpen,
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

  // 박스 자동 연결 핸들러 추가
  const handleAutoConnect = useCallback((newBox: Box) => {
    if (!isAutoConnectMode || !activeLayer || !file) return;

    const pageData = getPageData(file.name, newBox.pageNumber);
    if (!pageData) return;

    // 새로 그려진 박스 내부에 있는 기존 박스들을 찾습니다
    const containedBoxes = pageData.boxes.filter(box => 
      box.id !== newBox.id &&
      box.layerId === activeLayer.id &&
      box.pageNumber === newBox.pageNumber &&
      box.x >= newBox.x &&
      box.y >= newBox.y &&
      (box.x + box.width) <= (newBox.x + newBox.width) &&
      (box.y + box.height) <= (newBox.y + newBox.height)
    );

    if (containedBoxes.length === 0) {
      // 내부 박스가 없는 경우 큰 박스만 제거
      removeBox(file.name, newBox.id);
      return;
    }

    // 박스들을 y좌표 기준으로 정렬 (위에서 아래로)
    const sortedBoxes = containedBoxes.sort((a, b) => a.y - b.y);

    // 현재 페이지의 기존 엣지들
    const existingEdges = pageEdges[newBox.pageNumber]?.[activeLayer.id] || [];
    let newEdgesCount = 0;

    // 연결선 생성
    for (let i = 0; i < sortedBoxes.length - 1; i++) {
      const startBox = sortedBoxes[i];
      const endBox = sortedBoxes[i + 1];

      // 중복 엣지 체크
      const isDuplicate = existingEdges.some(edge => 
        (edge.startBoxId === startBox.id && edge.endBoxId === endBox.id) ||
        (edge.startBoxId === endBox.id && edge.endBoxId === startBox.id)
      );

      if (!isDuplicate) {
        const newEdge: Edge = {
          id: `edge_${Date.now()}_${i}`,
          startBoxId: startBox.id,
          endBoxId: endBox.id,
          layerId: activeLayer.id,
          pageNumber: newBox.pageNumber,
          type: 'arrow',
          color: activeLayer.color
        };

        setPageEdges(prev => ({
          ...prev,
          [newBox.pageNumber]: {
            ...prev[newBox.pageNumber],
            [activeLayer.id]: [
              ...(prev[newBox.pageNumber]?.[activeLayer.id] || []),
              newEdge
            ]
          }
        }));
        newEdgesCount++;
      }
    }

    // 연결선 생성 후 큰 박스 제거
    removeBox(file.name, newBox.id);

    // 성공 메시지 표시 (새로 생성된 엣지가 있는 경우에만)
    if (newEdgesCount > 0) {
      const popup = document.createElement('div');
      popup.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-100 border border-green-400 text-green-700 px-6 py-3 rounded shadow-lg z-[9999] flex items-center gap-2';
      popup.innerHTML = `
        <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span class="font-medium">${newEdgesCount}개의 연결선이 자동으로 생성되었습니다</span>
      `;
      
      document.body.appendChild(popup);
      setTimeout(() => {
        popup.classList.add('opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => document.body.removeChild(popup), 300);
      }, 1500);
    }
  }, [isAutoConnectMode, activeLayer, file, getPageData, removeBox, pageEdges]);

  // 박스 생성 핸들러 추가
  const handleBoxCreated = useCallback((box: DrawingBox) => {
    if (!file || !activeLayer) return;

    // 박스 ID 생성
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
    const pageTextContent = pageTextContents[box.pageNumber] || [];
    const textItems: TextItem[] = [];
    
    // PDF 기본 크기 (A4)
    const PDF_WIDTH = 595.276; // PDF 포인트 단위
    const PDF_HEIGHT = 841.89; // PDF 포인트 단위

    // 뷰포트와 PDF 사이의 스케일 계산
    const viewportToPDFScaleX = PDF_WIDTH / pdfDimensions.baseWidth;
    const viewportToPDFScaleY = PDF_HEIGHT / pdfDimensions.baseHeight;

    // 박스 영역을 스케일 독립적인 좌표로 변환
    const normalizedBoxArea = {
      left: normalizedBox.x * scale,
      right: (normalizedBox.x + normalizedBox.width) * scale,
      top: normalizedBox.y * scale,
      bottom: (normalizedBox.y + normalizedBox.height) * scale
    };

    // 각 텍스트 아이템 처리
    pageTextContent.forEach((item: any) => {
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

        // 겹침 비율 임계값을 낮춤 (0.2)
        if (overlapRatio > 0.2) {
          textItems.push({
            text: item.str,
            x: baseViewportX,
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
      const lineThreshold = Math.min(a.height, b.height) * scale;
      const yDiff = Math.abs(a.y - b.y);

      if (yDiff <= lineThreshold) {
        return a.x - b.x; // 같은 줄에서는 왼쪽에서 오른쪽으로
      }
      return a.y - b.y; // 다른 줄은 위에서 아래로
    });

    // 정렬된 텍스트 조합
    normalizedBox.text = textItems
      .map(item => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    normalizedBox.textItems = textItems;

    console.log('추출된 텍스트:', {
      text: normalizedBox.text,
      itemCount: textItems.length,
      items: textItems.map(item => ({
        text: item.text,
        position: {
          x: item.x * scale,
          y: item.y * scale
        }
      }))
    });

    // 박스 추가
    const newBox = addBox(file.name, normalizedBox);
    
    // 자동 연결 모드가 활성화되어 있다면 자동 연결 실행
    if (isAutoConnectMode && newBox) {
      handleAutoConnect(newBox);
    }

    return newBox;
  }, [file, activeLayer, scale, pdfDimensions, pageTextContents, addBox, generateBoxId, isAutoConnectMode, handleAutoConnect]);

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

  // 페이지별 엣지 상태 관리
  const [isDrawingEdge, setIsDrawingEdge] = useState(false);
  const [edgeStartBox, setEdgeStartBox] = useState<Box | null>(null);
  const [tempEndPoint, setTempEndPoint] = useState<Point | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isSelectingEdge, setIsSelectingEdge] = useState(false);

  // 엣지 추가 핸들러
  const handleAddEdge = useCallback((startBox: Box, endBox: Box) => {
    if (!activeLayer || startBox.pageNumber !== endBox.pageNumber) return;

    // 현재 페이지의 엣지들 확인
    const currentPageEdges = pageEdges[startBox.pageNumber]?.[activeLayer.id] || [];
    
    // 중복 엣지 체크
    const isDuplicate = currentPageEdges.some(edge => 
      (edge.startBoxId === startBox.id && edge.endBoxId === endBox.id) ||
      (edge.startBoxId === endBox.id && edge.endBoxId === startBox.id)
    );

    // 중복된 엣지가 있으면 생성하지 않음
    if (isDuplicate) {
      // 중복 알림 메시지 표시
      const popup = document.createElement('div');
      popup.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-3 rounded shadow-lg z-[9999] flex items-center gap-2';
      popup.innerHTML = `
        <svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span class="font-medium">이미 존재하는 연결선입니다</span>
      `;
      
      document.body.appendChild(popup);
      setTimeout(() => {
        popup.classList.add('opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => document.body.removeChild(popup), 300);
      }, 1500);
      
      return;
    }

    const newEdge: Edge = {
      id: `edge_${Date.now()}`,
      startBoxId: startBox.id,
      endBoxId: endBox.id,
      layerId: activeLayer.id,
      pageNumber: startBox.pageNumber,
      type: 'arrow',
      color: activeLayer.color
    };

    setPageEdges(prev => {
      const pageNumber = startBox.pageNumber;
      const layerId = activeLayer.id;
      
      return {
        ...prev,
        [pageNumber]: {
          ...prev[pageNumber],
          [layerId]: [...(prev[pageNumber]?.[layerId] || []), newEdge]
        }
      };
    });
  }, [activeLayer, pageEdges]);

  // 엣지 삭제 핸들러
  const handleRemoveEdge = useCallback((edgeId: string, pageNumber: number, layerId: string) => {
    setPageEdges(prev => {
      const updatedEdges = {
        ...prev,
        [pageNumber]: {
          ...prev[pageNumber],
          [layerId]: prev[pageNumber]?.[layerId]?.filter(edge => edge.id !== edgeId) || []
        }
      };

      return updatedEdges;
    });

    // 선택된 엣지였다면 선택 해제
    if (selectedEdgeId === edgeId) {
      setSelectedEdgeId(null);
    }
  }, [selectedEdgeId]);

  // 엣지 업데이트 핸들러
  const handleEdgeUpdate = useCallback((edgeId: string, updates: Partial<Edge>) => {
    setPageEdges(prev => {
      const newEdges = { ...prev };
      for (const pageNum in newEdges) {
        for (const layerId in newEdges[pageNum]) {
          const edgeIndex = newEdges[pageNum][layerId].findIndex(e => e.id === edgeId);
          if (edgeIndex !== -1) {
            newEdges[pageNum][layerId][edgeIndex] = {
              ...newEdges[pageNum][layerId][edgeIndex],
              ...updates
            };
            return newEdges;
          }
        }
      }
      return prev;
    });
  }, []);

  // 엣지 삭제 핸들러 래퍼 추가
  const handleEdgeDeleteWrapper = useCallback((edgeId: string) => {
    if (!activeLayer || !file) return;
    handleRemoveEdge(edgeId, pageNumber, activeLayer.id);
  }, [activeLayer, file, handleRemoveEdge, pageNumber]);

  // 박스 클릭 핸들러 수정
  const handleBoxClick = useCallback((box: Box, openDetail: boolean = false) => {
    if (isDrawingEdge) {
      if (!edgeStartBox) {
        // 시작 박스 설정
        setEdgeStartBox(box);
        setTempEndPoint(getBoxCenter(box));
      } else {
        if (box.id === edgeStartBox.id) {
          // 같은 박스를 다시 클릭하면 연결선 그리기 초기화
          setEdgeStartBox(null);
          setTempEndPoint(null);
        } else {
          // 다른 박스를 클릭하면 연결선 생성
          handleAddEdge(edgeStartBox, box);
          // 엣지 그리기 상태 초기화
          setEdgeStartBox(null);
          setTempEndPoint(null);
        }
      }
      return;
    }

    handleToolBoxSelect(box.id);
    if (openDetail) {
      setSelectedBox(box);
      setIsBoxDetailOpen(true);
    }
  }, [isDrawingEdge, edgeStartBox, handleAddEdge, handleToolBoxSelect, getBoxCenter]);

  // 페이지 변경 핸들러 수정
  const handlePageChange = useCallback((newPage: number) => {
    const validatedPage = Math.max(1, Math.min(newPage, numPages));
    if (validatedPage === pageNumber) return;
    
    console.log('PageChange - Changing to page:', {
      from: pageNumber,
      to: validatedPage,
      numPages
    });
    
    // 연결선 그리기 중이면 초기화
    if (isDrawingEdge) {
      setEdgeStartBox(null);
      setTempEndPoint(null);
    }
    
    setPageNumber(validatedPage);
  }, [pageNumber, numPages, isDrawingEdge]);

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

      // 페이지별 엣지 초기화
      setPageEdges(prev => {
        const newEdges: PageEdges = {};
        for (let i = 1; i <= numPages; i++) {
          newEdges[i] = prev[i] || {};
        }
        return newEdges;
      });

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
  // 엣지 렌더링 컴포넌트 수정
  const renderEdges = useCallback((pageNum: number) => {
    if (!activeLayer) return null;

    const pageBoxes = file ? getPageData(file.name, pageNum)?.boxes || [] : [];
    const currentPageEdges = pageEdges[pageNum]?.[activeLayer.id] || [];

    // 화살표와 선 크기 조정
    const arrowScale = Math.min(3, Math.max(1.5, 2 / scale));
    const arrowWidth = 20 * arrowScale;
    const arrowHeight = 16 * arrowScale;
    const strokeWidth = Math.max(4, 6 / scale);

    const handleEdgeClick = (edge: Edge, event: React.MouseEvent) => {
      event.stopPropagation();
      if (isSelectingEdge) {
        setSelectedEdgeId(edge.id);
      }
    };

    const handleDeleteClick = (edge: Edge, event: React.MouseEvent) => {
      event.stopPropagation();
      if (window.confirm('이 연결선을 삭제하시겠습니까?')) {
        handleEdgeDeleteWrapper(edge.id);
      }
    };

    return (
      <svg 
        className="absolute inset-0" 
        style={{ 
          width: '100%',
          height: '100%',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          zIndex: 20,
          pointerEvents: isSelectingEdge ? 'auto' : 'none',
          overflow: 'visible'
        }}
      >
        <defs>
          <marker
            id={`arrowhead-${pageNum}`}
            markerWidth={arrowWidth}
            markerHeight={arrowHeight}
            refX={arrowWidth - 3}
            refY={arrowHeight / 2}
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path
              d={`M 0 0 L ${arrowWidth} ${arrowHeight/2} L 0 ${arrowHeight} z`}
              fill={activeLayer.color}
            />
          </marker>
          <marker
            id={`arrowhead-selected-${pageNum}`}
            markerWidth={arrowWidth}
            markerHeight={arrowHeight}
            refX={arrowWidth - 3}
            refY={arrowHeight / 2}
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path
              d={`M 0 0 L ${arrowWidth} ${arrowHeight/2} L 0 ${arrowHeight} z`}
              fill="#3B82F6"
            />
          </marker>
        </defs>
        
        {currentPageEdges.map(edge => {
          const startBox = pageBoxes.find(box => box.id === edge.startBoxId);
          const endBox = pageBoxes.find(box => box.id === edge.endBoxId);
          
          if (!startBox || !endBox) return null;

          const startPoint = getBoxCenter(startBox);
          const endPoint = getBoxCenter(endBox);
          const isSelected = selectedEdgeId === edge.id;

          // 선의 중간점 계산
          const midPoint = {
            x: (startPoint.x + endPoint.x) / 2,
            y: (startPoint.y + endPoint.y) / 2
          };

          // 삭제 버튼의 크기 계산
          const deleteButtonSize = 24 / scale;
          const deleteButtonRadius = deleteButtonSize / 2;

          return (
            <g key={edge.id} onClick={(e) => handleEdgeClick(edge, e)}>
              {/* 선택된 엣지의 강조 효과 */}
              {isSelected && (
                <>
                  {/* 배경 글로우 */}
                  <line
                    x1={startPoint.x}
                    y1={startPoint.y}
                    x2={endPoint.x}
                    y2={endPoint.y}
                    stroke="#3B82F6"
                    strokeWidth={strokeWidth * 3}
                    strokeOpacity={0.2}
                    className="animate-pulse"
                  />
                  {/* 시작점 표시 */}
                  <circle
                    cx={startPoint.x}
                    cy={startPoint.y}
                    r={strokeWidth * 2}
                    fill="#3B82F6"
                    fillOpacity={0.3}
                    className="animate-ping"
                  />
                  {/* 끝점 표시 */}
                  <circle
                    cx={endPoint.x}
                    cy={endPoint.y}
                    r={strokeWidth * 2}
                    fill="#3B82F6"
                    fillOpacity={0.3}
                    className="animate-ping"
                  />
                </>
              )}

              {/* 메인 연결선 */}
              <line
                x1={startPoint.x}
                y1={startPoint.y}
                x2={endPoint.x}
                y2={endPoint.y}
                stroke={isSelected ? '#3B82F6' : edge.color}
                strokeWidth={isSelected ? strokeWidth * 1.5 : strokeWidth}
                markerEnd={`url(#${isSelected ? `arrowhead-selected-${pageNum}` : `arrowhead-${pageNum}`})`}
                className={isSelected ? 'animate-pulse' : ''}
                style={{ cursor: isSelectingEdge ? 'pointer' : 'default' }}
              />

              {/* 투명한 넓은 히트 영역 */}
              <line
                x1={startPoint.x}
                y1={startPoint.y}
                x2={endPoint.x}
                y2={endPoint.y}
                stroke="transparent"
                strokeWidth={strokeWidth * 4}
                style={{ cursor: isSelectingEdge ? 'pointer' : 'default' }}
                className="group"
              />

              {/* 삭제 버튼 (선택 모드에서만 표시) */}
              {isSelectingEdge && (
                <g
                  transform={`translate(${midPoint.x - deleteButtonRadius}, ${midPoint.y - deleteButtonRadius})`}
                  onClick={(e) => handleDeleteClick(edge, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ cursor: 'pointer' }}
                >
                  {/* 삭제 버튼 배경 */}
                  <circle
                    cx={deleteButtonRadius}
                    cy={deleteButtonRadius}
                    r={deleteButtonRadius}
                    fill="white"
                    stroke="#EF4444"
                    strokeWidth={1}
                  />
                  {/* X 아이콘 */}
                  <path
                    d={`M ${deleteButtonSize * 0.3} ${deleteButtonSize * 0.3} L ${deleteButtonSize * 0.7} ${deleteButtonSize * 0.7} M ${deleteButtonSize * 0.7} ${deleteButtonSize * 0.3} L ${deleteButtonSize * 0.3} ${deleteButtonSize * 0.7}`}
                    stroke="#EF4444"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </g>
              )}
            </g>
          );
        })}

        {/* 임시 연결선 (그리는 중) */}
        {isDrawingEdge && edgeStartBox && tempEndPoint && edgeStartBox.pageNumber === pageNum && (
          <g>
            <line
              x1={getBoxCenter(edgeStartBox).x}
              y1={getBoxCenter(edgeStartBox).y}
              x2={tempEndPoint.x}
              y2={tempEndPoint.y}
              stroke={activeLayer.color}
              strokeWidth={strokeWidth}
              strokeDasharray="5,5"
              markerEnd={`url(#arrowhead-${pageNum})`}
            />
          </g>
        )}
      </svg>
    );
  }, [activeLayer, pageEdges, file, getPageData, scale, selectedEdgeId, getBoxCenter, isDrawingEdge, edgeStartBox, tempEndPoint, isSelectingEdge, handleEdgeDeleteWrapper]);

  // LayerBoxManager에 selectedEdgeId 전달
  const handleEdgeIdSelect = useCallback((edgeId: string) => {
    setSelectedEdgeId(edgeId);
  }, []);

  // 마우스 이동 핸들러
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (isDrawingEdge && edgeStartBox) {
      const container = e.currentTarget;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      setTempEndPoint({
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale
      });
    }
  }, [isDrawingEdge, edgeStartBox, scale]);

  // 박스 그리기 시작
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (!toolState.isDrawMode || !activeLayer) return;
    
    const container = e.currentTarget;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    setStartPoint({ x, y });
    setCurrentBox({
      x,
      y,
      width: 0,
      height: 0,
      pageNumber: pageNum
    });
  }, [toolState.isDrawMode, activeLayer, scale]);

  // 박스 그리기 중
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (!toolState.isDrawMode || !startPoint || !currentBox || !activeLayer) return;
    
    const container = e.currentTarget;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    setCurrentBox({
      ...currentBox,
      width: x - startPoint.x,
      height: y - startPoint.y,
      pageNumber: pageNum
    });
  }, [toolState.isDrawMode, startPoint, currentBox, activeLayer, scale]);

  // 박스 그리기 완료
  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (!toolState.isDrawMode || !startPoint || !currentBox || !activeLayer || !file) return;
    
    const container = e.currentTarget;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
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

  // 박스 삭제 핸들러
  const handleRemoveBox = useCallback((boxId: string) => {
    if (!file) return;
    
    try {
      removeBox(file.name, boxId);
      
      // 선택된 박스 초기화
      if (selectedBox?.id === boxId) {
        setSelectedBox(null);
        setBoxImage(null);
      }
    } catch (error) {
      console.error('RemoveBox - Error removing box:', error);
    }
  }, [file, selectedBox, removeBox, setSelectedBox, setBoxImage]);

  // 박스 업데이트 핸들러
  const handleUpdateBox = useCallback((boxId: string, updates: Partial<Box>) => {
    if (!file || !activeLayer) return;
    
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

  // 페이지 렌더링 함수 추가
  const renderPage = useCallback((pageNum: number) => {
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
          if (isDrawingEdge) {
            handleMouseMove(e, pageNum);
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
          userSelect: toolState.isDrawMode || isDrawingEdge ? 'none' : 'text',
          cursor: isDrawingEdge ? 'crosshair' : undefined
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
              setPageTextContent(pageNum, textContent.items);
            }}
          />
          <style jsx global>{`
            .react-pdf__Page__textContent {
              pointer-events: ${toolState.isDrawMode || isDrawingEdge ? 'none' : 'auto'} !important;
              user-select: ${toolState.isDrawMode || isDrawingEdge ? 'none' : 'text'} !important;
              -webkit-user-select: ${toolState.isDrawMode || isDrawingEdge ? 'none' : 'text'} !important;
              -moz-user-select: ${toolState.isDrawMode || isDrawingEdge ? 'none' : 'text'} !important;
              -ms-user-select: ${toolState.isDrawMode || isDrawingEdge ? 'none' : 'text'} !important;
            }
            .react-pdf__Page__textContent span {
              opacity: 0.4;
              cursor: ${toolState.isDrawMode || isDrawingEdge ? 'crosshair' : 'text'};
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

          {/* 연결선 렌더링 */}
          {renderEdges(pageNum)}

          {/* 박스 렌더링 */}
          {pageData?.boxes
            .filter(box => box.pageNumber === pageNum)
            .map(box => {
              const layer = layers.find(l => l.id === box.layerId);
              if (!layer?.isVisible) return null;
              
              const isSelected = selectedBox?.id === box.id;
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
                    cursor: isDrawingEdge ? 'crosshair' : 'pointer',
                    zIndex: isSelected || isEditing ? 10 : 1
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBoxClick(box, !toolState.isMultiSelectMode && !isDrawingEdge);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (isDrawingEdge) {
                      handleBoxClick(box, false);
                    }
                  }}
                />
              );
            })}
        </div>
      </div>
    );
  }, [
    file,
    scale,
    pdfDimensions,
    toolState.isDrawMode,
    toolState.isMultiSelectMode,
    isDrawingEdge,
    currentBox,
    activeLayer,
    selectedBox,
    editingBox,
    handleBoxClick,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleMouseMove,
    setPageRef,
    setPageTextContent,
    renderEdges,
    getPageData,
    layers
  ]);

  // LayerSidebar 관련 상태 및 핸들러
  const {
    isLayerSidebarOpen,
    setIsLayerSidebarOpen,
    handleAddLayer,
    handleRemoveLayer,
    handleToggleLayerVisibility,
    handleSetActiveLayer,
    handleDuplicateLayer,
  } = useLayerSidebarManager({
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    setActiveLayer,
    duplicateLayer,
  });

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
            <PDFContent
              isLayerSidebarOpen={isLayerSidebarOpen}
              setIsLayerSidebarOpen={setIsLayerSidebarOpen}
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
              pageNumber={pageNumber}
              numPages={numPages}
              handlePageChange={handlePageChange}
              file={file}
              handlePDFLoadSuccess={handlePDFLoadSuccess}
              isScrollMode={isScrollMode}
              visiblePages={visiblePages}
              renderPage={renderPage}
            />

            {/* 오른쪽 문서 정보 사이드바 */}
            <DocumentSidebar
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
              file={file}
              currentDocument={currentDocument}
              pageNumber={pageNumber}
              numPages={numPages}
              scale={scale}
              isScrollMode={isScrollMode}
              handlePageChange={handlePageChange}
              setScale={setScale}
              setIsScrollMode={setIsScrollMode}
              getPageData={getPageData}
              handleEditBox={handleEditBox}
              handleRemoveBox={handleRemoveBox}
            />

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
                isDrawingArrow={isDrawingEdge}
                onToggleArrowDrawing={() => setIsDrawingEdge(!isDrawingEdge)}
                edges={Object.values(pageEdges).reduce<Connection[]>((acc, pageData: Record<string, Edge[]>) => {
                  Object.values(pageData).forEach((layerEdges: Edge[]) => {
                    const connections = layerEdges.map((edge: Edge) => {
                      const pageData = getPageData(file.name, edge.pageNumber);
                      const startBox = pageData?.boxes.find(box => box.id === edge.startBoxId);
                      const endBox = pageData?.boxes.find(box => box.id === edge.endBoxId);
                      
                      if (startBox && endBox) {
                        const startPoint = {
                          x: Math.round(startBox.x + startBox.width / 2),
                          y: Math.round(startBox.y + startBox.height / 2)
                        };
                        const endPoint = {
                          x: Math.round(endBox.x + endBox.width / 2),
                          y: Math.round(endBox.y + endBox.height / 2)
                        };
                        
                        return {
                          id: edge.id,
                          startBox: {
                            ...startBox,
                            centerX: startPoint.x,
                            centerY: startPoint.y
                          },
                          endBox: {
                            ...endBox,
                            centerX: endPoint.x,
                            centerY: endPoint.y
                          },
                          layerId: edge.layerId,
                          type: edge.type,
                          color: edge.color,
                          startPoint,
                          endPoint,
                          length: Math.round(Math.sqrt(
                            Math.pow(endPoint.x - startPoint.x, 2) + 
                            Math.pow(endPoint.y - startPoint.y, 2)
                          ))
                        } as Connection;
                      }
                      return null;
                    }).filter((conn: Connection | null): conn is Connection => conn !== null);
                    
                    acc.push(...connections);
                  });
                  return acc;
                }, [])}
                onEdgeAdd={handleAddEdge}
                onEdgeDelete={handleEdgeDeleteWrapper}
                onEdgeUpdate={(edgeId: string, updates: Partial<Connection>) => {
                  handleEdgeUpdate(edgeId, {
                    ...updates,
                    type: 'arrow'
                  } as Partial<Edge>);
                }}
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
                scale={scale}
                currentPage={pageNumber}
                addBox={handleAddBox}
                onEdgeSelect={handleEdgeIdSelect}
                selectedEdgeId={selectedEdgeId}
                pageNumber={pageNumber}
                pdfDocument={null}
              />
            )}
          </div>

          {/* 도구 모음 - 메인 콘텐츠 밖으로 이동 */}
          <PDFToolbar
            toolState={toolState}
            toolActions={toolActions}
            isDrawingEdge={isDrawingEdge}
            setIsDrawingEdge={setIsDrawingEdge}
            scale={scale}
            setScale={setScale}
            isSelectingEdge={isSelectingEdge}
            setIsSelectingEdge={setIsSelectingEdge}
            selectedEdgeId={selectedEdgeId}
            onEdgeDelete={handleEdgeDeleteWrapper}
            isAutoConnectMode={isAutoConnectMode}
            setIsAutoConnectMode={setIsAutoConnectMode}
          />

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

          {/* LayerSidebar */}
          <LayerSidebar
            isLayerSidebarOpen={isLayerSidebarOpen}
            setIsLayerSidebarOpen={setIsLayerSidebarOpen}
            layers={layers}
            activeLayer={activeLayer}
            addLayer={handleAddLayer}
            removeLayer={handleRemoveLayer}
            toggleLayerVisibility={handleToggleLayerVisibility}
            setActiveLayer={handleSetActiveLayer}
            setIsBoxDetailOpen={setIsBoxDetailOpen}
            duplicateLayer={handleDuplicateLayer}
          />
        </>
      )}
    </div>
  );
};

export default PDFViewer; 