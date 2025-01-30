import React, { useState } from 'react';
import type { Connection, ConnectionEditorProps } from '../types';

export const ConnectionEditor: React.FC<ConnectionEditorProps> = ({
  connection,
  onUpdate,
  onDelete,
  onClose,
}) => {
  const [type, setType] = useState(connection.type);
  const [color, setColor] = useState(connection.color || '#000000');
  const [label, setLabel] = useState(connection.label || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      type,
      color,
      label: label.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold mb-4">연결선 편집</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              타입
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'arrow' | 'line')}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="line">직선</option>
              <option value="arrow">화살표</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              색상
            </label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-10 p-1 border rounded-md"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              레이블
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="연결선 설명"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={onDelete}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
            >
              삭제
            </button>
            
            <div className="space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
              >
                저장
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConnectionEditor; 
