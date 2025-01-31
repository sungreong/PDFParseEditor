import React from 'react';
import { ToolState, ToolActions } from '../../hooks/useToolState';

interface PDFToolbarProps {
  toolState: ToolState;
  toolActions: ToolActions;
  isDrawingEdge: boolean;
  setIsDrawingEdge: (isDrawing: boolean) => void;
  scale: number;
  setScale: (scale: number | ((prev: number) => number)) => void;
  selectedBoxIds: Set<string>;
  handleMultipleDelete: () => void;
  isSelectingEdge: boolean;
  setIsSelectingEdge: (isSelecting: boolean) => void;
}

const PDFToolbar: React.FC<PDFToolbarProps> = ({
  toolState,
  toolActions,
  isDrawingEdge,
  setIsDrawingEdge,
  scale,
  setScale,
  selectedBoxIds,
  handleMultipleDelete,
  isSelectingEdge,
  setIsSelectingEdge,
}) => {
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-3 flex gap-3 z-[9999]">
      <div className="flex items-center gap-3 border-r pr-3">
        <button
          onClick={toolActions.onToggleDrawMode}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            toolState.isDrawMode 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } transition-colors`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>박스 그리기</span>
        </button>
        <button
          onClick={() => setIsDrawingEdge(!isDrawingEdge)}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            isDrawingEdge 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } transition-colors`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <span>연결선 그리기</span>
        </button>
        <button
          onClick={() => setIsSelectingEdge(!isSelectingEdge)}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            isSelectingEdge 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } transition-colors`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>연결선 선택</span>
        </button>
        <button
          onClick={toolActions.onToggleMultiSelect}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            toolState.isMultiSelectMode 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } transition-colors`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16M4 12h16m-7 7h7" />
          </svg>
          <span>다중 선택</span>
        </button>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))}
          className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
          </svg>
          <span>축소</span>
        </button>
        <span className="min-w-[80px] text-center font-medium">{Math.round(scale * 100)}%</span>
        <button
          onClick={() => setScale(prev => Math.min(2, prev + 0.1))}
          className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>확대</span>
        </button>
      </div>
      {selectedBoxIds.size > 0 && (
        <button
          onClick={handleMultipleDelete}
          className="px-3 py-1.5 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          선택한 박스 삭제 ({selectedBoxIds.size})
        </button>
      )}
    </div>
  );
};

export default PDFToolbar; 