import { useState, useCallback, useRef } from 'react';
import type { Box, Connection } from '../types';

interface BoxGroupSelectionProps {
  onConnectionAdd: (connection: Connection) => void;
  activeLayerId: string;
}

export function useBoxGroupSelection({ onConnectionAdd, activeLayerId }: BoxGroupSelectionProps) {
  const [isGroupSelecting, setIsGroupSelecting] = useState(false);
  const [selectedBoxes, setSelectedBoxes] = useState<Box[]>([]);
  const [temporaryBox, setTemporaryBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const connectionIdCounter = useRef(0);

  const generateConnectionId = useCallback(() => {
    connectionIdCounter.current += 1;
    return `connection_${connectionIdCounter.current}`;
  }, []);

  const toggleGroupSelecting = useCallback(() => {
    setIsGroupSelecting(prev => !prev);
    clearSelection();
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedBoxes([]);
    setTemporaryBox(null);
    setStartPoint(null);
  }, []);

  const handleNewSelectionBox = useCallback((box: Box, allBoxes: Box[]) => {
    if (!isGroupSelecting || !box) return;

    // 선택 영역과 겹치는 박스들 찾기
    const overlappingBoxes = allBoxes.filter(existingBox => {
      return !(
        existingBox.x > box.x + box.width ||
        existingBox.x + existingBox.width < box.x ||
        existingBox.y > box.y + box.height ||
        existingBox.y + existingBox.height < box.y
      );
    });

    // 겹치는 박스들 간의 연결 생성
    for (let i = 0; i < overlappingBoxes.length; i++) {
      for (let j = i + 1; j < overlappingBoxes.length; j++) {
        const connection: Connection = {
          id: generateConnectionId(),
          source: overlappingBoxes[i],
          target: overlappingBoxes[j],
          layerId: activeLayerId
        };
        onConnectionAdd(connection);
      }
    }

    setSelectedBoxes(overlappingBoxes);
    setTemporaryBox(null);
    setStartPoint(null);
  }, [isGroupSelecting, activeLayerId, onConnectionAdd, generateConnectionId]);

  return {
    isGroupSelecting,
    selectedBoxes,
    temporaryBox,
    startPoint,
    toggleGroupSelecting,
    clearSelection,
    handleNewSelectionBox
  };
} 