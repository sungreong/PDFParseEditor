import React from 'react';
import { ToolState, ToolActions } from '../../hooks/useToolState';

interface PDFToolbarProps {
  toolState: ToolState;
  toolActions: ToolActions;
  isDrawingEdge: boolean;
  setIsDrawingEdge: (isDrawing: boolean) => void;
  scale: number;
  setScale: (scale: number | ((prev: number) => number)) => void;
  isSelectingEdge: boolean;
  setIsSelectingEdge: (isSelecting: boolean) => void;
  selectedEdgeId: string | null;
  onEdgeDelete: (edgeId: string) => void;
  isAutoConnectMode: boolean;
  setIsAutoConnectMode: (isAuto: boolean) => void;
}

const PDFToolbar: React.FC<PDFToolbarProps> = ({
  toolState,
  toolActions,
  isDrawingEdge,
  setIsDrawingEdge,
  scale,
  setScale,
  isSelectingEdge,
  setIsSelectingEdge,
  selectedEdgeId,
  onEdgeDelete,
  isAutoConnectMode,
  setIsAutoConnectMode,
}) => {
  const handleEdgeDelete = () => {
    if (!selectedEdgeId) return;
    
    if (window.confirm('선택한 연결선을 삭제하시겠습니까?')) {
      onEdgeDelete(selectedEdgeId);
      setIsSelectingEdge(false);
      
      const popup = document.createElement('div');
      popup.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded shadow-lg z-[9999] flex items-center gap-2';
      popup.innerHTML = `
        <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span class="font-medium">연결선이 삭제되었습니다</span>
      `;
      
      document.body.appendChild(popup);
      setTimeout(() => {
        popup.classList.add('opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => document.body.removeChild(popup), 300);
      }, 1500);
    }
  };

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
        {selectedEdgeId && (
          <button
            onClick={handleEdgeDelete}
            className="px-4 py-2 bg-red-500 text-black rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>연결선 삭제</span>
          </button>
        )}
        <button
          onClick={() => setIsAutoConnectMode(!isAutoConnectMode)}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            isAutoConnectMode 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } transition-colors`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>연결선 자동 연결</span>
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
    </div>
  );
};

export default PDFToolbar; 