'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Layer, Box } from '../hooks/useLayerManager';
import DraggablePopup from './DraggablePopup';
import ToolManager from './tools/ToolManager';

// Connection 타입 정의
interface Connection {
  id: string;
  startBox: Box;
  endBox: Box;
  layerId: string;
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
  isDrawMode: boolean;
  onToggleDrawMode: () => void;
  isDrawingArrow: boolean;
  onToggleArrowDrawing: () => void;
  connections: Connection[];
  onConnectionDelete: (connectionId: string) => void;
  onConnectionAdd: (connection: Connection) => void;
  layer: Layer;
  documentName: string;
  getPageData: (documentId: string, pageNumber: number) => {
    layers: Layer[];
    boxes: Box[];
    canvases: any[];
  };
  numPages: number;
  onBoxSelect: (box: Box | null) => void;
  onBoxDelete: (boxId: string) => void;
  onBoxUpdate: (boxId: string, updates: Partial<Box>) => void;
  onBoxesUpload: (boxes: Box[]) => void;
  setIsBoxDetailOpen: (isOpen: boolean) => void;
  setOriginalBox: (box: Box | null) => void;
  setPageNumber: (pageNumber: number) => void;
}

const LayerBoxManager: React.FC<LayerBoxManagerProps> = ({
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
  isDrawMode,
  onToggleDrawMode,
  isDrawingArrow,
  onToggleArrowDrawing,
  connections,
  onConnectionDelete,
  onConnectionAdd,
  setIsBoxDetailOpen,
  setOriginalBox,
  setPageNumber
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

  // 연결선 관련 상태 추가
  const [startBox, setStartBox] = useState<Box | null>(null);

  // 모든 페이지의 박스 정보 가져오기
  const allBoxes = useMemo(() => {
    const boxes: Array<Box & { pageNumber: number }> = [];
    for (let page = 1; page <= numPages; page++) {
      const pageData = getPageData(documentName, page);
      const pageBoxes = pageData?.boxes.filter(box => box.layerId === layer.id) || [];
      boxes.push(...pageBoxes.map(box => ({ ...box, pageNumber: page })));
    }
    return boxes;
  }, [documentName, layer.id, numPages, getPageData]);

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

  // 검색어와 페이지 필터링 적용
  const filteredBoxes = useMemo(() => {
    return allBoxes
      .filter(box => {
        const matchesSearch = box.text?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
        const matchesPage = selectedPage ? box.pageNumber === selectedPage : true;
        const matchesLength = (() => {
          if (textLengthFilter.type === 'none') return true;
          const length = box.text?.length ?? 0;
          return textLengthFilter.type === 'more' 
            ? length >= textLengthFilter.value
            : length <= textLengthFilter.value;
        })();
        return matchesSearch && matchesPage && matchesLength;
      })
      .sort((a, b) => {
        if (sortBy === 'position') {
          return a.pageNumber === b.pageNumber ? a.y - b.y : a.pageNumber - b.pageNumber;
        }
        return 0;
      });
  }, [allBoxes, searchTerm, selectedPage, sortBy, textLengthFilter]);

  // JSON 다운로드 함수
  const handleDownloadJSON = useCallback(() => {
    // 모든 페이지의 데이터 수집
    const allPagesData = Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => {
      const pageData = getPageData(documentName, pageNum);
      if (!pageData) return null;

      // 현재 레이어의 박스만 필터링
      const boxes = pageData.boxes.filter(box => box.layerId === layer.id);
      
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
        id: layer.id,
        name: layer.name,
        color: layer.color
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
    a.download = `${documentName}_${layer.name}_boxes.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [documentName, layer, numPages, getPageData]);

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
                layerId: layer.id  // 현재 레이어 ID로 설정
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
  }, [layer.id, onBoxesUpload]);

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
    setSelectedBoxIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(boxId)) {
        newSet.delete(boxId);
      } else {
        newSet.add(boxId);
      }
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
    e.preventDefault(); // 기본 이벤트 방지
    e.stopPropagation(); // 이벤트 전파 중지

    // 연결 모드일 때는 연결 로직만 실행
    if (isDrawingArrow) {
      if (!startBox) {
        setStartBox(box);
      } else {
        if (startBox.id !== box.id) {
          const newConnection = {
            id: `connection_${Date.now()}`,
            start: startBox,
            end: box
          };
          onConnectionDelete(newConnection.id);
        }
        setStartBox(null);
      }
      return;
    }

    // 연결 모드가 아닐 때만 박스 선택 처리
    onBoxSelect(box);
  };

  // 박스 생성 핸들러 수정
  const handleBoxCreated = (box: Box) => {
    // 그룹 선택 관련 로직 제거
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
  const renderBox = (box: Box) => (
    <div
      key={box.id}
      className={`text-xs p-2 bg-white border rounded relative ${
        startBox?.id === box.id ? 'ring-2 ring-blue-500' : ''} 
      ${isDrawingArrow ? 'cursor-pointer' : ''}`}
      onClick={(e) => handleBoxClick(e, box)}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="text-gray-500">
          위치: ({Math.round(box.x)}, {Math.round(box.y)}) | 
          크기: {Math.round(box.width)}×{Math.round(box.height)} |
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
      <div className="text-gray-700 break-words">
        {box.text || '(텍스트 없음)'}
      </div>
      {isDrawingArrow && startBox?.id === box.id && (
        <div className="absolute inset-0 bg-blue-100 bg-opacity-20 pointer-events-none" />
      )}
    </div>
  );

  // 박스 테이블 렌더링 수정
  const renderBoxTable = () => (
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
        {selectedBoxIds.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
          >
            {selectedBoxIds.size}개 삭제
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-1 py-0.5 text-left w-8">
                <input
                  type="checkbox"
                  checked={selectedBoxIds.size > 0 && selectedBoxIds.size === filteredBoxes.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedBoxIds(new Set(filteredBoxes.map(box => box.id)));
                    } else {
                      setSelectedBoxIds(new Set());
                    }
                  }}
                  className="w-3 h-3"
                />
              </th>
              <th className="px-1 py-0.5 text-left">P</th>
              <th className="px-1 py-0.5 text-left">위치</th>
              <th className="px-1 py-0.5 text-left">크기</th>
              <th className="px-1 py-0.5 text-left">텍스트 길이</th>
              <th className="px-1 py-0.5 text-right">작업</th>
            </tr>
          </thead>
          <tbody>
            {filteredBoxes.map((box) => (
              <tr 
                key={box.id} 
                className={`border-b hover:bg-gray-50 ${
                  startBox?.id === box.id ? 'bg-blue-50' : ''
                } ${isDrawingArrow ? 'cursor-crosshair' : ''}`}
                onClick={(e) => handleBoxClick(e, box)}
              >
                <td className="px-1 py-0.5">
                  <input
                    type="checkbox"
                    checked={selectedBoxIds.has(box.id)}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

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

  // 도구 섹션 렌더링 수정
  const renderTools = () => (
    <ToolManager
      toolState={{
        isDrawMode,
        isDrawingArrow,
        startBox
      }}
      toolActions={{
        onToggleDrawMode,
        onToggleArrowDrawing,
        setStartBox
      }}
    />
  );

  return (
    <DraggablePopup
      isOpen={isOpen}
      onClose={onClose}
      title="박스 & 레이어 관리"
      width="30vw"
      height="90vh"
    >
      <div className="flex h-full flex-col lg:flex-row">
        {/* 왼쪽: 레이어 관리 패널 */}
        <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r p-2 sm:p-4 space-y-2 sm:space-y-4 overflow-auto">
          {/* 섹션 접기/펼치기 기능 */}
          <div className="space-y-2">
            {/* 레이어 추가 버튼 */}
            <button
              onClick={onLayerAdd}
              className="w-full px-2 sm:px-4 py-1 sm:py-1.5 bg-blue-500 text-white rounded text-xs sm:text-sm hover:bg-blue-600 flex items-center justify-center gap-1"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>새 레이어</span>
            </button>

            {/* 도구 관리 섹션 */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-medium text-gray-700">도구 관리</h3>
              </div>
              <div className="p-1.5 sm:p-2 bg-white">
                {renderTools()}
              </div>
            </div>

            {/* 레이어 목록 섹션 */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-medium text-gray-700">레이어 목록</h3>
                <span className="text-xs text-gray-500">{layers.length}개</span>
              </div>
              <div className="p-1.5 sm:p-2 space-y-1.5 bg-white">
                {layers.map(layer => (
                  <div
                    key={layer.id}
                    className={`rounded border text-xs sm:text-sm transition-colors ${
                      layer.id === activeLayer?.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => onLayerSelect(layer.id)}
                  >
                    <div className="p-1.5 sm:p-2 flex items-center gap-1.5 sm:gap-2">
                      <div
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="flex-1 truncate text-xs sm:text-sm">{layer.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onLayerVisibilityToggle(layer.id);
                          }}
                          className={`p-1 rounded-sm hover:bg-gray-100 transition-colors ${
                            layer.isVisible ? 'text-blue-600' : 'text-gray-400'
                          }`}
                        >
                          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                              d={layer.isVisible 
                                ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"} 
                            />
                          </svg>
                        </button>
                        {layers.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onLayerDelete(layer.id);
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-sm transition-colors"
                          >
                            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 박스 관리 패널 */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col h-full w-full bg-white">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2 p-2 border-b shrink-0">
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
            </div>
            <div className="flex-1 overflow-auto p-2 sm:p-4">
              {showDetails ? (
                <div className="h-full w-full">
                  {renderDetailView()}
                </div>
              ) : (
                <div className="h-full w-full">
                  {renderBoxTable()}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between p-2 sm:p-4 gap-2 border-t">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownloadJSON}
                  className="px-2 sm:px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs sm:text-sm transition-colors whitespace-nowrap"
                >
                  JSON 다운로드
                </button>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleUploadJSON}
                    className="hidden"
                  />
                  <span className="px-2 sm:px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs sm:text-sm transition-colors whitespace-nowrap">
                    JSON 업로드
                  </span>
                </label>
              </div>
              <div className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                총 {filteredBoxes.length}개의 박스
              </div>
            </div>
          </div>
        </div>
      </div>
    </DraggablePopup>
  );
};

export default LayerBoxManager; 