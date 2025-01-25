import React from 'react';
import { Layer } from '../types';

interface SidebarProps {
  file: File | null;
  pageNumber: number;
  activeLayer: Layer | null;
  isDrawMode: boolean;
  isSidebarOpen: boolean;
  onSidebarToggle: () => void;
  onAddLayer: () => void;
  onLayerChange: (layer: Layer) => void;
  onVisibilityToggle: (layerId: string) => void;
  onLayerDelete: (layerId: string) => void;
  getPageData: (fileName: string, pageNumber: number) => any;
}

const Sidebar: React.FC<SidebarProps> = ({
  file,
  pageNumber,
  activeLayer,
  isDrawMode,
  isSidebarOpen,
  onSidebarToggle,
  onAddLayer,
  onLayerChange,
  onVisibilityToggle,
  onLayerDelete,
  getPageData,
}) => {
  if (!file) return null;
  const pageData = getPageData(file.name, pageNumber);
  if (!pageData) return null;

  const { layers = [] } = pageData;

  return (
    <div 
      className={`fixed right-0 top-0 h-full bg-white shadow-lg transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'w-64' : 'w-0'
      }`}
    >
      <div className="relative h-full flex flex-col">
        <button
          onClick={onSidebarToggle}
          className="absolute -left-10 top-4 bg-white p-2 rounded-l-lg shadow-lg hover:bg-gray-100"
        >
          {isSidebarOpen ? '→' : '←'}
        </button>

        {/* 사이드바 헤더 */}
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold mb-2">문서 정보</h2>
          <p className="text-sm text-gray-600">
            {file.name}
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* 레이어 관리 섹션 */}
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <h3 className="font-semibold text-gray-700 mb-3">레이어 관리</h3>
              <div className="space-y-3">
                <div>
                  <button
                    onClick={onAddLayer}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    새 레이어 추가
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {layers.map((layer: Layer) => (
                    <div 
                      key={layer.id} 
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={activeLayer?.id === layer.id}
                          onChange={() => onLayerChange(layer)}
                          className="rounded"
                        />
                        <input
                          type="checkbox"
                          checked={layer.isVisible}
                          onChange={() => onVisibilityToggle(layer.id)}
                          className="rounded"
                        />
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border border-gray-300"
                            style={{ backgroundColor: layer.color }}
                          />
                          <span className="text-sm">{layer.name}</span>
                        </div>
                      </div>
                      {layer.id !== 'default' && (
                        <button
                          onClick={() => onLayerDelete(layer.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 그리기 모드 섹션 */}
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <h3 className="font-semibold text-gray-700 mb-3">그리기 모드</h3>
              <div>
                <button
                  onClick={() => onLayerChange(activeLayer!)}
                  className={`w-full px-4 py-2 transition-colors ${
                    isDrawMode 
                      ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  } border rounded text-sm`}
                >
                  {isDrawMode ? '그리기 모드 비활성화' : '그리기 모드 활성화'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 