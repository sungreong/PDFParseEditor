'use client';

import React, { useState, useRef, useEffect } from 'react';

interface DraggablePopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
  height?: string;
  className?: string;
  style?: React.CSSProperties;
  zIndex?: number;
}

const DraggablePopup: React.FC<DraggablePopupProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = '600px',
  height = '400px',
  className = '',
  style = {},
  zIndex = 1000
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

  // width, height prop이 변경되면 size 상태 업데이트
  useEffect(() => {
    setSize({ width, height });
  }, [width, height]);

  // 팝업 초기 위치 설정
  useEffect(() => {
    if (isOpen && popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min((window.innerWidth - rect.width) / 2, window.innerWidth - rect.width));
      const y = Math.max(0, Math.min((window.innerHeight - rect.height) / 2, window.innerHeight - rect.height));
      setPosition({ x, y });
    }
  }, [isOpen, size.width, size.height]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleResizeStart = (e: React.MouseEvent, type: 'right' | 'bottom' | 'corner') => {
    e.preventDefault();
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
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // 화면 경계 체크
        const maxX = window.innerWidth - (popupRef.current?.offsetWidth || 0);
        const maxY = window.innerHeight - (popupRef.current?.offsetHeight || 0);
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      }
      
      if (isResizing && resizeType) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        let newWidth = initialSize.width;
        let newHeight = initialSize.height;
        
        if (resizeType === 'right' || resizeType === 'corner') {
          newWidth = Math.max(Math.min(initialSize.width + deltaX, window.innerWidth - position.x), 400);
        }
        if (resizeType === 'bottom' || resizeType === 'corner') {
          newHeight = Math.max(Math.min(initialSize.height + deltaY, window.innerHeight - position.y), 300);
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
  }, [isDragging, dragStart, isResizing, resizeType, resizeStart, initialSize, position.x, position.y]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0"
      style={{
        // backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex,
        pointerEvents: isOpen ? 'auto' : 'none',
        opacity: isOpen ? 1 : 0,
      }}
    >
      <div
        ref={popupRef}
        className="absolute bg-white rounded-lg shadow-2xl overflow-hidden"
        style={{
          ...style,
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          minWidth: '280px',
          minHeight: '300px',
        }}
      >
        {/* 헤더 */}
        <div
          className="bg-gray-100 px-4 py-3 cursor-move flex justify-between items-center border-b select-none"
          onMouseDown={handleMouseDown}
        >
          <h2 className="text-lg font-semibold text-gray-800 truncate">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="h-[calc(100%-48px)] overflow-auto">
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