import React from 'react';
import type { Connection } from '../types';

interface ConnectionEditorProps {
  connection: Connection;
  onUpdate: (updates: Partial<Connection>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export const ConnectionEditor: React.FC<ConnectionEditorProps> = ({
  connection,
  onUpdate,
  onDelete,
  onClose
}) => {
  const handleDelete = () => {
    if (window.confirm('연결선을 삭제하시겠습니까?')) {
      onDelete();
      onClose();
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          레이블
        </label>
        <input
          type="text"
          value={connection.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          선 스타일
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={connection.style.color}
            onChange={(e) => onUpdate({ 
              style: { ...connection.style, color: e.target.value }
            })}
            className="w-8 h-8 p-0 border rounded"
          />
          <select
            value={connection.style.strokeWidth}
            onChange={(e) => onUpdate({
              style: { ...connection.style, strokeWidth: Number(e.target.value) }
            })}
            className="px-3 py-1 border rounded-md"
          >
            <option value="1">얇게</option>
            <option value="2">보통</option>
            <option value="3">굵게</option>
          </select>
          <select
            value={connection.style.dashArray}
            onChange={(e) => onUpdate({
              style: { ...connection.style, dashArray: e.target.value }
            })}
            className="px-3 py-1 border rounded-md"
          >
            <option value="">실선</option>
            <option value="5,5">점선</option>
            <option value="10,5">파선</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          화살표
        </label>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={connection.style.arrowHead}
            onChange={(e) => onUpdate({
              style: { ...connection.style, arrowHead: e.target.checked }
            })}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm text-gray-600">화살표 표시</span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button
          onClick={handleDelete}
          className="px-4 py-2 text-white bg-red-500 rounded-md hover:bg-red-600"
        >
          삭제
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          닫기
        </button>
      </div>
    </div>
  );
}; 
