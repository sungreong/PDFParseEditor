'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Layer, GroupBox, Connection, PDFDocument, Box } from '@/types';
import type { Box as LayerBox } from '@/hooks/useLayerManager';
import DraggablePopup from '@/components/common/DraggablePopup';
import { createPortal } from 'react-dom';
import BoxDetailEditor from '@/components/BoxDetailEditor';
import { v4 as uuidv4 } from 'uuid';
import { useLayerManager } from '../hooks/useLayerManager';

interface LayerBoxManagerProps {
  isOpen: boolean;
  onClose: () => void;
  layers: Layer[];
  activeLayer: Layer | null;
  selectedBox: Box | null;
  onLayerSelect: (layerId: string) => void;
  onLayerAdd: () => void;
  onLayerDelete: (layerId: string) => void;
  onLayerVisibilityToggle: (layerId: string) => void;
  onLayerNameChange: (layerId: string, newName: string) => void;
  onLayerColorChange: (layerId: string, newColor: string) => void;
  onMoveBoxToLayer: (boxId: string, targetLayerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  onMergeLayers: (sourceLayerId: string, targetLayerId: string) => void;
  onExportLayer: (layerId: string) => void;
  onImportLayer: (layerData: any) => void;
  isDrawMode: boolean;
  onToggleDrawMode: () => void;
  isDrawingArrow: boolean;
  onToggleArrowDrawing: () => void;
  connections: Connection[];
  onConnectionDelete: (connectionId: string) => void;
  onConnectionAdd: (startBox: Box, endBox: Box) => void;
  layer: Layer | null;
  documentName: string;
  getPageData: (documentId: string, pageNumber: number) => {
    layers: Layer[];
    boxes: Box[];
    canvases: any[];
    groupBoxes: GroupBox[];
  };
  numPages: number;
  onBoxSelect: (box: Box | null) => void;
  onBoxDelete: (boxId: string) => void;
  onBoxUpdate: (boxId: string, updates: Partial<Box>) => void;
  onBoxesUpload: (boxes: Box[]) => void;
  setIsBoxDetailOpen: (isOpen: boolean) => void;
  setOriginalBox: (box: Box) => void;
  setPageNumber: (pageNumber: number) => void;
  updateGroupBox: (documentId: string, pageNumber: number, groupId: string, updates: Partial<GroupBox>) => void;
  removeGroupBox: (documentId: string, pageNumber: number, groupId: string) => void;
  getGroupBoxes: (documentId: string, pageNumber: number, groupId: string) => Box[];
  createGroupBox: (documentId: string, pageNumber: number, groupId: string, groupBox: GroupBox) => void;
  selectedBoxes: Box[];
  onBoxesSelect: (boxes: Box[]) => void;
  edges: Connection[];
  onEdgeAdd: (startBox: Box, endBox: Box) => void;
  onEdgeDelete: (edgeId: string, pageNumber: number, layerId: string) => void;
  onEdgeUpdate: (edgeId: string, updates: Partial<Connection>) => void;
  scale: number;
  currentPage: number;
  pageNumber: number;
  addBox: (box: Box) => void;
  pdfDocument: PDFDocument | null;
  onEdgeSelect?: (edgeId: string) => void;
  selectedEdgeId?: string | null;
}

// 레이어 색상 팔레트 추가
const layerColors = [
  '#FF6B6B', // 빨강
  '#4ECDC4', // 청록
  '#45B7D1', // 하늘
  '#96CEB4', // 민트
  '#FFEEAD', // 노랑
  '#D4A5A5', // 분홍
  '#9370DB', // 보라
  '#20B2AA', // 청록
  '#FFB6C1', // 연분홍
  '#98FB98', // 연두
];

export const LayerBoxManager: React.FC<LayerBoxManagerProps> = ({
  layer,
  documentName,
  getPageData,
  numPages,
  onBoxSelect,
  onBoxDelete,
  onBoxUpdate,
  onBoxesUpload,
  isOpen,
  onClose,
  layers,
  activeLayer,
  selectedBox,
  onLayerSelect,
  onLayerAdd,
  onLayerDelete,
  onLayerVisibilityToggle,
  onLayerNameChange,
  onLayerColorChange,
  onMoveBoxToLayer,
  onDuplicateLayer,
  onMergeLayers,
  onExportLayer,
  onImportLayer,
  isDrawMode,
  onToggleDrawMode,
  isDrawingArrow,
  onToggleArrowDrawing,
  connections,
  onConnectionDelete,
  onConnectionAdd,
  setIsBoxDetailOpen,
  setOriginalBox,
  setPageNumber,
  updateGroupBox,
  removeGroupBox,
  getGroupBoxes,
  createGroupBox,
  selectedBoxes,
  onBoxesSelect,
  edges,
  onEdgeAdd,
  onEdgeDelete,
  onEdgeUpdate,
  scale,
  currentPage,
  pageNumber,
  addBox,
  pdfDocument,
  onEdgeSelect,
  selectedEdgeId,
}) => {
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'index' | 'position'>('index');
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedBoxIds, setSelectedBoxIds] = useState<Set<string>>(new Set());
  const [textLengthFilter, setTextLengthFilter] = useState<{
    type: 'more' | 'less' | 'none';
    value: number;
  }>({ type: 'none', value: 0 });
  const [showEdgeTable, setShowEdgeTable] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [selectedEdges, setSelectedEdges] = useState<Set<string>>(new Set());
  const [showGroupTable, setShowGroupTable] = useState(false);

