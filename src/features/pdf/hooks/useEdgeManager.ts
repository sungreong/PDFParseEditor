import { useState, useCallback } from 'react';
import type { Box, Edge, Point } from '@/types';

interface UseEdgeManagerProps {
  activeLayer: { id: string; color: string } | null;
  scale: number;
  getPageData: (fileName: string, pageNumber: number) => any;
}

interface PageEdges {
  [pageNumber: number]: {
    [layerId: string]: Edge[];
  };
}

export const useEdgeManager = ({
  activeLayer,
  scale,
  getPageData,
}: UseEdgeManagerProps) => {
  const [pageEdges, setPageEdges] = useState<PageEdges>({});
  const [isDrawingEdge, setIsDrawingEdge] = useState(false);
  const [edgeStartBox, setEdgeStartBox] = useState<Box | null>(null);
  const [tempEndPoint, setTempEndPoint] = useState<Point | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // 엣지 추가 핸들러
  const handleAddEdge = useCallback((startBox: Box, endBox: Box) => {
    if (!activeLayer || startBox.pageNumber !== endBox.pageNumber) return;

    const newEdge: Edge = {
      id: `edge_${Date.now()}`,
      startBoxId: startBox.id,
      endBoxId: endBox.id,
      layerId: activeLayer.id,
      pageNumber: startBox.pageNumber,
      type: 'arrow',
      color: activeLayer.color
    };

    setPageEdges(prev => {
      const pageNumber = startBox.pageNumber;
      const layerId = activeLayer.id;
      
      return {
        ...prev,
        [pageNumber]: {
          ...prev[pageNumber],
          [layerId]: [...(prev[pageNumber]?.[layerId] || []), newEdge]
        }
      };
    });
  }, [activeLayer]);

  // 엣지 삭제 핸들러
  const handleRemoveEdge = useCallback((edgeId: string, pageNumber: number, layerId: string) => {
    setPageEdges(prev => {
      const updatedEdges = {
        ...prev,
        [pageNumber]: {
          ...prev[pageNumber],
          [layerId]: prev[pageNumber]?.[layerId]?.filter(edge => edge.id !== edgeId) || []
        }
      };

      return updatedEdges;
    });

    if (selectedEdgeId === edgeId) {
      setSelectedEdgeId(null);
    }
  }, [selectedEdgeId]);

  // 엣지 업데이트 핸들러
  const handleEdgeUpdate = useCallback((edgeId: string, updates: Partial<Edge>) => {
    setPageEdges(prev => {
      const newEdges = { ...prev };
      for (const pageNum in newEdges) {
        for (const layerId in newEdges[pageNum]) {
          const edgeIndex = newEdges[pageNum][layerId].findIndex(e => e.id === edgeId);
          if (edgeIndex !== -1) {
            newEdges[pageNum][layerId][edgeIndex] = {
              ...newEdges[pageNum][layerId][edgeIndex],
              ...updates
            };
            return newEdges;
          }
        }
      }
      return prev;
    });
  }, []);

  // 박스 중앙 좌표 계산
  const getBoxCenter = useCallback((box: Box): Point => {
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2
    };
  }, []);

  // 엣지 렌더링
  const renderEdges = useCallback((pageNum: number) => {
    if (!activeLayer) return null;

    const pageBoxes = getPageData(pageNum)?.boxes || [];
    const currentPageEdges = pageEdges[pageNum]?.[activeLayer.id] || [];

    // 화살표와 선 크기 조정
    const arrowScale = Math.min(3, Math.max(1.5, 2 / scale));
    const arrowWidth = 20 * arrowScale;
    const arrowHeight = 16 * arrowScale;
    const strokeWidth = Math.max(4, 6 / scale);

    return (
      <svg 
        className="absolute inset-0" 
        style={{ 
          width: '100%',
          height: '100%',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          zIndex: 20,
          pointerEvents: 'none',
          overflow: 'visible'
        }}
      >
        <defs>
          <marker
            id={`arrowhead-${pageNum}`}
            markerWidth={arrowWidth}
            markerHeight={arrowHeight}
            refX={arrowWidth - 3}
            refY={arrowHeight / 2}
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path
              d={`M 0 0 L ${arrowWidth} ${arrowHeight/2} L 0 ${arrowHeight} z`}
              fill={activeLayer.color}
            />
          </marker>
          <marker
            id={`arrowhead-selected-${pageNum}`}
            markerWidth={arrowWidth}
            markerHeight={arrowHeight}
            refX={arrowWidth - 3}
            refY={arrowHeight / 2}
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path
              d={`M 0 0 L ${arrowWidth} ${arrowHeight/2} L 0 ${arrowHeight} z`}
              fill="#3B82F6"
            />
          </marker>
        </defs>
        
        {currentPageEdges.map(edge => {
          const startBox = pageBoxes.find(box => box.id === edge.startBoxId);
          const endBox = pageBoxes.find(box => box.id === edge.endBoxId);
          
          if (!startBox || !endBox) return null;

          const startPoint = getBoxCenter(startBox);
          const endPoint = getBoxCenter(endBox);
          const isSelected = selectedEdgeId === edge.id;

          return (
            <g key={edge.id}>
              <line
                x1={startPoint.x}
                y1={startPoint.y}
                x2={endPoint.x}
                y2={endPoint.y}
                stroke={isSelected ? '#3B82F6' : edge.color}
                strokeWidth={isSelected ? strokeWidth * 1.5 : strokeWidth}
                markerEnd={`url(#${isSelected ? `arrowhead-selected-${pageNum}` : `arrowhead-${pageNum}`})`}
                className={isSelected ? 'animate-pulse' : ''}
              />
            </g>
          );
        })}

        {/* 임시 연결선 (그리는 중) */}
        {isDrawingEdge && edgeStartBox && tempEndPoint && edgeStartBox.pageNumber === pageNum && (
          <g>
            <line
              x1={getBoxCenter(edgeStartBox).x}
              y1={getBoxCenter(edgeStartBox).y}
              x2={tempEndPoint.x}
              y2={tempEndPoint.y}
              stroke={activeLayer.color}
              strokeWidth={strokeWidth}
              strokeDasharray="5,5"
              markerEnd={`url(#arrowhead-${pageNum})`}
            />
          </g>
        )}
      </svg>
    );
  }, [activeLayer, pageEdges, getPageData, scale, selectedEdgeId, getBoxCenter, isDrawingEdge, edgeStartBox, tempEndPoint]);

  // 마우스 이동 핸들러
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (isDrawingEdge && edgeStartBox) {
      const container = e.currentTarget;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      setTempEndPoint({
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale
      });
    }
  }, [isDrawingEdge, edgeStartBox, scale]);

  return {
    pageEdges,
    isDrawingEdge,
    edgeStartBox,
    tempEndPoint,
    selectedEdgeId,
    setPageEdges,
    setIsDrawingEdge,
    setEdgeStartBox,
    setTempEndPoint,
    setSelectedEdgeId,
    handleAddEdge,
    handleRemoveEdge,
    handleEdgeUpdate,
    getBoxCenter,
    renderEdges,
    handleMouseMove,
  };
}; 