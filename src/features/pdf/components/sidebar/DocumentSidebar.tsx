import React from 'react';
import type { Box, Document } from '@/types';

interface DocumentSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  file: File;
  currentDocument: Document | null;
  pageNumber: number;
  numPages: number;
  scale: number;
  isScrollMode: boolean;
  handlePageChange: (page: number) => void;
  setScale: (scale: number | ((prev: number) => number)) => void;
  setIsScrollMode: (isScrollMode: boolean) => void;
  getPageData: (fileName: string, pageNumber: number) => any;
  handleEditBox: (box: Box) => void;
  handleRemoveBox: (boxId: string) => void;
}

const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  file,
  currentDocument,
  pageNumber,
  numPages,
  scale,
  isScrollMode,
  handlePageChange,
  setScale,
  setIsScrollMode,
  getPageData,
  handleEditBox,
  handleRemoveBox,
}) => {
  return (
    <div className={`fixed right-0 top-0 h-full bg-white shadow-lg transition-all duration-300 z-50 ${isSidebarOpen ? 'w-80' : 'w-0'}`}>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">문서 정보</h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {/* 문서 정보 */}
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded">
              <h3 className="font-medium mb-2">기본 정보</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">파일명:</span> {file.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-medium">페이지:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePageChange(pageNumber - 1)}
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
                          handlePageChange(value);
                        }
                      }}
                      className="w-16 px-2 py-1 border rounded text-center text-xs"
                    />
                    <span className="text-xs">/ {numPages}</span>
                    <button
                      onClick={() => handlePageChange(pageNumber + 1)}
                      disabled={pageNumber >= numPages}
                      className="px-2 py-1 bg-gray-100 rounded text-xs disabled:opacity-50"
                    >
                      ▶
                    </button>
                  </div>
                </div>
                <p><span className="font-medium">생성일:</span> {currentDocument?.createdAt ? new Date(currentDocument.createdAt).toLocaleString() : '-'}</p>
                <p><span className="font-medium">수정일:</span> {currentDocument?.updatedAt ? new Date(currentDocument.updatedAt).toLocaleString() : '-'}</p>
              </div>
            </div>

            {/* 보기 설정 */}
            <div className="bg-white p-3 rounded border">
              <h3 className="font-medium mb-2">보기 설정</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">확대/축소</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={Math.round(scale * 100)}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        setScale(value / 100);
                      }}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value="50">50%</option>
                      <option value="75">75%</option>
                      <option value="100">100%</option>
                      <option value="125">125%</option>
                      <option value="150">150%</option>
                      <option value="175">175%</option>
                      <option value="200">200%</option>
                    </select>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => setScale(prev => Math.max(0.5, prev - 0.25))}
                        className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                        title="25% 축소"
                      >
                        -
                      </button>
                      <button
                        onClick={() => setScale(prev => Math.min(2, prev + 0.25))}
                        className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                        title="25% 확대"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => setScale(1)}
                        className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 text-xs"
                        title="기본 크기로 설정 (100%)"
                      >
                        맞춤
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">스크롤 모드</span>
                  <button
                    onClick={() => setIsScrollMode(!isScrollMode)}
                    className={`px-3 py-1 rounded text-sm ${
                      isScrollMode ? 'bg-blue-500 text-white' : 'bg-gray-100'
                    }`}
                  >
                    {isScrollMode ? '켜짐' : '꺼짐'}
                  </button>
                </div>
              </div>
            </div>

            {/* 현재 페이지 박스 정보 */}
            <div className="bg-white p-3 rounded border mt-4">
              <h3 className="font-medium mb-2">현재 페이지 박스 정보</h3>
              <div className="space-y-2">
                {file && getPageData(file.name, pageNumber)?.boxes
                  .filter(box => box.pageNumber === pageNumber)
                  .map((box: Box) => (
                  <div key={box.id} className="text-sm p-2 bg-gray-50 rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">
                        {box.text ? `${box.text.substring(0, 20)}${box.text.length > 20 ? '...' : ''}` : '(텍스트 없음)'}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditBox(box)}
                          className="text-blue-500 hover:text-blue-700 text-xs"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleRemoveBox(box.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      크기: {Math.round(box.width / scale)}×{Math.round(box.height / scale)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentSidebar; 