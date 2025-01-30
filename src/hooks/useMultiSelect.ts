import { useState, useCallback } from 'react';
import type { Box, Point } from '../types';

interface UseMultiSelectProps {
  activeLayerId: string | undefined;
  excludeBoxId?: string | null;
}

export function useMultiSelect({ activeLayerId, excludeBoxId }: UseMultiSelectProps) {
  const [selectedBoxes, setSelectedBoxes] = useState<Box[]>([]);
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null);

  const startSelection = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    setSelectionStart(point);
    setSelectionEnd(point);
  }, []);

  const updateSelection = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectionStart) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    setSelectionEnd(point);
  }, [selectionStart]);

  const endSelection = useCallback(() => {
    setSelectionStart(null);
    setSelectionEnd(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedBoxes([]);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, []);

  const toggleBoxSelection = useCallback((box: Box) => {
    if (excludeBoxId && box.id === excludeBoxId) return;
    if (box.layerId !== activeLayerId) return;

    setSelectedBoxes(prev => {
      const isSelected = prev.some(selectedBox => selectedBox.id === box.id);
      if (isSelected) {
        return prev.filter(selectedBox => selectedBox.id !== box.id);
      } else {
        return [...prev, box];
      }
    });
  }, [excludeBoxId, activeLayerId]);

  const selectBoxesInArea = useCallback((boxes: Box[]) => {
    if (!activeLayerId || !selectionStart || !selectionEnd) return;

    const left = Math.min(selectionStart.x, selectionEnd.x);
    const right = Math.max(selectionStart.x, selectionEnd.x);
    const top = Math.min(selectionStart.y, selectionEnd.y);
    const bottom = Math.max(selectionStart.y, selectionEnd.y);

    const newSelectedBoxes = boxes.filter(box => {
      if (excludeBoxId && box.id === excludeBoxId) return false;
      if (box.layerId !== activeLayerId) return false;

      const boxRight = box.x + box.width;
      const boxBottom = box.y + box.height;

      return (
        box.x < right &&
        boxRight > left &&
        box.y < bottom &&
        boxBottom > top
      );
    });

    setSelectedBoxes(newSelectedBoxes);
  }, [activeLayerId, excludeBoxId, selectionStart, selectionEnd]);

  return {
    selectedBoxes,
    selectionStart,
    selectionEnd,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    toggleBoxSelection,
    selectBoxesInArea,
    setSelectedBoxes
  };
} 