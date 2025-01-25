import React, { useState, useEffect } from 'react';
import type { Box } from '../hooks/useLayerManager';

interface BoxDetailEditorProps {
  box: Box;
  onUpdate: (boxId: string, updates: Partial<Box>) => void;
}

const BoxDetailEditor: React.FC<BoxDetailEditorProps> = ({ box, onUpdate }) => {
  const [color, setColor] = useState(box.color || '');
  const [text, setText] = useState(box.text || '');

  useEffect(() => {
    setColor(box.color || '');
    setText(box.text || '');
  }, [box]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setColor(newColor);
    onUpdate(box.id, { color: newColor });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    onUpdate(box.id, { text: newText });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          박스 ID
        </label>
        <input
          type="text"
          value={box.id}
          readOnly
          className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          위치 정보
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500">X</label>
            <input
              type="number"
              value={Math.round(box.x)}
              readOnly
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Y</label>
            <input
              type="number"
              value={Math.round(box.y)}
              readOnly
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">너비</label>
            <input
              type="number"
              value={Math.round(box.width)}
              readOnly
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">높이</label>
            <input
              type="number"
              value={Math.round(box.height)}
              readOnly
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          색상
        </label>
        <input
          type="color"
          value={color}
          onChange={handleColorChange}
          className="w-full h-10 p-1 border border-gray-300 rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          텍스트 메타 정보
        </label>
        <textarea
          value={text}
          onChange={handleTextChange}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="박스와 관련된 텍스트 정보를 입력하세요..."
        />
      </div>
    </div>
  );
};

export default BoxDetailEditor; 