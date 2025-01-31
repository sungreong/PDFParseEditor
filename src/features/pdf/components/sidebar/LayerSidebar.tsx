import React from 'react';
import type { Layer } from '@/types';

interface LayerSidebarProps {
  isLayerSidebarOpen: boolean;
  setIsLayerSidebarOpen: (isOpen: boolean) => void;
  layers: Layer[];
  activeLayer: Layer | null;
  addLayer: (name: string) => void;
  removeLayer: (layerId: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  setActiveLayer: (layer: Layer) => void;
  setIsBoxDetailOpen: (isOpen: boolean) => void;
  duplicateLayer: (layerId: string) => void;
}

const LayerSidebar: React.FC<LayerSidebarProps> = ({
  isLayerSidebarOpen,
  setIsLayerSidebarOpen,
  layers,
  activeLayer,
  addLayer,
  removeLayer,
  toggleLayerVisibility,
  setActiveLayer,
  setIsBoxDetailOpen,
  duplicateLayer,
}) => {
  return (
    <div className={`fixed left-0 top-0 h-full bg-white shadow-lg transition-all duration-300 z-50 ${isLayerSidebarOpen ? 'w-80' : 'w-0'}`}>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">레이어 관리</h2>
          <button
            onClick={() => setIsLayerSidebarOpen(false)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            ✕
          </button>
        </div>
        
        {/* 레이어 목록 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <button
              onClick={() => addLayer('새 레이어')}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              + 새 레이어
            </button>
            
            {layers.map(layer => (
              <div
                key={layer.id}
                className={`p-3 rounded border ${
                  activeLayer?.id === layer.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={layer.isVisible}
                      onChange={() => toggleLayerVisibility(layer.id)}
                      className="w-4 h-4"
                    />
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: layer.color }}
                    />
                    <span>{layer.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveLayer(layer);
                        setIsBoxDetailOpen(true);
                      }}
                      className="text-blue-700 hover:bg-blue-100 hover:text-blue-700 transition-colors duration-200"
                    >
                      관리
                    </button>
                    <button
                      onClick={() => removeLayer(layer.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveLayer(layer)}
                    className={`flex-1 px-2 py-1 rounded text-sm ${
                      activeLayer?.id === layer.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    선택
                  </button>
                  <button
                    onClick={() => duplicateLayer(layer.id)}
                    className="flex-1 px-2 py-1 rounded text-sm bg-gray-100 hover:bg-gray-200"
                  >
                    복제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayerSidebar; 