  // 연결선 관련 상태 추가
  const [startBox, setStartBox] = useState<Box | null>(null);

  // 드래그 관련 상태 추가
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);

  // 상태 추가
  const [isBoxEditorOpen, setIsBoxEditorOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<Box | null>(null);

  // 팝업 위치 상태 추가
  const [layerManagerPosition, setLayerManagerPosition] = useState({ x: 100, y: 100 });
  const [boxEditorPosition, setBoxEditorPosition] = useState({ x: 500, y: 100 });

  const { generateBoxId } = useLayerManager();

  // 모든 페이지의 박스 정보 가져오기
  const allBoxes = useMemo(() => {
    const boxes: Array<Box & { pageNumber: number }> = [];
    for (let page = 1; page <= numPages; page++) {
      const pageData = getPageData(documentName, page);
      if (pageData) {
        const pageBoxes = pageData.boxes.filter(box => box.layerId === layer?.id);
        boxes.push(...pageBoxes.map(box => ({ ...box, pageNumber: page })));
      }
    }
    return boxes;
  }, [documentName, layer?.id, numPages, getPageData]);

  // 페이지별로 박스 그룹화
  const boxesByPage = useMemo(() => {
    const grouped = new Map<number, Array<Box & { pageNumber: number }>>();
    allBoxes.forEach(box => {
      const pageBoxes = grouped.get(box.pageNumber) || [];
      pageBoxes.push(box);
      grouped.set(box.pageNumber, pageBoxes);
    });
    return grouped;
  }, [allBoxes]);

  // 필터링된 박스 목록 계산 수정
  const filteredBoxes = useMemo(() => {
    if (!allBoxes) return [];

    return allBoxes.filter(box => {
      // 페이지 필터
      if (selectedPage && box.pageNumber !== selectedPage) return false;
      
      // 텍스트 검색 필터
      if (searchTerm && !box.text?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      
      // 텍스트 길이 필터
      if (textLengthFilter.type !== 'none') {
        const textLength = box.text?.length || 0;
        if (textLengthFilter.type === 'more' && textLength < textLengthFilter.value) return false;
        if (textLengthFilter.type === 'less' && textLength > textLengthFilter.value) return false;
      }
      
      return true;
    }).sort((a, b) => {
      if (sortBy === 'position') {
        return a.pageNumber === b.pageNumber ? a.y - b.y : a.pageNumber - b.pageNumber;
      }
      return 0;
    });
  }, [allBoxes, selectedPage, searchTerm, textLengthFilter, sortBy]);

  // JSON 다운로드 함수
  const handleDownloadJSON = useCallback(() => {
    // 모든 페이지의 데이터 수집
    const allPagesData = Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => {
      const pageData = getPageData(documentName, pageNum);
      if (!pageData) return null;

      // 현재 레이어의 박스만 필터링
      const boxes = pageData.boxes.filter(box => box.layerId === layer?.id);
      
      return {
        pageNumber: pageNum,
        boxes: boxes.map(box => ({
          ...box,
          pageWidth: 800, // PDF 기본 너비
          pageHeight: 1131, // PDF 기본 높이 (A4 비율)
        }))
      };
    }).filter(Boolean);

    // JSON 데이터 구성
    const jsonData = {
      documentName,
      layer: {
        id: layer?.id,
        name: layer?.name,
        color: layer?.color
      },
      pages: allPagesData,
      metadata: {
        totalPages: numPages,
        totalBoxes: allPagesData.reduce((sum, page) => sum + (page?.boxes.length || 0), 0),
        exportDate: new Date().toISOString(),
        defaultPageWidth: 800,
        defaultPageHeight: 1131
      }
    };

    // JSON 파일 생성 및 다운로드
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentName}_${layer?.name}_boxes.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [documentName, layer?.id, numPages, getPageData]);

  // JSON 파일 업로드 처리 함수
  const handleUploadJSON = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        
        // pages 배열에서 모든 boxes를 추출
        const uploadedBoxes: Box[] = [];
        if (Array.isArray(jsonData.pages)) {
          jsonData.pages.forEach((page: any) => {
            if (Array.isArray(page.boxes)) {
              const boxesWithLayerId = page.boxes.map((box: any) => ({
                ...box,
                layerId: layer?.id  // 현재 레이어 ID로 설정
              }));
              uploadedBoxes.push(...boxesWithLayerId);
            }
          });
        }

        if (uploadedBoxes.length > 0) {
          onBoxesUpload(uploadedBoxes);
          alert(`${uploadedBoxes.length}개의 박스를 성공적으로 업로드했습니다.`);
        } else {
          alert('업로드할 박스를 찾을 수 없습니다.');
        }
      } catch (error) {
        alert('JSON 파일 처리 중 오류가 발생했습니다.');
        console.error('JSON 파싱 오류:', error);
      }
    };
    reader.readAsText(file);
    
    // 파일 입력 초기화
    event.target.value = '';
  }, [layer?.id, onBoxesUpload]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartSize({ width: size.width, height: size.height });
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startPos.x;
      const deltaY = e.clientY - startPos.y;

      const newWidth = Math.max(400, Math.min(1200, startSize.width + deltaX));
      const newHeight = Math.max(400, Math.min(1000, startSize.height + deltaY));

      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, startPos, startSize]);

  const handleBoxSelect = (boxId: string) => {
    setSelectedBoxIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(boxId)) {
        newSet.delete(boxId);
      } else {
        newSet.add(boxId);
      }
      return newSet;
    });
    
    // 단일 박스 선택도 함께 업데이트
    const box = allBoxes.find(b => b.id === boxId);
    if (box) {
      onBoxSelect(box);
    }
  };

  const handleSelectBoxesInArea = (selectionArea: { x: number; y: number; width: number; height: number }) => {
    const currentPage = selectedPage || 1;
    const pageData = getPageData(documentName, currentPage);
    if (!pageData) return;

    const boxesInArea = pageData.boxes.filter(box => {
      const isOverlapping = (
        box.x < (selectionArea.x + selectionArea.width) &&
        (box.x + box.width) > selectionArea.x &&
        box.y < (selectionArea.y + selectionArea.height) &&
        (box.y + box.height) > selectionArea.y
      );

      if (isOverlapping) {
        const overlapX = Math.min(box.x + box.width, selectionArea.x + selectionArea.width) - Math.max(box.x, selectionArea.x);
        const overlapY = Math.min(box.y + box.height, selectionArea.y + selectionArea.height) - Math.max(box.y, selectionArea.y);
        const overlapArea = overlapX * overlapY;
        const boxArea = box.width * box.height;
        return overlapArea > boxArea * 0.3;
      }
      return false;
    });

    setSelectedBoxIds(prev => {
      const newSet = new Set(prev);
      boxesInArea.forEach(box => newSet.add(box.id));
      return newSet;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedBoxIds.size === 0) return;

    if (window.confirm(`선택한 ${selectedBoxIds.size}개의 박스를 삭제하시겠습니까?`)) {
      selectedBoxIds.forEach(boxId => {
        onBoxDelete(boxId);
      });
      setSelectedBoxIds(new Set());
    }
  };

  // 박스 중앙 좌표 계산 함수
  const getBoxCenter = (box: Box) => {
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2
    };
  };

  // 박스 클릭 핸들러 수정
  const handleBoxClick = (e: React.MouseEvent, box: Box) => {
    e.preventDefault();
    e.stopPropagation();

    if (isDrawingArrow) {
      if (!startBox) {
        setStartBox(box);
      } else if (startBox.id !== box.id) {
        // 연결선 생성
        onConnectionAdd(startBox, box);
        setStartBox(null);
        onToggleArrowDrawing();
      }
      return;
    }

    // 항상 다중 선택 모드로 동작
    handleBoxSelect(box.id);
  };

  // 박스 수정 핸들러 수정
  const handleEditBox = useCallback((e: React.MouseEvent, box: Box) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('박스 수정 클릭:', box);
    setEditingBox(box);
    setIsBoxEditorOpen(true);
    setOriginalBox(box);
    setPageNumber(box.pageNumber);
  }, [setOriginalBox, setPageNumber]);

  // 박스 수정 저장 핸들러 추가
  const handleBoxEditSave = useCallback((boxId: string, updates: Partial<Box>) => {
    onBoxUpdate(boxId, updates);
    setIsBoxEditorOpen(false);
    setEditingBox(null);
  }, [onBoxUpdate]);

  // 박스 삭제 핸들러 수정
  const handleBoxDelete = async (e: React.MouseEvent, box: Box) => {
    e.stopPropagation();
    if (window.confirm('이 박스를 삭제하시겠습니까?')) {
      try {
        console.log('b박스 삭제 요청:', box.id);
        await onBoxDelete(box.id);
        
        // 상태 초기화
        setSelectedBoxId(null);
        setSelectedBoxIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(box.id);
          return newSet;
        });
        
        // 편집 중인 박스인 경우 편집창 닫기
        if (editingBox?.id === box.id) {
          setIsBoxEditorOpen(false);
          setEditingBox(null);
          setIsBoxDetailOpen(false);
        }
        
        // 선택된 박스인 경우 선택 해제
        if (selectedBox?.id === box.id) {
          onBoxSelect(null);
        }
        
        // 다중 선택된 박스 목록에서도 제거
        onBoxesSelect(selectedBoxes.filter(b => b.id !== box.id));

        // 성공 메시지 표시
        const popup = document.createElement('div');
        popup.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded shadow-lg z-[9999] flex items-center gap-2';
        popup.innerHTML = `
          <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span class="font-medium">박스가 삭제되었습니다</span>
        `;
        
        document.body.appendChild(popup);
        
        setTimeout(() => {
          popup.classList.add('opacity-0', 'transition-opacity', 'duration-300');
          setTimeout(() => {
            document.body.removeChild(popup);
          }, 300);
        }, 1500);

        // 페이지 데이터 강제 리렌더링을 위한 상태 업데이트
        setSearchTerm(prev => prev + '');
      } catch (error) {
        console.error('박스 삭제 중 오류 발생:', error);
        alert('박스 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // BoxDetailEditor에서 삭제 처리하는 핸들러 수정
  const handleBoxDetailDelete = async (boxId: string) => {
    try {
      console.log('박스 삭제 요청:', boxId);
      await onBoxDelete(boxId);
      
      // 상태 초기화
      setSelectedBoxId(null);
      setSelectedBoxIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(boxId);
        return newSet;
      });
      
      // 편집창 닫기
      setIsBoxEditorOpen(false);
      setEditingBox(null);
      setIsBoxDetailOpen(false);
      
      // 선택된 박스인 경우 선택 해제
      if (selectedBox?.id === boxId) {
        onBoxSelect(null);
      }
      
      // 다중 선택된 박스 목록에서도 제거
      onBoxesSelect(selectedBoxes.filter(b => b.id !== boxId));

      // 성공 메시지 표시
      const popup = document.createElement('div');
      popup.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded shadow-lg z-[9999] flex items-center gap-2';
      popup.innerHTML = `
        <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span class="font-medium">박스가 삭제되었습니다</span>
      `;
      
      document.body.appendChild(popup);
      
      setTimeout(() => {
        popup.classList.add('opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => {
          document.body.removeChild(popup);
        }, 300);
      }, 1500);

      // 페이지 데이터 강제 리렌더링을 위한 상태 업데이트
      setSearchTerm(prev => prev + '');
    } catch (error) {
      console.error('박스 삭제 중 오류 발생:', error);
      alert('박스 삭제 중 오류가 발생했습니다.');
    }
  };

  // 텍스트 길이 제한 유틸리티 함수 추가
  const truncateText = (text: string, maxLength: number = 50) => {
    if (!text) return '(텍스트 없음)';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  // 박스 렌더링 수정
  const renderBox = (box: Box) => {
    const isSelected = selectedBoxIds.has(box.id);
    const boxText = box.text || '';
    
    return (
      <div
        key={box.id}
        className={`flex items-center p-2 hover:bg-gray-50 ${
          isSelected ? 'bg-blue-50' : ''
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
              style={{ backgroundColor: box.color || '#000000' }}
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center">
                <span className="truncate text-sm hover:text-clip" title={boxText}>
                  {truncateText(boxText, 30)}
                </span>
                {boxText.length > 30 && (
                  <button
                    onClick={() => alert(boxText)}
                    className="ml-1 text-blue-500 hover:text-blue-700 text-xs"
                    title="전체 텍스트 보기"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                페이지 {box.pageNumber} | 위치: ({Math.round(box.x)}, {Math.round(box.y)}) | 크기: {Math.round(box.width)}×{Math.round(box.height)}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={(e) => handleEditBox(e, box)}
            className="p-1 hover:bg-gray-200 rounded"
            title="수정"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => handleBoxDelete(e, box)}
            className="p-1 hover:bg-red-100 rounded"
            title="삭제"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  // 박스 테이블 렌더링 수정
  const renderBoxTable = () => {
    const boxes = filteredBoxes || [];

    return (
      <div className="flex flex-col h-full bg-white rounded-lg shadow-sm">
        <div className="flex items-center justify-between gap-2 p-3 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <select
              value={textLengthFilter.type}
              onChange={(e) => setTextLengthFilter(prev => ({ ...prev, type: e.target.value as 'more' | 'less' | 'none' }))}
              className="px-2 py-1 border rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="none">텍스트 길이</option>
              <option value="more">이상</option>
              <option value="less">이하</option>
            </select>
            {textLengthFilter.type !== 'none' && (
              <input
                type="number"
                value={textLengthFilter.value}
                onChange={(e) => setTextLengthFilter(prev => ({ ...prev, value: parseInt(e.target.value) || 0 }))}
                className="w-20 px-2 py-1 border rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedBoxIds.size >= 2 && (
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 bg-red-500 text-black rounded-md text-xs hover:bg-red-600 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                선택 삭제 ({selectedBoxIds.size}개)
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                  <input
                    type="checkbox"
                    checked={boxes.length > 0 && selectedBoxIds.size === boxes.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBoxIds(new Set(boxes.map(box => box.id)));
                      } else {
                        setSelectedBoxIds(new Set());
                      }
                    }}
                    className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">위치</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">크기</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">그룹</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">텍스트 길이</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {boxes.map((box) => {
                const isSelected = selectedBoxIds.has(box.id);
                const boxText = box.text || '';
                return (
                  <tr 
                    key={box.id} 
                    className={`hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleBoxSelect(box.id)}
                        className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td 
                      className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 cursor-pointer"
                      onClick={() => handleBoxSelect(box.id)}
                    >
                      {box.pageNumber}
                    </td>
                    <td 
                      className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                      onClick={() => handleBoxSelect(box.id)}
                    >
                      {Math.round(box.x)},{Math.round(box.y)}
                    </td>
                    <td 
                      className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                      onClick={() => handleBoxSelect(box.id)}
                    >
                      {Math.round(box.width)}×{Math.round(box.height)}
                    </td>
                    <td 
                      className="px-3 py-2 cursor-pointer"
                      onClick={() => handleBoxSelect(box.id)}
                    >
                      <div className="flex items-center max-w-[200px]">
                        <span className="text-sm text-gray-900 truncate" title={boxText}>
                          {truncateText(boxText, 10)}
                        </span>
                        {boxText.length > 10 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              alert(boxText);
                            }}
                            className="ml-1 text-blue-500 hover:text-blue-700"
                            title="전체 텍스트 보기"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td 
                      className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                      onClick={() => handleBoxSelect(box.id)}
                    >
                      {boxText ? `${boxText.length}자` : '0자'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                      {!isDrawingArrow && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditBox(e, box);
                            }}
                            className="text-blue-600 hover:text-blue-900 text-xs mr-2"
                          >
                            수정
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBoxDelete(e, box);
                            }}
                            className="text-red-600 hover:text-red-900 text-xs"
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 상세 보기 렌더링 수정
  const renderDetailView = () => (
    <div className="flex-1 overflow-auto relative">
      <div className="space-y-2 mt-1">
        {Array.from(boxesByPage.entries())
          .filter(([pageNum]) => selectedPage ? pageNum === selectedPage : true)
          .map(([pageNum, boxes]) => {
            const filteredBoxes = boxes.filter(box => 
              searchTerm 
                ? box.text?.toLowerCase().includes(searchTerm.toLowerCase()) 
                : true
            );

            if (filteredBoxes.length === 0) return null;

            return (
              <div key={pageNum} className="mb-4">
                <div className="bg-gray-100 px-2 py-1 font-semibold text-xs sticky top-0 flex justify-between items-center">
                  <span>페이지 {pageNum}</span>
                  <span className="text-gray-500">{filteredBoxes.length}개 박스</span>
                </div>
                <div className="space-y-2 mt-1">
                  {filteredBoxes
                    .sort((a, b) => (sortBy === 'position' ? a.y - b.y : 0))
                    .map(box => renderBox(box))}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );

  // 그룹 생성 핸들러 수정
  const handleCreateGroup = () => {
    const selected = selectedBoxes || [];
    if (selected.length < 2) {
      alert('그룹을 만들려면 2개 이상의 박스를 선택해야 합니다.');
      return;
    }

    const groupName = prompt('그룹 이름을 입력하세요:');
    if (!groupName) return;

    // layer가 없으면 그룹 생성 불가
    if (!layer) {
      alert('레이어가 선택되지 않았습니다.');
      return;
    }

    // 현재 페이지 번호 가져오기
    const currentPage = selected[0].pageNumber;

    // 선택된 박스들의 정보 수집
    const selectedBoxesInfo = selected.map(box => ({
      id: box.id,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      text: box.text,
      layerId: box.layerId,
      pageNumber: box.pageNumber
    }));

    // 그룹의 범위 계산
    const minX = Math.min(...selectedBoxesInfo.map(box => box.x));
    const minY = Math.min(...selectedBoxesInfo.map(box => box.y));
    const maxX = Math.max(...selectedBoxesInfo.map(box => box.x + box.width));
    const maxY = Math.max(...selectedBoxesInfo.map(box => box.y + box.height));

    // 그룹 생성
    const groupId = `group_${Date.now()}`;
    const newGroup: GroupBox = {
      id: groupId,
      name: groupName,
      layerId: layer.id,
      pageNumber: currentPage,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`, // 랜덤 색상
      boxIds: selectedBoxesInfo.map(box => box.id),
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      },
      createdAt: Date.now()
    };

    // 그룹 박스 생성
    createGroupBox(documentName, currentPage, groupId, newGroup);

    // 선택 초기화
    onBoxesSelect([]);
    onMultiSelectModeChange(false);

    // 그룹 목록 보기로 전환
    setShowGroupTable(true);
  };

  // 그룹 테이블 렌더링 수정
  const renderGroupTable = () => {
    const currentPage = selectedPage || 1;
    const pageData = getPageData(documentName, currentPage);
    if (!pageData) return null;

    const groups = pageData.groupBoxes || [];

    return (
      <div className="flex flex-col h-full bg-white rounded-lg shadow-sm">
        <div className="flex items-center gap-2 p-3 border-b bg-gray-50">
          <span className="text-sm font-medium text-gray-800">그룹 목록</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">({groups.length}개)</span>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">박스 수</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">범위</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">생성일</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groups.map((group) => {
                const groupBoxes = getGroupBoxes(documentName, currentPage, group.id);
                return (
                  <tr key={group.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shadow-sm"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="text-sm text-gray-900">{group.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {groupBoxes.length}개
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {group.bounds ? (
                        <span>
                          {Math.round(group.bounds.width)}×{Math.round(group.bounds.height)}
                        </span>
                      ) : ''}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {new Date(group.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          const newName = prompt('새 그룹 이름을 입력하세요:', group.name);
                          if (newName) {
                            updateGroupBox(documentName, currentPage, group.id, {
                              ...group,
                              name: newName
                            });
                          }
                        }}
                        className="text-blue-600 hover:text-blue-900 text-xs mr-2"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('이 그룹을 삭제하시겠습니까?')) {
                            removeGroupBox(documentName, currentPage, group.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-900 text-xs"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 필터링된 엣지 목록 계산
  const filteredEdges = useMemo(() => {
    if (!edges) return [];
    
    return edges.filter(edge => {
      // 페이지 필터
      if (selectedPage && edge.startBox.pageNumber !== selectedPage) return false;
      
      // 레이어 필터
      if (edge.layerId !== layer?.id) return false;
      
      // 검색어 필터
      if (searchTerm) {
        const searchText = `${edge.startBox.text || ''} ${edge.endBox.text || ''}`.toLowerCase();
        if (!searchText.includes(searchTerm.toLowerCase())) return false;
      }
      
      return true;
    });
  }, [edges, selectedPage, layer?.id, searchTerm]);

  // 드래그 핸들러
  const handleDragStart = (e: React.MouseEvent) => {
    if (dragRef.current) {
      setIsDragging(true);
      const rect = dragRef.current.getBoundingClientRect();
      setDragPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (isDragging && dragRef.current) {
      const newX = e.clientX - dragPosition.x;
      const newY = e.clientY - dragPosition.y;
      dragRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
    }
  }, [isDragging, dragPosition]);

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, handleDragMove]);

  // 레이어 추가 시 색상 할당
  const handleLayerAdd = () => {
    const usedColors = new Set(layers.map(layer => layer.color));
    const availableColors = layerColors.filter(color => !usedColors.has(color));
    
    // 모든 색상이 사용중이면 랜덤 색상 생성
    const newColor = availableColors.length > 0 
      ? availableColors[0] 
      : `#${Math.floor(Math.random()*16777215).toString(16)}`;
    
    onLayerAdd();
    // 새 레이어의 색상 업데이트
    const newLayer = layers[layers.length - 1];
    if (newLayer) {
      onLayerColorChange(newLayer.id, newColor);
    }
  };

  // 레이어 복제 함수 수정
  const handleDuplicateLayer = async (layerId: string) => {
    try {
      // 1. 원본 레이어 정보 가져오기
      const sourceLayer = layers.find(l => l.id === layerId);
      if (!sourceLayer) {
        console.error('원본 레이어를 찾을 수 없습니다.');
        return;
      }

      // 2. 원본 레이어의 모든 박스 정보 가져오기
      const sourceBoxes = allBoxes.filter(box => box.layerId === layerId);

      // 3. 새로운 레이어 생성
      onDuplicateLayer(layerId);

      // 4. 새로 생성된 레이어 찾기 (마지막에 추가된 레이어)
      const newLayer = layers[layers.length - 1];
      if (!newLayer) {
        console.error('새 레이어 생성에 실패했습니다.');
        return;
      }

      // 5. 새 레이어에 원본 박스들 복사
      const copyPromises = sourceBoxes.map(async (sourceBox) => {
        const newBox = {
          ...sourceBox,
          id: generateBoxId(),
          layerId: newLayer.id,
        };
        await addBox(newBox);
      });

      // 6. 모든 박스 복사 완료 대기
      await Promise.all(copyPromises);

      // 7. 새 레이어 선택
      onLayerSelect(newLayer.id);

      console.log(`레이어 복제 완료: ${sourceLayer.name} -> ${newLayer.name}`);
      console.log(`복사된 박스 수: ${sourceBoxes.length}`);

    } catch (error) {
      console.error('레이어 복제 중 오류 발생:', error);
    }
  };

  // 박스 생성 핸들러 수정
  const handleCreateBox = useCallback((pageNumber: number, x: number, y: number, width: number, height: number) => {
    const newBox: Box = {
      id: generateBoxId(),
      layerId: activeLayer?.id || '',
      pageNumber,
      x,
      y,
      width,
      height,
      type: 'box',
      color: activeLayer?.color || '#000000',
      text: '',
      textItems: [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        extractedAt: new Date().toISOString()
      }
    };

    addBox(newBox);
    return newBox;
  }, [activeLayer, generateBoxId, addBox]);

  // 툴바 렌더링 수정
  const renderToolbar = () => (
    <div className="flex flex-col gap-3 p-4 border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
      {/* 상단 문서 정보 및 통계 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-md">
            {selectedBoxIds.size > 0 && (
              <span className="text-xs text-gray-600">
                {selectedBoxIds.size}개 선택됨
              </span>
            )}
          </div>
        </div>
        
        {/* 보기 모드 토글 버튼 그룹 */}
        <div className="flex items-center bg-gray-50 border border-gray-100 rounded-md divide-x divide-gray-200">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`px-4 py-2 min-w-[100px] text-xs font-medium transition-all duration-200 ${
              showDetails 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2 justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              {showDetails ? '목록보기' : '상세보기'}
            </div>
          </button>
          <button
            onClick={() => setShowGroupTable(!showGroupTable)}
            className={`px-4 py-2 min-w-[100px] text-xs font-medium transition-all duration-200 ${
              showGroupTable 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2 justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {showGroupTable ? '박스 목록' : '그룹 목록'}
            </div>
          </button>
          <button
            onClick={() => setShowEdgeTable(!showEdgeTable)}
            className={`px-4 py-2 min-w-[100px] text-xs font-medium transition-all duration-200 ${
              showEdgeTable 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2 justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
              {showEdgeTable ? '박스 목록' : '연결선 목록'}
            </div>
          </button>
        </div>
      </div>

      {/* 하단 필터 및 검색 */}
      <div className="flex items-center gap-4">
        {/* 정렬 선택 */}
        <div className="relative min-w-[140px]">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'index' | 'position')}
            className="w-full appearance-none px-3 py-1.5 pr-8 bg-white border border-gray-200 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="index">기본 정렬</option>
            <option value="position">위치순</option>
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* 검색 필드 */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="텍스트 검색..."
            className="w-full px-3 py-1.5 pl-9 bg-white border border-gray-200 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // 엣지 선택 핸들러 수정
  const handleEdgeSelect = useCallback((edge: Connection) => {
    setSelectedEdge(edge.id);
    setPageNumber(edge.startBox.pageNumber);
    onEdgeSelect?.(edge.id);
  }, [setPageNumber, onEdgeSelect]);

  // 엣지 선택 해제 핸들러 추가
  const handleEdgeDeselect = useCallback(() => {
    if (selectedEdge) {
      onEdgeUpdate(selectedEdge, { isSelected: false });
      setSelectedEdge(null);
    }
  }, [selectedEdge, onEdgeUpdate]);

  // 컴포넌트가 언마운트되거나 닫힐 때 선택 해제
  useEffect(() => {
    return () => {
      handleEdgeDeselect();
      if (onEdgeSelect) {
        onEdgeSelect(null);
      }
    };
  }, [handleEdgeDeselect, onEdgeSelect]);

  // 다른 엣지를 선택할 때 이전 선택 해제
  useEffect(() => {
    if (selectedEdge) {
      return () => {
        handleEdgeDeselect();
      };
    }
  }, [selectedEdge, handleEdgeDeselect]);

  return (
    <>
      <DraggablePopup
        isOpen={isOpen}
        onClose={onClose}
        title="레이어 & 박스 관리"
        width={`${size.width}px`}
        height={`${size.height}px`}
        zIndex={100}
        position={layerManagerPosition}
        onPositionChange={setLayerManagerPosition}
      >
        <div className="flex h-full flex-col bg-white/80 backdrop-blur-sm rounded-lg relative">
          {/* 현재 레이어 정보 - 상단 고정 */}
          <div className="border-b border-gray-200/50 bg-white/95 shrink-0">
            {activeLayer ? (
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full shadow-sm border border-gray-200"
                      style={{ backgroundColor: activeLayer.color }}
                    />
                    <div>
                      <h3 className="font-medium text-gray-800">{activeLayer.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>박스 {filteredBoxes.length}</span>
                        <span>•</span>
                        <span>연결선 {filteredEdges.length}</span>
                        <span>•</span>
                        <span>그룹 {getPageData(documentName, currentPage)?.groupBoxes?.filter(g => g.layerId === activeLayer.id).length || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onLayerVisibilityToggle(activeLayer.id)}
                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                      title="표시/숨김"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerColorChange(activeLayer.id, layerColors[Math.floor(Math.random() * layerColors.length)]);
                      }}
                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                      title="색상 변경"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        const newName = prompt('레이어 이름 변경:', activeLayer.name);
                        if (newName) onLayerNameChange(activeLayer.id, newName);
                      }}
                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                      title="이름 변경"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDuplicateLayer(activeLayer.id)}
                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                      title="복제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onExportLayer(activeLayer.id)}
                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                      title="내보내기"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center">
                <div className="text-gray-400 mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-800 mb-1">레이어를 선택해주세요</h3>
                <button
                  onClick={handleLayerAdd}
                  className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600 transition-colors shadow-sm"
                >
                  + 새 레이어 만들기
                </button>
              </div>
            )}
          </div>

          {/* 툴바 - 고정 */}
          {activeLayer && renderToolbar()}

          {/* 메인 컨텐츠 - 스크롤 가능 */}
          {activeLayer && (
            <div className="flex-1 overflow-y-auto min-h-0 p-4 bg-white/95">
              {showEdgeTable ? (
                <div className="h-full overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between p-3 border-b bg-gray-50 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">연결선 목록</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">({filteredEdges.length}개)</span>
                    </div>
                    {selectedEdges.size > 0 && (
                      <button
                        onClick={() => {
                          if (window.confirm(`선택한 ${selectedEdges.size}개의 연결선을 삭제하시겠습니까?`)) {
                            selectedEdges.forEach(edgeId => {
                              const edge = filteredEdges.find(e => e.id === edgeId);
                              if (edge) {
                                onEdgeDelete(edgeId, edge.startBox.pageNumber, edge.layerId);
                              }
                            });
                            setSelectedEdges(new Set());
                          }
                        }}
                        className="px-3 py-1.5 bg-red-500 text-black rounded-md text-xs hover:bg-red-600 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        선택 삭제 ({selectedEdges.size}개)
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                            <input
                              type="checkbox"
                              checked={filteredEdges.length > 0 && selectedEdges.size === filteredEdges.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEdges(new Set(filteredEdges.map(edge => edge.id)));
                                } else {
                                  setSelectedEdges(new Set());
                                }
                              }}
                              className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">페이지</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시작 ID</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시작 좌표</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">끝 ID</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">끝 좌표</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">길이</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredEdges.map(edge => {
                          return (
                            <tr 
                              key={edge.id} 
                              className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                                (selectedEdge === edge.id || selectedEdgeId === edge.id) ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => handleEdgeSelect(edge)}
                              title={`시작: ${edge.startBox.text || '(텍스트 없음)'}\n끝: ${edge.endBox.text || '(텍스트 없음)'}`}
                            >
                              <td className="px-3 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedEdges.has(edge.id)}
                                  onChange={(e) => {
                                    const newSelectedEdges = new Set(selectedEdges);
                                    if (e.target.checked) {
                                      newSelectedEdges.add(edge.id);
                                    } else {
                                      newSelectedEdges.delete(edge.id);
                                    }
                                    setSelectedEdges(newSelectedEdges);
                                  }}
                                  className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{edge.id}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{edge.startBox.pageNumber}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{edge.startBox.id}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">({edge.startPoint.x}, {edge.startPoint.y})</td>
                              <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{edge.endBox.id}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">({edge.endPoint.x}, {edge.endPoint.y})</td>
                              <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{edge.length}px</td>
                              <td className="px-3 py-2 whitespace-nowrap text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('이 연결선을 삭제하시겠습니까?')) {
                                      onEdgeDelete(edge.id, edge.startBox.pageNumber, edge.layerId);
                                      setSelectedEdges(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(edge.id);
                                        return newSet;
                                      });
                                      if (selectedEdge === edge.id) {
                                        setSelectedEdge(null);
                                      }
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-900 text-xs"
                                >
                                  삭제
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : showGroupTable ? (
                renderGroupTable()
              ) : (
                showDetails ? renderDetailView() : renderBoxTable()
              )}
            </div>
          )}
        </div>
      </DraggablePopup>

      {/* BoxDetailEditor */}
      {isBoxEditorOpen && editingBox && layer && (
        <BoxDetailEditor
          box={editingBox}
          originalBox={editingBox}
          onUpdate={handleBoxEditSave}
          onCancel={() => {
            setIsBoxEditorOpen(false);
            setEditingBox(null);
          }}
          onDelete={handleBoxDetailDelete}
          pageNumber={editingBox.pageNumber}
          documentName={documentName}
          viewerWidth={1200}
          viewerHeight={800}
          layers={[layer]}
          isOpen={isBoxEditorOpen}
          position={boxEditorPosition}
          onPositionChange={setBoxEditorPosition}
        />
      )}
    </>
  );
};
