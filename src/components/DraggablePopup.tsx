'use client';

import React, { useState, useRef, useEffect } from 'react';

interface DraggablePopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
  height?: string;
}

const DraggablePopup: React.FC<DraggablePopupProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = '90vw',
  height = '90vh'
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width, height });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState<'right' | 'bottom' | 'corner' | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      setPosition({
        x: (window.innerWidth - rect.width) / 2,
        y: (window.innerHeight - rect.height) / 2
      });
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleResizeStart = (e: React.MouseEvent, type: 'right' | 'bottom' | 'corner') => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeType(type);
    setResizeStart({ x: e.clientX, y: e.clientY });
    setInitialSize({
      width: popupRef.current?.offsetWidth || 0,
      height: popupRef.current?.offsetHeight || 0
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      }
      
      if (isResizing && resizeType) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        let newWidth = initialSize.width;
        let newHeight = initialSize.height;
        
        if (resizeType === 'right' || resizeType === 'corner') {
          newWidth = Math.max(initialSize.width + deltaX, 400);
        }
        if (resizeType === 'bottom' || resizeType === 'corner') {
          newHeight = Math.max(initialSize.height + deltaY, 300);
        }
        
        setSize({
          width: `${newWidth}px`,
          height: `${newHeight}px`
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeType(null);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, isResizing, resizeType, resizeStart, initialSize]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" style={{ background: 'transparent', pointerEvents: 'none' }}>
      <div
        ref={popupRef}
        className="fixed bg-white rounded-lg shadow-xl overflow-hidden max-w-[95vw] max-h-[95vh]"
        style={{
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          minWidth: '280px',
          minHeight: '300px',
          pointerEvents: 'auto'
        }}
      >
        {/* 헤더 */}
        <div
          className="bg-gray-100 px-2 sm:px-4 py-2 sm:py-3 cursor-move flex justify-between items-center"
          onMouseDown={handleMouseDown}
        >
          <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800 truncate">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="h-[calc(100%-40px)] sm:h-[calc(100%-48px)] overflow-auto">
          {children}
        </div>

        {/* 리사이즈 핸들 */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 hover:opacity-50"
          onMouseDown={(e) => handleResizeStart(e, 'right')}
        />
        <div
          className="absolute left-0 right-0 bottom-0 h-1 cursor-ns-resize hover:bg-blue-500 hover:opacity-50"
          onMouseDown={(e) => handleResizeStart(e, 'bottom')}
        />
        <div
          className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize"
          onMouseDown={(e) => handleResizeStart(e, 'corner')}
        >
          <div className="absolute right-1 bottom-1 w-2 h-2 bg-gray-400 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default DraggablePopup; 