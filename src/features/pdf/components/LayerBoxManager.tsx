'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
    console.log('=== allBoxes 계산 시작 ===');
    console.log('documentName:', documentName);
    console.log('layer:', layer);
    console.log('numPages:', numPages);

    if (!layer || !documentName) {
      console.log('layer 또는 documentName이 없음');
      return [];
    }

    const boxes: Box[] = [];
    for (let page = 1; page <= numPages; page++) {
      const pageData = getPageData(documentName, page);
      console.log(`페이지 ${page} 데이터:`, pageData);

      if (pageData) {
        const pageBoxes = pageData.boxes.filter(box => {
          const isLayerMatch = box.layerId === layer.id;
          const isPageMatch = box.pageNumber === page;
          console.log(`박스 ${box.id} - layerId 일치: ${isLayerMatch}, pageNumber 일치: ${isPageMatch}`);
          return isLayerMatch && isPageMatch;
        });

        console.log(`페이지 ${page}의 유효한 박스:`, pageBoxes);
        boxes.push(...pageBoxes);
      }
    }

    console.log('최종 allBoxes:', boxes);
    console.log('=== allBoxes 계산 완료 ===');
    return boxes;
  }, [documentName, layer?.id, numPages, getPageData]);

  // 페이지별로 박스 그룹화
  const boxesByPage = useMemo(() => {
    console.log('=== boxesByPage 계산 시작 ===');
    const grouped = new Map<number, Box[]>();
    
    allBoxes.forEach(box => {
      if (!box.pageNumber) {
        console.warn(`경고: pageNumber가 없는 박스 발견:`, box);
        return;
      }
      console.log(`박스 ${box.id}를 페이지 ${box.pageNumber}에 그룹화`);
      const pageBoxes = grouped.get(box.pageNumber) || [];
      pageBoxes.push(box);
      grouped.set(box.pageNumber, pageBoxes.sort((a, b) => a.y - b.y));
    });

    console.log('그룹화된 결과:', Object.fromEntries(grouped));
    console.log('=== boxesByPage 계산 완료 ===');
    return grouped;
  }, [allBoxes]);

  // 박스 삭제 핸들러
  const handleBoxDelete = useCallback((e: React.MouseEvent, boxId: string) => {
    e.stopPropagation();
    console.log('박스 삭제 시도:', boxId);
    onBoxDelete(boxId);
  }, [onBoxDelete]);

  // 박스 수정 핸들러
  const handleBoxEdit = useCallback((e: React.MouseEvent, box: Box) => {
    e.stopPropagation();
    console.log('박스 수정 시도:', box);
    onBoxEdit(box);
  }, [onBoxEdit]);

  // 박스 렌더링 수정
  const renderBox = (box: Box & { pageNumber: number }) => {
    const uniqueKey = `${box.id}_page${box.pageNumber}`;
    return (
      <div
        key={uniqueKey}
        className={`text-xs p-2 bg-white border rounded relative ${
          startBox?.id === box.id ? 'ring-2 ring-blue-500' : ''} 
        ${isDrawingArrow ? 'cursor-pointer' : ''}
        ${selectedBoxIds.has(box.id) ? 'bg-blue-50' : ''}`}
        onClick={(e) => handleBoxClick(e, box)}
      >
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-500">
            페이지: {box.pageNumber} |
            위치: ({Math.round(box.x)}, {Math.round(box.y)}) | 
            크기: {Math.round(box.width)}×{Math.round(box.height)} |
            텍스트: {box.text ? `${box.text.length}자` : '0자'}
          </span>
          <div>
            {!isDrawingArrow && (
              <>
                <button
                  onClick={(e) => handleBoxEdit(e, box)}
                  className="text-blue-500 hover:text-blue-700 text-xs"
                >
                  수정
                </button>
                <button
                  onClick={(e) => handleBoxDelete(e, box.id)}
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
              <div key={`page_${pageNum}`} className="mb-4">
                <div className="bg-gray-100 px-2 py-1 font-semibold text-xs sticky top-0 flex justify-between items-center">
                  <span>페이지 {pageNum}</span>
                  <span className="text-gray-500">{filteredBoxes.length}개 박스</span>
                </div>
                <div className="space-y-2 mt-1">
                  {filteredBoxes.map(box => renderBox(box))}
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