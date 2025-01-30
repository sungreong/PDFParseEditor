import React, { useState } from 'react';

interface DocumentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  file: File;
  numPages: number;
  pageNumber: number;
  scale: number;
  isScrollMode: boolean;
  isTextSelectable: boolean;
  onPageChange: (page: number) => void;
  onScaleModeChange: (scale: number) => void;
  onScrollModeChange: (isScroll: boolean) => void;
  onTextSelectableChange: (isSelectable: boolean) => void;
}

const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  isOpen,
  onClose,
  file,
  numPages,
  pageNumber,
  scale,
  isScrollMode,
  isTextSelectable,
  onPageChange,
  onScaleModeChange,
  onScrollModeChange,
  onTextSelectableChange,
}) => {
  const [pageInputValue, setPageInputValue] = useState(pageNumber.toString());

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setPageInputValue(newValue);
    
    const pageNum = parseInt(newValue);
    if (!isNaN(pageNum)) {
      if (pageNum < 1) {
        onPageChange(1);
        setPageInputValue('1');
      } else if (pageNum > numPages) {
        onPageChange(numPages);
        setPageInputValue(numPages.toString());
      } else {
        onPageChange(pageNum);
      }
    }
  };

  const handlePageInputBlur = () => {
    const pageNum = parseInt(pageInputValue);
    if (isNaN(pageNum)) {
      setPageInputValue(pageNumber.toString());
    } else if (pageNum < 1) {
      onPageChange(1);
      setPageInputValue('1');
    } else if (pageNum > numPages) {
      onPageChange(numPages);
      setPageInputValue(numPages.toString());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full bg-white border-l shadow-lg w-80 z-40">
      <div className="h-full overflow-y-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">문서 정보</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* 문서 정보 섹션 */}
          <div className="bg-gray-50 p-3 rounded-lg border">
            <h2 className="text-base font-bold mb-1">문서 정보</h2>
            <p className="text-sm text-gray-600 truncate">{file.name}</p>
          </div>

          {/* 페이지 네비게이션 섹션 */}
          <div className="bg-white rounded-lg p-3 shadow-sm border">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">페이지 탐색</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">현재 페이지</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={numPages}
                    value={pageInputValue}
                    onChange={handlePageInputChange}
                    onBlur={handlePageInputBlur}
                    className="w-16 px-2 py-1 border rounded text-center text-sm"
                  />
                  <span className="text-xs text-gray-500">/ {numPages}</span>
                </div>
              </div>
              {!isScrollMode && (
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={() => onPageChange(Math.max(pageNumber - 1, 1))}
                    disabled={pageNumber <= 1}
                    className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs disabled:opacity-50"
                  >
                    이전
                  </button>
                  <button
                    onClick={() => onPageChange(Math.min(pageNumber + 1, numPages))}
                    disabled={pageNumber >= numPages}
                    className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs disabled:opacity-50"
                  >
                    다음
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 보기 설정 섹션 */}
          <div className="bg-white rounded-lg p-3 shadow-sm border">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">보기 설정</h3>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">보기 모드</label>
                <button
                  onClick={() => onScrollModeChange(!isScrollMode)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-xs"
                >
                  {isScrollMode ? '페이지 모드로 전환' : '스크롤 모드로 전환'}
                </button>
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">텍스트 선택</label>
                <button
                  onClick={() => onTextSelectableChange(!isTextSelectable)}
                  className={`w-full px-3 py-1.5 ${
                    isTextSelectable 
                      ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  } border rounded text-xs`}
                >
                  {isTextSelectable ? '텍스트 선택 비활성화' : '텍스트 선택 활성화'}
                </button>
              </div>
            </div>
          </div>

          {/* 확대/축소 섹션 */}
          <div className="bg-white rounded-lg p-3 shadow-sm border">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              확대/축소 ({Math.round(scale * 100)}%)
            </h3>
            <div className="flex items-center justify-between gap-1">
              <button
                onClick={() => onScaleModeChange(Math.max(scale - 0.1, 0.5))}
                className="flex-1 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-xs"
              >
                축소
              </button>
              <button
                onClick={() => onScaleModeChange(1)}
                className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs"
              >
                100%
              </button>
              <button
                onClick={() => onScaleModeChange(Math.min(scale + 0.1, 2))}
                className="flex-1 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-xs"
              >
                확대
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentSidebar; 