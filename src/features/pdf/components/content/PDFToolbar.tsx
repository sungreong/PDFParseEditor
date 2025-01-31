import React from 'react';

interface PDFToolbarProps {
  isLayerSidebarOpen: boolean;
  setIsLayerSidebarOpen: (isOpen: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  pageNumber: number;
  numPages: number;
  handlePageChange: (page: number) => void;
}

const PDFToolbar: React.FC<PDFToolbarProps> = ({
  isLayerSidebarOpen,
  setIsLayerSidebarOpen,
  isSidebarOpen,
  setIsSidebarOpen,
  pageNumber,
  numPages,
  handlePageChange,
}) => {
  return (
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
  );
};

export default PDFToolbar; 