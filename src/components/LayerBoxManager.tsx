import React, { useState, useMemo, useEffect } from 'react';
import type { Layer, Box } from '../hooks/useLayerManager';
import DraggablePopup from './DraggablePopup';

interface LayerBoxManagerProps {
  isOpen: boolean;
  onClose: () => void;
  layer: Layer;
  documentName: string;
  getPageData: (documentId: string, pageNumber: number) => any;
  numPages: number;
  onBoxSelect: (box: Box) => void;
  onBoxDelete: (boxId: string) => void;
  onBoxUpdate: (boxId: string, updates: Partial<Box>) => void;
}

const LayerBoxManager: React.FC<LayerBoxManagerProps> = ({
  isOpen,
  onClose,
  layer,
  documentName,
  getPageData,
  numPages,
  onBoxSelect,
  onBoxDelete,
  onBoxUpdate
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

  const renderBoxTable = () => (
    <div className="flex flex-col h-full">
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
              <th className="px-1 py-0.5 text-left">텍스트</th>
              <th className="px-1 py-0.5 text-right">작업</th>
            </tr>
          </thead>
          <tbody>
            {filteredBoxes.map((box) => (
              <tr key={box.id} className="border-b hover:bg-gray-50">
                <td className="px-1 py-0.5">
                  <input
                    type="checkbox"
                    checked={selectedBoxIds.has(box.id)}
                    onChange={() => handleSelectBox(box.id)}
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
                  <button
                    onClick={() => onBoxSelect(box)}
                    className="text-blue-500 hover:text-blue-700 text-xs"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => onBoxDelete(box.id)}
                    className="text-red-500 hover:text-red-700 text-xs ml-1"
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

  const renderDetailView = () => (
    <div className="flex-1 overflow-auto">
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
                  .map(box => (
                    <div key={box.id} className="text-xs p-2 bg-white border rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-500">
                          위치: ({Math.round(box.x)}, {Math.round(box.y)}) | 
                          크기: {Math.round(box.width)}×{Math.round(box.height)} |
                          텍스트: {box.text ? `${box.text.length}자` : '0자'}
                        </span>
                        <div>
                          <button
                            onClick={() => onBoxSelect(box)}
                            className="text-blue-500 hover:text-blue-700 text-xs"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => onBoxDelete(box.id)}
                            className="text-red-500 hover:text-red-700 text-xs ml-1"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                      <div className="text-gray-700 break-words">
                        {box.text || '(텍스트 없음)'}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
    </div>
  );

  if (!isOpen) return null;

  return (
    <DraggablePopup isOpen={isOpen} onClose={onClose} title={`${layer.name} 박스 관리`}>
      <div className="flex flex-col h-full w-full">
        <div className="flex items-center gap-2 p-1 border-b shrink-0">
          <select
            value={selectedPage?.toString() || ''}
            onChange={(e) => setSelectedPage(e.target.value ? Number(e.target.value) : null)}
            className="px-1 py-0.5 border rounded text-xs"
          >
            <option value="">전체</option>
            {Array.from({ length: numPages }, (_, i) => i + 1).map(page => (
              <option key={page} value={page}>{page}p</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'index' | 'position')}
            className="px-1 py-0.5 border rounded text-xs"
          >
            <option value="index">기본</option>
            <option value="position">위치</option>
          </select>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="텍스트 검색..."
            className="px-2 py-0.5 border rounded text-xs flex-1"
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

        <div className="flex-1 min-h-0 w-full overflow-auto">
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
      </div>
    </DraggablePopup>
  );
};

export default LayerBoxManager; 