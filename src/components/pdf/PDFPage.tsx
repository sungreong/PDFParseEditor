import React, { useRef, useCallback } from 'react';
import { Page } from 'react-pdf';
import { ToolState, ToolActions } from '@/types/tools';
import { useLayerManager } from '@/hooks/useLayerManager';
import type { Box, Layer } from '@/hooks/useLayerManager';

interface PDFPageProps {
  pageNumber: number;
  scale: number;
  isTextSelectable: boolean;
  toolState: ToolState;
  toolActions: ToolActions;
  onBoxSelect: (boxId: string) => void;
}

const PDFPage: React.FC<PDFPageProps> = ({
  pageNumber,
  scale,
  isTextSelectable,
  toolState,
  toolActions,
  onBoxSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    activeLayer,
    getPageData,
    setCanvasRef,
    addBox,
    updateBox,
    redrawAllCanvases,
  } = useLayerManager();

  // 박스 그리기 관련 상태
  const [startPoint, setStartPoint] = React.useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = React.useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // 캔버스 이벤트 핸들러
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!toolState.isDrawMode || !activeLayer) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setStartPoint({ x, y });
  }, [toolState.isDrawMode, activeLayer, scale]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!toolState.isDrawMode || !startPoint || !activeLayer) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    setCurrentBox({
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y)
    });
  }, [toolState.isDrawMode, startPoint, activeLayer, scale]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!toolState.isDrawMode || !startPoint || !currentBox || !activeLayer) return;
    
    // 텍스트 레이어에서 선택된 영역의 텍스트 추출
    const textLayer = e.currentTarget.parentElement?.querySelector('.react-pdf__Page__textContent') as HTMLElement;
    let selectedText = '';
    
    if (textLayer) {
      const textElements = Array.from(textLayer.getElementsByTagName('span'));
      const scale = 1; // 스케일은 나중에 계산
      
      textElements.forEach(span => {
        const rect = span.getBoundingClientRect();
        const canvasRect = e.currentTarget.getBoundingClientRect();
        
        const elementX = (rect.left - canvasRect.left) / scale;
        const elementY = (rect.top - canvasRect.top) / scale;
        const elementRight = elementX + (rect.width / scale);
        const elementBottom = elementY + (rect.height / scale);

        if (
          elementX < (currentBox.x + currentBox.width) &&
          elementRight > currentBox.x &&
          elementY < (currentBox.y + currentBox.height) &&
          elementBottom > currentBox.y
        ) {
          selectedText += span.textContent + ' ';
        }
      });
    }

    // 박스 추가
    const newBox = {
      ...currentBox,
      type: 'box',
      text: selectedText.trim(),
      layerId: activeLayer.id,
    };

    addBox('document', pageNumber, newBox);
    setStartPoint(null);
    setCurrentBox(null);
  }, [toolState.isDrawMode, startPoint, currentBox, activeLayer, pageNumber, addBox, scale]);

  // 박스 클릭 핸들러
  const handleBoxClick = useCallback((boxId: string, e: React.MouseEvent) => {
    if (toolState.isMultiSelectMode) {
      e.stopPropagation();
      onBoxSelect(boxId);
    }
  }, [toolState.isMultiSelectMode, onBoxSelect]);

  const pageData = getPageData('document', pageNumber);

  return (
    <div 
      ref={containerRef}
      className="pdf-page-container relative"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
      }}
    >
      <div 
        className={`pdf-page ${isTextSelectable ? 'selectable' : ''} relative`}
        style={{
          position: 'relative',
          zIndex: isTextSelectable ? 10 : 1
        }}
      >
        <Page
          pageNumber={pageNumber}
          renderTextLayer={true}
          renderAnnotationLayer={false}
          loading={
            <div className="w-full h-[500px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          }
        />

        {pageData?.canvases.map(canvas => (
          <canvas
            key={canvas.layerId}
            ref={ref => {
              if (ref && ref !== canvas.canvasRef) {
                setCanvasRef('document', pageNumber, canvas.layerId, ref);
              }
            }}
            className={`canvas-layer ${toolState.isDrawMode && activeLayer?.id === canvas.layerId ? 'active' : ''}`}
            style={{
              opacity: 0.7,
              display: canvas.layerId === activeLayer?.id ? 'block' : 'none',
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: isTextSelectable ? 'none' : (toolState.isDrawMode && activeLayer?.id === canvas.layerId ? 'auto' : 'none'),
              zIndex: isTextSelectable ? 1 : 2,
              backgroundColor: 'transparent'
            }}
            onMouseDown={!isTextSelectable ? handleCanvasMouseDown : undefined}
            onMouseMove={!isTextSelectable ? handleCanvasMouseMove : undefined}
            onMouseUp={!isTextSelectable ? handleCanvasMouseUp : undefined}
          />
        ))}

        {/* 현재 그리고 있는 박스 미리보기 */}
        {currentBox && toolState.isDrawMode && !isTextSelectable && (
          <div
            className="box-preview"
            style={{
              position: 'absolute',
              left: `${currentBox.x}px`,
              top: `${currentBox.y}px`,
              width: `${currentBox.width}px`,
              height: `${currentBox.height}px`,
              border: `2px solid ${activeLayer?.color || '#000'}`,
              zIndex: 3
            }}
          />
        )}

        {/* 그려진 박스들 표시 */}
        {pageData?.boxes.map(box => {
          const layer = pageData.layers.find(l => l.id === box.layerId);
          if (!layer?.isVisible) return null;

          const isSelected = toolState.selectedBoxes.includes(box.id);

          return (
            <div
              key={box.id}
              className={`box absolute border-2 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
              style={{
                left: `${box.x}px`,
                top: `${box.y}px`,
                width: `${box.width}px`,
                height: `${box.height}px`,
                borderColor: isSelected ? '#2196F3' : (box.color || layer.color),
                backgroundColor: isSelected ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
                pointerEvents: isTextSelectable ? 'none' : 'auto',
                cursor: toolState.isMultiSelectMode ? 'pointer' : 'default'
              }}
              onClick={(e) => handleBoxClick(box.id, e)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PDFPage; 