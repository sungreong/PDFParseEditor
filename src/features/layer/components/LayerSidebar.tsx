import React, { useState } from 'react';
import type { LayerSidebarProps, Layer } from '../types';

const LayerSidebar: React.FC<LayerSidebarProps> = ({
  isOpen,
  onClose,
  layers,
  activeLayer,
  onLayerAdd,
  onLayerDelete,
  onLayerVisibilityToggle,
  onLayerSelect,
}) => {
  const [newLayerName, setNewLayerName] = useState('');

  const handleAddLayer = () => {
    if (newLayerName.trim()) {
      onLayerAdd(newLayerName.trim());
      setNewLayerName('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-64 bg-white shadow-lg p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">레이어</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newLayerName}
            onChange={(e) => setNewLayerName(e.target.value)}
            placeholder="새 레이어 이름"
            className="flex-1 px-2 py-1 border rounded"
          />
          <button
            onClick={handleAddLayer}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            추가
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={`flex items-center p-2 rounded ${
              activeLayer?.id === layer.id ? 'bg-blue-100' : 'hover:bg-gray-100'
            }`}
          >
            <button
              onClick={() => onLayerVisibilityToggle(layer.id)}
              className="mr-2"
            >
              {layer.visible ? '👁️' : '👁️‍🗨️'}
            </button>
            <div
              className="flex-1 cursor-pointer"
              onClick={() => onLayerSelect(layer)}
            >
              {layer.name}
            </div>
            <button
              onClick={() => onLayerDelete(layer.id)}
              className="text-red-500 hover:text-red-700"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LayerSidebar; 