import React, { useCallback, useEffect, useState } from 'react';
import type { Box } from '../types';

interface BoxResizeHandlesProps {
  box: Box;
  onResize: (updates: Partial<Box>) => void;
}

type HandlePosition = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const BoxResizeHandles: React.FC<BoxResizeHandlesProps> = ({
  box,
  onResize,
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<HandlePosition | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [originalBox, setOriginalBox] = useState<Box | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, position: HandlePosition) => {
    e.stopPropagation();
    setIsResizing(true);
    setActiveHandle(position);
    setStartPoint({ x: e.clientX, y: e.clientY });
    setOriginalBox(box);
  }, [box]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !startPoint || !originalBox || !activeHandle) return;

    const dx = e.clientX - startPoint.x;
    const dy = e.clientY - startPoint.y;

    const updates: Partial<Box> = {};

    switch (activeHandle) {
      case 'n':
        updates.y = originalBox.y + dy;
        updates.height = originalBox.height - dy;
        break;
      case 's':
        updates.height = originalBox.height + dy;
        break;
      case 'e':
        updates.width = originalBox.width + dx;
        break;
      case 'w':
        updates.x = originalBox.x + dx;
        updates.width = originalBox.width - dx;
        break;
      case 'ne':
        updates.y = originalBox.y + dy;
        updates.height = originalBox.height - dy;
        updates.width = originalBox.width + dx;
        break;
      case 'nw':
        updates.x = originalBox.x + dx;
        updates.y = originalBox.y + dy;
        updates.width = originalBox.width - dx;
        updates.height = originalBox.height - dy;
        break;
      case 'se':
        updates.width = originalBox.width + dx;
        updates.height = originalBox.height + dy;
        break;
      case 'sw':
        updates.x = originalBox.x + dx;
        updates.width = originalBox.width - dx;
        updates.height = originalBox.height + dy;
        break;
    }

    // 최소 크기 제한
    if (updates.width && updates.width < 20) {
      updates.width = 20;
      updates.x = activeHandle.includes('w') ? originalBox.x + originalBox.width - 20 : originalBox.x;
    }
    if (updates.height && updates.height < 20) {
      updates.height = 20;
      updates.y = activeHandle.includes('n') ? originalBox.y + originalBox.height - 20 : originalBox.y;
    }

    onResize(updates);
  }, [isResizing, startPoint, originalBox, activeHandle, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    setActiveHandle(null);
    setStartPoint(null);
    setOriginalBox(null);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleStyle = "w-3 h-3 bg-white border-2 border-blue-500 absolute";

  return (
    <>
      <div
        className={`${handleStyle} -top-1.5 left-1/2 transform -translate-x-1/2 cursor-n-resize`}
        onMouseDown={(e) => handleMouseDown(e, 'n')}
      />
      <div
        className={`${handleStyle} top-1/2 -right-1.5 transform -translate-y-1/2 cursor-e-resize`}
        onMouseDown={(e) => handleMouseDown(e, 'e')}
      />
      <div
        className={`${handleStyle} -bottom-1.5 left-1/2 transform -translate-x-1/2 cursor-s-resize`}
        onMouseDown={(e) => handleMouseDown(e, 's')}
      />
      <div
        className={`${handleStyle} top-1/2 -left-1.5 transform -translate-y-1/2 cursor-w-resize`}
        onMouseDown={(e) => handleMouseDown(e, 'w')}
      />
      <div
        className={`${handleStyle} -top-1.5 -right-1.5 cursor-ne-resize`}
        onMouseDown={(e) => handleMouseDown(e, 'ne')}
      />
      <div
        className={`${handleStyle} -top-1.5 -left-1.5 cursor-nw-resize`}
        onMouseDown={(e) => handleMouseDown(e, 'nw')}
      />
      <div
        className={`${handleStyle} -bottom-1.5 -right-1.5 cursor-se-resize`}
        onMouseDown={(e) => handleMouseDown(e, 'se')}
      />
      <div
        className={`${handleStyle} -bottom-1.5 -left-1.5 cursor-sw-resize`}
        onMouseDown={(e) => handleMouseDown(e, 'sw')}
      />
    </>
  );
};

export default BoxResizeHandles; 