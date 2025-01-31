'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Layer, Box, GroupBox, Connection } from '@/types';
import DraggablePopup from '@/components/DraggablePopup';

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
  isMultiSelectMode: boolean;
  onMultiSelectModeChange: (isMultiSelect: boolean) => void;
  edges: Connection[];
  onEdgeAdd: (startBox: Box, endBox: Box) => void;
  onEdgeDelete: (edgeId: string) => void;
  onEdgeUpdate: (edgeId: string, updates: Partial<Connection>) => void;
  scale: number;
  currentPage: number;
  pageNumber: number;
  addBox: (box: Box) => void;
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
  isMultiSelectMode,
  onMultiSelectModeChange,
  edges,
  onEdgeAdd,
  onEdgeDelete,
  onEdgeUpdate,
  scale,
  currentPage,
  pageNumber,
  addBox,
}) => {
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'index' | 'position'>('index');
  const [size, setSize] = useState({ width: 600, height: 800 });
  const [isResizing, setIsResizing] = useState(false);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedBoxIds, setSelectedBoxIds] = useState<Set<string>>(new Set());
  const [textLengthFilter, setTextLengthFilter] = useState<{
    type: 'more' | 'less' | 'none';
    value: number;
  }>({ type: 'none', value: 0 });
  const [showEdgeTable, setShowEdgeTable] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [showGroupTable, setShowGroupTable] = useState(false);

  // 연결선 관련 상태 추가
  const [startBox, setStartBox] = useState<Box | null>(null);

  // 모든 페이지의 박스 정보 가져오기
  const allBoxes = useMemo(() => {
    const boxes: Array<Box & { pageNumber: number }> = [];
    for (let page = 1; page <= numPages; page++) {
      const pageData = getPageData(documentName, page);
      const pageBoxes = pageData?.boxes.filter(box => box.layerId === layer?.id) || [];
      boxes.push(...pageBoxes.map(box => ({ ...box, pageNumber: page })));
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
    if (!allBoxes) return []; // allBoxes가 없을 경우 빈 배열 반환

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
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      // 마우스 위치 기준으로 크기 계산
      const container = document.querySelector('.layer-box-manager-container');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      const newHeight = e.clientY - rect.top;
      
      // 최소/최대 크기 제한 수정
      const clampedWidth = Math.max(400, Math.min(1200, newWidth));
      const clampedHeight = Math.max(400, Math.min(1000, newHeight));
      
      setSize({ width: clampedWidth, height: clampedHeight });
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
  }, [isResizing, size]);

  const handleSelectBox = (boxId: string) => {
    const box = allBoxes.find(b => b.id === boxId);
    if (!box) return;

    if (isMultiSelectMode) {
      // 다중 선택 모드일 때는 선택된 박스들 목록 업데이트
      const isSelected = selectedBoxes.some(b => b.id === boxId);
      if (isSelected) {
        onBoxesSelect(selectedBoxes.filter(b => b.id !== boxId));
      } else {
        onBoxesSelect([...selectedBoxes, box]);
      }
    } else {
      // 일반 모드일 때는 단일 박스 선택
      onBoxSelect(box);
    }
  };

  const handleSelectBoxesInArea = (selectionArea: { x: number; y: number; width: number; height: number }) => {
    const currentPage = selectedPage || 1;
    const pageData = getPageData(documentName, currentPage);
    if (!pageData) return;

    const boxesInArea = pageData.boxes.filter(box => {
      // 박스가 선택 영역과 겹치는지 확인
      const isOverlapping = (
        box.x < (selectionArea.x + selectionArea.width) &&
        (box.x + box.width) > selectionArea.x &&
        box.y < (selectionArea.y + selectionArea.height) &&
        (box.y + box.height) > selectionArea.y
      );

      // 겹치는 영역의 비율 계산
      if (isOverlapping) {
        const overlapX = Math.min(box.x + box.width, selectionArea.x + selectionArea.width) - Math.max(box.x, selectionArea.x);
        const overlapY = Math.min(box.y + box.height, selectionArea.y + selectionArea.height) - Math.max(box.y, selectionArea.y);
        const overlapArea = overlapX * overlapY;
        const boxArea = box.width * box.height;
        
        // 30% 이상 겹치는 경우에만 선택
        return overlapArea > boxArea * 0.3;
      }
      return false;
    });

    // 선택된 박스들의 ID를 현재 선택 목록에 추가
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

    // 다중 선택 모드일 때는 체크박스 선택/해제
    if (isMultiSelectMode) {
      handleSelectBox(box.id);
      return;
    }

    // 일반 모드일 때는 박스 선택
    onBoxSelect(box);
  };

  // 박스 생성 핸들러 수정
  const handleBoxCreated = (box: Box) => {
    const newBox: Box = {
      ...box,
      layerId: activeLayer?.id || '',
      pageNumber: currentPage,
      color: activeLayer?.color || '#000000',
    };

    addBox(newBox);
  };

  // 박스 수정 핸들러 수정
  const handleEditBox = (e: React.MouseEvent, box: Box) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 원본 박스 상태 저장
    setOriginalBox({ ...box });
    
    // 박스 선택
    onBoxSelect(box);
    
    // 상세 정보 창 열기
    setIsBoxDetailOpen(true);
    
    // 페이지 이동 (pageNumber 속성이 있는 경우)
    if ('pageNumber' in box && typeof box.pageNumber === 'number') {
      setPageNumber(box.pageNumber);
    }
  };

  // 박스 렌더링 수정
  const renderBox = (box: Box) => {
    // 박스의 그룹 정보 가져오기
    const pageData = getPageData(documentName, ('pageNumber' in box ? box.pageNumber : 1));
    const groupInfo = pageData?.groupBoxes?.find(group => 
      getGroupBoxes(documentName, ('pageNumber' in box ? box.pageNumber : 1), group.id)
        .some(groupBox => groupBox.id === box.id)
    );

    return (
      <div
        key={box.id}
        className={`text-xs p-2 bg-white border rounded relative ${
          startBox?.id === box.id ? 'ring-2 ring-blue-500' : ''} 
        ${isDrawingArrow ? 'cursor-pointer' : ''}
        ${selectedBoxIds.has(box.id) ? 'bg-blue-50' : ''}`}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
        onClick={(e) => handleBoxClick(e, box)}
      >
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-500">
            위치: ({Math.round(box.x / scale)}, {Math.round(box.y / scale)}) | 
            크기: {Math.round(box.width / scale)}×{Math.round(box.height / scale)} |
            텍스트: {box.text ? `${box.text.length}자` : '0자'}
          </span>
          <div>
            {!isDrawingArrow && (
              <>
                <button
                  onClick={(e) => handleEditBox(e, box)}
                  className="text-blue-500 hover:text-blue-700 text-xs"
                >
                  수정
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onBoxDelete(box.id);
                  }}
                  className="text-red-500 hover:text-red-700 text-xs ml-1"
                >
                  삭제
                </button>
              </>
            )}
          </div>
        </div>
        {groupInfo && (
          <div className="flex items-center gap-1 mb-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: groupInfo.color }}
            />
            <span className="text-xs text-gray-600">그룹: {groupInfo.name}</span>
          </div>
        )}
        <div className="text-gray-700 break-words">
          {box.text || '(텍스트 없음)'}
        </div>
        {isDrawingArrow && startBox?.id === box.id && (
          <div className="absolute inset-0 bg-blue-100 bg-opacity-20 pointer-events-none" />
        )}
      </div>
    );
  };

  // 박스 테이블 렌더링 수정
  const renderBoxTable = () => {
    // filteredBoxes와 selectedBoxes가 없을 경우 빈 배열 사용
    const boxes = filteredBoxes || [];
    const selected = selectedBoxes || [];

    return (
      <div className="flex flex-col h-full relative">
        <div className="flex items-center gap-2 p-1 border-b bg-gray-50">
          <div className="flex items-center gap-1">
            <select
              value={textLengthFilter.type}
              onChange={(e) => setTextLengthFilter(prev => ({ ...prev, type: e.target.value as 'more' | 'less' | 'none' }))}
              className="px-1 py-0.5 border rounded text-xs"
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
                className="w-16 px-1 py-0.5 border rounded text-xs"
                min="0"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onMultiSelectModeChange(!isMultiSelectMode)}
              className={`px-2 py-0.5 rounded text-xs ${
                isMultiSelectMode 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {isMultiSelectMode ? '다중 선택 끄기' : '다중 선택 켜기'}
            </button>
            {selected.length >= 2 && (
              <button
                onClick={handleCreateGroup}
                className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
              >
                그룹 생성 ({selected.length}개)
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-1 py-0.5 text-left w-8">
                  <input
                    type="checkbox"
                    checked={selected.length > 0 && selected.length === boxes.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onBoxesSelect(boxes);
                      } else {
                        onBoxesSelect([]);
                      }
                    }}
                    className="w-3 h-3"
                  />
                </th>
                <th className="px-1 py-0.5 text-left">P</th>
                <th className="px-1 py-0.5 text-left">위치</th>
                <th className="px-1 py-0.5 text-left">크기</th>
                <th className="px-1 py-0.5 text-left">그룹</th>
                <th className="px-1 py-0.5 text-left">텍스트 길이</th>
                <th className="px-1 py-0.5 text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {boxes.map((box) => {
                const isSelected = selected.some(b => b.id === box.id);
                return (
                  <tr 
                    key={box.id} 
                    className={`border-b hover:bg-gray-50 ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleSelectBox(box.id)}
                  >
                    <td className="px-1 py-0.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectBox(box.id);
                        }}
                        className="w-3 h-3"
                      />
                    </td>
                    <td className="px-1 py-0.5">{box.pageNumber}</td>
                    <td className="px-1 py-0.5 whitespace-nowrap">
                      {Math.round(box.x)},{Math.round(box.y)}
                    </td>
                    <td className="px-1 py-0.5 whitespace-nowrap">
                      {Math.round(box.width)}×{Math.round(box.height)}
                    </td>
                    <td className="px-1 py-0.5">
                      {isSelected && (
                        <div className="flex items-center gap-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: box.color }}
                          />
                          <span>{box.text || '(텍스트 없음)'}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-1 py-0.5 text-gray-500">
                      {box.text ? `${box.text.length}자` : '0자'}
                    </td>
                    <td className="px-1 py-0.5 text-right whitespace-nowrap">
                      {!isDrawingArrow && (
                        <>
                          <button
                            onClick={(e) => handleEditBox(e, box)}
                            className="text-blue-500 hover:text-blue-700 text-xs"
                          >
                            수정
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onBoxDelete(box.id);
                            }}
                            className="text-red-500 hover:text-red-700 text-xs ml-1"
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
      layerId: layer?.id,
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
      <div className="flex flex-col h-full relative">
        <div className="flex items-center gap-2 p-1 border-b bg-gray-50">
          <span className="text-sm font-medium">그룹 목록</span>
          <span className="text-xs text-gray-500">({groups.length}개)</span>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-1 py-0.5 text-left">이름</th>
                <th className="px-1 py-0.5 text-left">박스 수</th>
                <th className="px-1 py-0.5 text-left">범위</th>
                <th className="px-1 py-0.5 text-left">생성일</th>
                <th className="px-1 py-0.5 text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const groupBoxes = getGroupBoxes(documentName, currentPage, group.id);
                return (
                  <tr key={group.id} className="border-b hover:bg-gray-50">
                    <td className="px-1 py-0.5">
                      <div className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        {group.name}
                      </div>
                    </td>
                    <td className="px-1 py-0.5">{groupBoxes.length}개</td>
                    <td className="px-1 py-0.5">
                      {group.bounds ? (
                        <span>
                          {Math.round(group.bounds.width)}×{Math.round(group.bounds.height)}
                        </span>
                      ) : ''}
                    </td>
                    <td className="px-1 py-0.5">
                      {new Date(group.createdAt).toLocaleString()}
                    </td>
                    <td className="px-1 py-0.5 text-right whitespace-nowrap">
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
                        className="text-blue-500 hover:text-blue-700 text-xs"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('이 그룹을 삭제하시겠습니까?')) {
                            removeGroupBox(documentName, currentPage, group.id);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 text-xs ml-1"
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

  // 엣지 테이블 렌더링
  const renderEdgeTable = () => (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center gap-2 p-1 border-b bg-gray-50">
        <span className="text-sm font-medium">연결선 목록</span>
        <span className="text-xs text-gray-500">({filteredEdges.length}개)</span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="연결선 검색..."
          className="px-2 py-0.5 border rounded text-xs flex-1 min-w-[100px]"
        />
      </div>
      <div className="flex-1 overflow-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-1 py-1 text-left">페이지</th>
              <th className="px-1 py-1 text-left">시작 박스</th>
              <th className="px-1 py-1 text-left">끝 박스</th>
              <th className="px-1 py-1 text-right">작업</th>
            </tr>
          </thead>
          <tbody>
            {filteredEdges.map(edge => (
              <tr key={edge.id} className="border-b hover:bg-gray-50">
                <td className="px-1 py-0.5">{edge.startBox.pageNumber}</td>
                <td className="px-1 py-0.5">{edge.startBox.text || '(삭제됨)'}</td>
                <td className="px-1 py-0.5">{edge.endBox.text || '(삭제됨)'}</td>
                <td className="px-1 py-0.5 text-right">
                  <button
                    onClick={() => onEdgeDelete(edge.id)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // 툴바 렌더링 수정
  const renderToolbar = () => (
    <div className="flex flex-wrap items-center gap-1 sm:gap-2 p-2 border-b shrink-0">
      <div className="flex items-center gap-2 mr-4">
        <span className="text-sm font-medium">{documentName}</span>
        <span className="text-xs text-gray-500">({numPages}페이지)</span>
      </div>
      <div className="flex items-center gap-2 mr-4">
        <button
          onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
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
              setPageNumber(value);
            }
          }}
          className="w-16 px-2 py-1 border rounded text-center text-xs"
        />
        <span className="text-xs text-gray-500">/ {numPages}</span>
        <button
          onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
          disabled={pageNumber >= numPages}
          className="px-2 py-1 bg-gray-100 rounded text-xs disabled:opacity-50"
        >
          ▶
        </button>
      </div>
      <select
        value={selectedPage?.toString() || ''}
        onChange={(e) => setSelectedPage(e.target.value ? Number(e.target.value) : null)}
        className="px-1 sm:px-2 py-0.5 border rounded text-xs"
      >
        <option value="">전체</option>
        {Array.from({ length: numPages }, (_, i) => i + 1).map(page => (
          <option key={page} value={page}>{page}p</option>
        ))}
      </select>
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as 'index' | 'position')}
        className="px-1 sm:px-2 py-0.5 border rounded text-xs"
      >
        <option value="index">기본</option>
        <option value="position">위치</option>
      </select>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="텍스트 검색..."
        className="px-2 py-0.5 border rounded text-xs flex-1 min-w-[100px]"
      />
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`px-2 py-0.5 rounded text-xs ${
          showDetails 
            ? 'bg-blue-100 text-blue-700' 
            : 'bg-gray-100 text-gray-700'
        }`}
      >
        {showDetails ? '목록보기' : '상세보기'}
      </button>
      <button
        onClick={() => setShowGroupTable(!showGroupTable)}
        className={`px-2 py-0.5 rounded text-xs ${
          showGroupTable 
            ? 'bg-blue-100 text-blue-700' 
            : 'bg-gray-100 text-gray-700'
        }`}
      >
        {showGroupTable ? '박스 목록' : '그룹 목록'}
      </button>
      <button
        onClick={() => setShowEdgeTable(!showEdgeTable)}
        className={`px-2 py-0.5 rounded text-xs ${
          showEdgeTable 
            ? 'bg-blue-100 text-blue-700' 
            : 'bg-gray-100 text-gray-700'
        }`}
      >
        {showEdgeTable ? '박스 목록' : '연결선 목록'}
      </button>
    </div>
  );

  // 선택 영역 그리기 관련 상태 추가
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDrawingSelection, setIsDrawingSelection] = useState(false);

  // 선택 영역 그리기 핸들러 추가
  const handleSelectionMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMultiSelectMode) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
    setIsDrawingSelection(true);
  };

  const handleSelectionMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingSelection || !selectionStart) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setSelectionEnd({ x, y });
  };

  const handleSelectionMouseUp = () => {
    if (!isDrawingSelection || !selectionStart || !selectionEnd) return;

    // 선택 영역 계산
    const selectionArea = {
      x: Math.min(selectionStart.x, selectionEnd.x),
      y: Math.min(selectionStart.y, selectionEnd.y),
      width: Math.abs(selectionEnd.x - selectionStart.x),
      height: Math.abs(selectionEnd.y - selectionStart.y)
    };

    // 선택 영역 내의 박스들 선택
    handleSelectBoxesInArea(selectionArea);

    // 선택 영역 초기화
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsDrawingSelection(false);
  };

  // 선택 영역 렌더링 컴포넌트
  const SelectionArea = () => {
    if (!selectionStart || !selectionEnd) return null;

    const style = {
      position: 'absolute' as const,
      left: Math.min(selectionStart.x, selectionEnd.x),
      top: Math.min(selectionStart.y, selectionEnd.y),
      width: Math.abs(selectionEnd.x - selectionStart.x),
      height: Math.abs(selectionEnd.y - selectionStart.y),
      border: '2px solid #3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      pointerEvents: 'none' as const,
      zIndex: 1000
    };

    return <div style={style} />;
  };

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

  return (
    <DraggablePopup
      isOpen={isOpen}
      onClose={onClose}
      title="박스 & 레이어 관리"
      width="30vw"
      height="90vh"
    >
      <div className="flex h-full flex-col lg:flex-row">
        {/* 레이어 목록 */}
        <div className="w-64 border-r p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">레이어</h3>
            <button
              onClick={handleLayerAdd}
              className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              + 새 레이어
            </button>
          </div>
          {/* 레이어 목록 렌더링 */}
          <div className="space-y-2">
            {layers.map(layer => (
              <div
                key={layer.id}
                className={`flex items-center justify-between p-2 rounded ${
                  activeLayer?.id === layer.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: layer.color }}
                  />
                  <span className="text-sm">{layer.name}</span>
                </div>
                <button
                  onClick={() => onLayerColorChange(layer.id, layerColors[Math.floor(Math.random() * layerColors.length)])}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  색상 변경
                </button>
              </div>
            ))}
          </div>
        </div>
        {/* 기존 컨텐츠 */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col h-full w-full bg-white">
            {renderToolbar()}
            <div className="flex-1 overflow-auto p-2 sm:p-4">
              {showEdgeTable ? (
                renderEdgeTable()
              ) : showGroupTable ? (
                renderGroupTable()
              ) : (
                showDetails ? renderDetailView() : renderBoxTable()
              )}
            </div>
          </div>
        </div>
      </div>
    </DraggablePopup>
  );
};