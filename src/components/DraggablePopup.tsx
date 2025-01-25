import React, { useState, useRef, useEffect } from 'react';

interface DraggablePopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const DraggablePopup: React.FC<DraggablePopupProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 300, y: window.innerHeight / 2 - 400 });
  const [size, setSize] = useState({ width: 600, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsDragging(true);
      const rect = popupRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.stopPropagation();
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        setPosition({ x: newX, y: newY });
      }
      
      if (isResizing && popupRef.current) {
        const rect = popupRef.current.getBoundingClientRect();
        const newWidth = e.clientX - rect.left;
        const newHeight = e.clientY - rect.top;
        
        // 최소/최대 크기 제한
        const clampedWidth = Math.max(400, Math.min(1200, newWidth));
        const clampedHeight = Math.max(300, Math.min(800, newHeight));
        
        setSize({ width: clampedWidth, height: clampedHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset]);

  if (!isOpen) return null;

  return (
    <div
      ref={popupRef}
      className="fixed bg-white rounded-lg shadow-xl flex flex-col"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        minWidth: '400px',
        minHeight: '300px',
        maxWidth: '1200px',
        maxHeight: '800px',
        zIndex: 50
      }}
    >
      {/* 헤더 */}
      <div
        className="px-4 py-2 bg-gray-100 rounded-t-lg cursor-move flex justify-between items-center shrink-0"
        onMouseDown={handleMouseDown}
      >
        <h2 className="text-sm font-semibold">{title}</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 w-full h-full overflow-hidden">
        {children}
      </div>

      {/* 리사이즈 핸들 */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-200 hover:bg-gray-300"
        onMouseDown={handleResizeMouseDown}
        style={{
          clipPath: 'polygon(100% 0, 100% 100%, 0 100%)'
        }}
      />
    </div>
  );
};

export default DraggablePopup; 