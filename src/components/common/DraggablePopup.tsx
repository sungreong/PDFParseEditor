import React, { useState, useEffect, useRef, useId } from 'react';

export interface DraggablePopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
  height?: string;
  zIndex?: number;
  position?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
}

const DraggablePopup: React.FC<DraggablePopupProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = '40vw',
  height = '40vh',
  zIndex = 0,
  position,
  onPositionChange
}) => {
  const popupId = useId();
  const popupRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(() => {
    return position || {
      x: Math.random() * (window.innerWidth - 400) + 100,
      y: Math.random() * (window.innerHeight - 400) + 100
    };
  });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 위치가 변경될 때마다 부모에게 알림
  useEffect(() => {
    onPositionChange?.(currentPosition);
  }, [currentPosition, onPositionChange]);

  // position이 변경되면 currentPosition 업데이트
  useEffect(() => {
    if (position) {
      setCurrentPosition(position);
    }
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!popupRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    
    const rect = popupRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);

    // 드래그 중인 팝업을 최상위로 올림
    if (popupRef.current) {
      popupRef.current.style.zIndex = '10000';
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      const maxX = window.innerWidth - (popupRef.current?.offsetWidth || 0);
      const maxY = window.innerHeight - (popupRef.current?.offsetHeight || 0);
      
      const newPosition = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      };
      
      setCurrentPosition(newPosition);
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      setIsDragging(false);
      // 드래그가 끝나면 원래 zIndex로 복원
      if (popupRef.current) {
        popupRef.current.style.zIndex = zIndex.toString();
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove, { capture: true });
      window.addEventListener('mouseup', handleMouseUp, { capture: true });
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove, { capture: true });
      window.removeEventListener('mouseup', handleMouseUp, { capture: true });
    };
  }, [isDragging, dragStart, zIndex]);

  if (!isOpen) return null;

  return (
    <div
      ref={popupRef}
      data-popup-id={popupId}
      className="fixed bg-white/90 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden flex flex-col"
      style={{
        left: `${currentPosition.x}px`,
        top: `${currentPosition.y}px`,
        width,
        height,
        minWidth: '320px',
        minHeight: '240px',
        zIndex,
        pointerEvents: 'auto',
        touchAction: 'none'
      }}
    >
      <div
        className="px-4 py-3 bg-white/95 border-b border-gray-200/50 cursor-move flex justify-between items-center shrink-0"
        onMouseDown={handleMouseDown}
      >
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 hover:bg-gray-200/80 rounded-full transition-colors"
        >
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {children}
      </div>
    </div>
  );
};

export default DraggablePopup; 