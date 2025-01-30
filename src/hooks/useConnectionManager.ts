import { useState, useCallback } from 'react';
import type { Box } from './useLayerManager';

export interface Connection {
  id: string;
  startBox: Box;
  endBox: Box;
  layerId: string;
}

export function useConnectionManager() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [startBox, setStartBox] = useState<Box | null>(null);

  const addConnection = useCallback((connection: Connection) => {
    setConnections(prev => [...prev, connection]);
  }, []);

  const removeConnection = useCallback((connectionId: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== connectionId));
  }, []);

  const handleBoxConnection = useCallback((box: Box, activeLayerId: string) => {
    if (!startBox) {
      setStartBox(box);
      return;
    }

    if (startBox.id !== box.id) {
      const newConnection: Connection = {
        id: `connection_${Date.now()}`,
        startBox: startBox,
        endBox: box,
        layerId: activeLayerId
      };
      addConnection(newConnection);
    }
    setStartBox(null);
  }, [startBox, addConnection]);

  const connectBoxesInOrder = useCallback((boxes: Box[], activeLayerId: string) => {
    if (boxes.length < 2) return;

    // 박스들을 y좌표로 정렬하고, 같은 y좌표 범위 내에서는 x좌표로 정렬
    const sortedBoxes = [...boxes].sort((a, b) => {
      const yDiff = a.y - b.y;
      // y좌표 차이가 박스 높이의 절반보다 작으면 같은 줄로 간주
      if (Math.abs(yDiff) < Math.min(a.height, b.height) / 2) {
        return a.x - b.x;
      }
      return yDiff;
    });

    // 연결선 생성
    for (let i = 0; i < sortedBoxes.length - 1; i++) {
      const newConnection: Connection = {
        id: `connection_${Date.now()}_${i}`,
        startBox: sortedBoxes[i],
        endBox: sortedBoxes[i + 1],
        layerId: activeLayerId
      };
      addConnection(newConnection);
    }
  }, [addConnection]);

  return {
    connections,
    startBox,
    addConnection,
    removeConnection,
    handleBoxConnection,
    connectBoxesInOrder,
    setStartBox
  };
} 