import { useState, useCallback, useRef, RefObject } from 'react';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  layerId?: string;
  id?: string;
}

interface Edge {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  type: string;
}

interface Point {
  x: number;
  y: number;
}

interface BoxRef {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const useCanvasDrawing = (
  canvasRef: RefObject<HTMLCanvasElement>,
  drawMode: boolean,
  scale: number
) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const startPointRef = useRef<Point | null>(null);
  const lastDrawnBoxRef = useRef<BoxRef | null>(null);

  const drawExistingBoxes = useCallback((
    existingBoxes: Box[] = [],
    newBoxes: Box[] = [],
    selectedBox: Box | null = null,
    edges: Edge[] = []
  ) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    const drawScaledBox = (box: Box, color: string, lineWidth: number) => {
      if (!context) return;
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.strokeRect(
        box.x * scale,
        box.y * scale,
        box.width * scale,
        box.height * scale
      );
    };

    const drawScaledLine = (edge: Edge, color: string, lineWidth: number) => {
      if (!context) return;
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.beginPath();
      context.moveTo(edge.startX * scale, edge.startY * scale);
      context.lineTo(edge.endX * scale, edge.endY * scale);
      context.stroke();

      // 화살표 그리기
      const headlen = 10 * scale;
      const angle = Math.atan2(
        (edge.endY - edge.startY) * scale,
        (edge.endX - edge.startX) * scale
      );

      context.beginPath();
      context.moveTo(edge.endX * scale, edge.endY * scale);
      context.lineTo(
        edge.endX * scale - headlen * Math.cos(angle - Math.PI / 6),
        edge.endY * scale - headlen * Math.sin(angle - Math.PI / 6)
      );
      context.moveTo(edge.endX * scale, edge.endY * scale);
      context.lineTo(
        edge.endX * scale - headlen * Math.cos(angle + Math.PI / 6),
        edge.endY * scale - headlen * Math.sin(angle + Math.PI / 6)
      );
      context.stroke();
    };

    // 기존 박스 그리기
    existingBoxes.forEach(box => {
      if (box === selectedBox) {
        context.fillStyle = 'rgba(255, 165, 0, 0.5)';
        context.fillRect(
          box.x * scale,
          box.y * scale,
          box.width * scale,
          box.height * scale
        );
        drawScaledBox(box, 'orange', 4);
      } else {
        drawScaledBox(box, box.type === 'box' ? 'blue' : 'green', 2);
      }
    });

    // 새 박스 그리기
    newBoxes.forEach(box => {
      if (box.type === 'box') {
        context.fillStyle = 'rgba(255, 165, 0, 0.5)';
        context.fillRect(
          box.x * scale,
          box.y * scale,
          box.width * scale,
          box.height * scale
        );
        drawScaledBox(box, 'red', 4);
      }
    });

    // 엣지(화살표) 그리기
    edges.forEach(edge => {
      drawScaledLine(edge, 'green', 2);
    });
  }, [canvasRef, scale]);

  const startDrawing = useCallback((x: number, y: number) => {
    setIsDrawing(true);
    startPointRef.current = { x, y };
  }, []);

  const draw = useCallback((x: number, y: number, currentBoxes: Box[]) => {
    if (!isDrawing || !startPointRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    const width = x - startPointRef.current.x;
    const height = y - startPointRef.current.y;

    // 이전에 그린 박스만 지우기
    if (lastDrawnBoxRef.current) {
      context.clearRect(
        lastDrawnBoxRef.current.x - 1,
        lastDrawnBoxRef.current.y - 1,
        lastDrawnBoxRef.current.width + 2,
        lastDrawnBoxRef.current.height + 2
      );
    }

    // 기존 박스들 다시 그리기
    drawExistingBoxes(currentBoxes);

    // 새 박스 그리기
    context.strokeStyle = 'red';
    context.lineWidth = 2;
    context.strokeRect(startPointRef.current.x, startPointRef.current.y, width, height);

    // 현재 그린 박스 정보 저장
    lastDrawnBoxRef.current = {
      x: startPointRef.current.x,
      y: startPointRef.current.y,
      width: Math.abs(width),
      height: Math.abs(height)
    };
  }, [isDrawing, canvasRef, drawExistingBoxes]);

  const endDrawing = useCallback((x: number, y: number): Box | null => {
    if (!isDrawing || !startPointRef.current) return null;

    setIsDrawing(false);
    const width = x - startPointRef.current.x;
    const height = y - startPointRef.current.y;

    const newBox: Box = {
      x: Math.min(startPointRef.current.x, x),
      y: Math.min(startPointRef.current.y, y),
      width: Math.abs(width),
      height: Math.abs(height),
      type: 'box'
    };

    startPointRef.current = null;
    lastDrawnBoxRef.current = null;
    return newBox;
  }, [isDrawing]);

  return { startDrawing, draw, endDrawing, drawExistingBoxes };
}; 