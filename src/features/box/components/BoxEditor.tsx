import React, { useState, useEffect } from 'react';
import type { Box } from '../types';

interface BoxEditorProps {
  box: Box;
  onSave: (updates: Partial<Box>) => void;
  onCancel: () => void;
}

export const BoxEditor: React.FC<BoxEditorProps> = ({
  box,
  onSave,
  onCancel,
}) => {
  const [text, setText] = useState(box.text || '');
  const [type, setType] = useState(box.type || '');

  useEffect(() => {
    setText(box.text || '');
    setType(box.type || '');
  }, [box]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      text,
      type,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold mb-4">박스 편집</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              텍스트
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              타입
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">선택하세요</option>
              <option value="title">제목</option>
              <option value="content">내용</option>
              <option value="note">노트</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onCancel}
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
        </form>
      </div>
    </div>
  );
};

export default BoxEditor; 