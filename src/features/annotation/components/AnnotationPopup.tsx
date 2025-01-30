import React, { useState, useEffect } from 'react';
import type { Annotation } from '../types';

interface AnnotationPopupProps {
  annotation: Annotation;
  onSave: (text: string) => void;
  onDelete: () => void;
  onClose: () => void;
  position: { x: number; y: number };
}

export const AnnotationPopup: React.FC<AnnotationPopupProps> = ({
  annotation,
  onSave,
  onDelete,
  onClose,
  position,
}) => {
  const [text, setText] = useState(annotation.text);

  useEffect(() => {
    setText(annotation.text);
  }, [annotation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSave(text.trim());
    }
  };

  return (
    <div
      className="absolute bg-white rounded-lg shadow-lg p-4 w-80"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold">주석</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          rows={3}
          placeholder="주석을 입력하세요..."
          autoFocus
        />

        <div className="flex justify-between">
          <button
            type="button"
            onClick={onDelete}
            className="px-3 py-1 text-sm text-red-600 bg-red-50 rounded-md hover:bg-red-100"
          >
            삭제
          </button>

          <div className="space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600"
            >
              저장
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AnnotationPopup; 