'use client';

import React, { useState, useMemo } from 'react';
import type { Layer, Box, Connection } from '@/types';

interface LayerBoxManagerProps {
  isOpen: boolean;
  onClose: () => void;
  layer: Layer | null;
  documentName: string;
  pageNumber: number;
  getPageData: (documentName: string, pageNumber: number) => {
    boxes: Box[];
    canvases: any[];
  } | null;
  onBoxDelete: (boxId: string) => void;
  onBoxEdit: (box: Box) => void;
  isDrawingArrow: boolean;
  selectedBoxIds: Set<string>;
  handleBoxClick: (e: React.MouseEvent, box: Box) => void;
  handleEditBox: (e: React.MouseEvent, box: Box) => void;
  startBox: Box | null;
  numPages: number;
}

interface FilterState {
  selectedPage: number | null;
  searchTerm: string;
  textLengthFilter: {
    type: 'more' | 'less' | 'none';
    value: number;
  };
  sortBy: 'index' | 'position';
}

export const LayerBoxManager: React.FC<LayerBoxManagerProps> = ({
  layer,
  documentName,
  pageNumber,
  getPageData,
  onBoxDelete,
  onBoxEdit,
  isDrawingArrow,
  selectedBoxIds,
  handleBoxClick,
  handleEditBox,
  startBox,
  numPages,
}) => {
  // 필터 상태 관리
  const [filterState, setFilterState] = useState<FilterState>({
    selectedPage: null,
    searchTerm: '',
    textLengthFilter: { type: 'none', value: 0 },
    sortBy: 'index'
  });

  // 모든 박스 정보 가져오기
  const allBoxes = useMemo(() => {
    if (!layer || !documentName) return [];
    
    // 모든 페이지의 박스 정보 가져오기
    const boxes: Box[] = [];
    for (let page = 1; page <= numPages; page++) {
      const pageData = getPageData(documentName, page);
      if (pageData) {
        const pageBoxes = pageData.boxes.filter(box => box.layerId === layer.id);
        boxes.push(...pageBoxes);
      }
    }
    return boxes;
  }, [documentName, layer?.id, numPages, getPageData]);

  // 페이지별로 박스 그룹화
  const boxesByPage = useMemo(() => {
    const grouped = new Map<number, Box[]>();
    allBoxes.forEach((box: Box) => {
      const pageBoxes = grouped.get(box.pageNumber) || [];
      pageBoxes.push(box);
      grouped.set(box.pageNumber, pageBoxes);
    });
    return grouped;
  }, [allBoxes]);

  // 필터링된 박스 목록 계산 수정
  const filteredBoxes = useMemo(() => {
    return allBoxes.filter((box: Box) => {
      // 페이지 필터
      if (filterState.selectedPage && box.pageNumber !== filterState.selectedPage) return false;
      
      // 텍스트 검색 필터
      if (filterState.searchTerm && !box.text?.toLowerCase().includes(filterState.searchTerm.toLowerCase())) return false;
      
      // 텍스트 길이 필터
      if (filterState.textLengthFilter.type !== 'none') {
        const textLength = box.text?.length || 0;
        if (filterState.textLengthFilter.type === 'more' && textLength < filterState.textLengthFilter.value) return false;
        if (filterState.textLengthFilter.type === 'less' && textLength > filterState.textLengthFilter.value) return false;
      }
      
      return true;
    }).sort((a: Box, b: Box) => {
      if (filterState.sortBy === 'position') {
        // 페이지 번호로 먼저 정렬하고, 같은 페이지 내에서는 y 좌표로 정렬
        return a.pageNumber === b.pageNumber ? a.y - b.y : a.pageNumber - b.pageNumber;
      }
      return 0;
    });
  }, [allBoxes, filterState]);

  // 박스 렌더링 수정
  const renderBox = (box: Box) => {
    return (
      <div
        key={box.id}
        className={`text-xs p-2 bg-white border rounded relative ${
          startBox?.id === box.id ? 'ring-2 ring-blue-500' : ''} 
        ${isDrawingArrow ? 'cursor-pointer' : ''}
        ${selectedBoxIds.has(box.id) ? 'bg-blue-50' : ''}`}
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
      </div>
    );
  };

  // 상세 보기 렌더링 수정
  const renderDetailView = () => (
    <div className="flex-1 overflow-auto relative">
      <div className="space-y-2 mt-1">
        {Array.from(boxesByPage.entries())
          .filter(([pageNum]) => filterState.selectedPage ? pageNum === filterState.selectedPage : true)
          .map(([pageNum, boxes]) => {
            const filteredBoxes = boxes.filter(box => 
              filterState.searchTerm 
                ? box.text?.toLowerCase().includes(filterState.searchTerm.toLowerCase()) 
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
                    .sort((a, b) => (filterState.sortBy === 'position' ? a.y - b.y : 0))
                    .map(box => renderBox(box))}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {renderDetailView()}
    </div>
  );
}; 