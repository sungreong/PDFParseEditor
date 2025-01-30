import React from 'react';
import type { Layer } from '@/hooks/useLayerManager';

interface LayerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  layers: Layer[];
  activeLayer: Layer | null;
  onLayerAdd: (name: string, color: string) => Layer | null;
  onLayerDelete: (layerId: string) => void;
  onLayerVisibilityToggle: (layerId: string) => void;
  onLayerSelect: (layer: Layer) => void;
}

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
  const handleAddLayer = () => {
    const name = prompt('새 레이어 이름을 입력하세요:');
    if (!name) return;

    // 레이어 이름 중복 체크
    const isNameExists = layers.some(layer => layer.name === name);
    if (isNameExists) {
      alert('이미 존재하는 레이어 이름입니다. 다른 이름을 입력해주세요.');
      return;
    }

    // HSL을 HEX로 변환하는 함수
    const hslToHex = (h: number, s: number, l: number) => {
      l /= 100;
      const a = s * Math.min(l, 1 - l) / 100;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };

    // 랜덤 HSL 색상 생성
    const hue = Math.floor(Math.random() * 360);
    const saturation = Math.floor(Math.random() * 30) + 70; // 70-100% 채도
    const lightness = Math.floor(Math.random() * 20) + 40; // 40-60% 명도
    const defaultColor = hslToHex(hue, saturation, lightness);
    
    const newLayer = onLayerAdd(name, defaultColor);
    
    // 색상 선택기 대화상자 생성
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.value = defaultColor;
    
    colorPicker.addEventListener('change', (e) => {
      const color = (e.target as HTMLInputElement).value;
      if (newLayer) {
        onLayerSelect({ ...newLayer, color });
      }
    });

    colorPicker.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-14 h-full bg-white border-r shadow-lg w-80 z-40">
      <div className="h-full overflow-y-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">레이어 관리</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <button
              onClick={handleAddLayer}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-lg">+</span>
              <span>새 레이어 추가</span>
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-2 px-2">
              전체 레이어 ({layers.length})
            </div>
            <div className="space-y-2">
              {layers.map(layer => (
                <div
                  key={layer.id}
                  className={`bg-white rounded-lg p-3 border transition-colors ${
                    activeLayer?.id === layer.id ? 'border-blue-300 shadow-sm' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layer.isVisible}
                        onChange={() => onLayerVisibilityToggle(layer.id)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span
                        className={`cursor-pointer ${
                          activeLayer?.id === layer.id ? 'font-semibold' : ''
                        }`}
                        onClick={() => onLayerSelect(layer)}
                      >
                        {layer.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end text-sm">
                    <button
                      onClick={() => onLayerDelete(layer.id)}
                      className="px-2 py-1 text-red-500 hover:bg-red-50 rounded transition-colors text-xs"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayerSidebar; 