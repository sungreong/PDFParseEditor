import React from 'react';
import { Box } from '@/types';
import DraggablePopup from '@/components/common/DraggablePopup';

interface BoxDetailEditorProps {
  box: Box;
  isOpen: boolean;
  onClose: () => void;
  onSave: (box: Box) => void;
}

const BoxDetailEditor: React.FC<BoxDetailEditorProps> = ({
  box,
  isOpen,
  onClose,
  onSave,
}) => {
  const handleSave = () => {
    onSave(box);
    onClose();
  };

  return (
    <DraggablePopup
      isOpen={isOpen}
      onClose={onClose}
      title="박스 상세 정보"
      width="400px"
      height="600px"
      zIndex={20}
    >
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">ID</label>
          <input
            type="text"
            value={box.id}
            disabled
            className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">메타데이터</label>
          <textarea
            value={JSON.stringify(box.metadata, null, 2)}
            readOnly
            className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            rows={4}
          />
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            저장
          </button>
        </div>
      </div>
    </DraggablePopup>
  );
};

export default BoxDetailEditor; 