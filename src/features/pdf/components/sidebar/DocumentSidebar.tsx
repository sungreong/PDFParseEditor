import React from 'react';

interface DocumentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  file: File;
  numPages: number;
  pageNumber: number;
  scale: number;
  isScrollMode: boolean;
  isTextSelectable: boolean;
  onPageChange: (pageNumber: number) => void;
  onScaleModeChange: (scale: number) => void;
  onScrollModeChange: (isScrollMode: boolean) => void;
  onTextSelectableChange: (isTextSelectable: boolean) => void;
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
  if (!isOpen) return null;

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">문서 설정</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-medium mb-2">파일 정보</h3>
          <p className="text-sm text-gray-600">{file.name}</p>
          <p className="text-sm text-gray-600">
            총 {numPages}페이지
          </p>
        </div>

        <div>
          <h3 className="font-medium mb-2">페이지 이동</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
              disabled={pageNumber <= 1}
              className="px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
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
                  onPageChange(value);
                }
              }}
              className="w-16 px-2 py-1 border rounded text-center"
            />
            <span className="text-gray-500">/ {numPages}</span>
            <button
              onClick={() => onPageChange(Math.min(numPages, pageNumber + 1))}
              disabled={pageNumber >= numPages}
              className="px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
            >
              ▶
            </button>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">확대/축소</h3>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={scale}
            onChange={(e) => onScaleModeChange(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-center text-sm text-gray-600">
            {Math.round(scale * 100)}%
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">보기 설정</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isScrollMode}
              onChange={(e) => onScrollModeChange(e.target.checked)}
            />
            <span>스크롤 모드</span>
          </label>
          <label className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={isTextSelectable}
              onChange={(e) => onTextSelectableChange(e.target.checked)}
            />
            <span>텍스트 선택 가능</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default DocumentSidebar; 