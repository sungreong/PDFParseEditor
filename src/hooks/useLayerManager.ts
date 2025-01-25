import { useState, useCallback, useRef, useEffect } from 'react';

export interface Layer {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
}

export interface Box {
  id: string;
  layerId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  color?: string;
  text?: string;
}

interface LayerCanvas {
  layerId: string;
  canvasRef: HTMLCanvasElement | null;
}

interface PageData {
  boxes: Box[];
  canvases: LayerCanvas[];
  layers?: Layer[];
}

interface DocumentData {
  [pageNumber: string]: PageData;
}

interface LayerManagerState {
  [documentId: string]: DocumentData;
}

export function useLayerManager() {
  const [layers, setLayers] = useState<Layer[]>([
    {
      id: 'default',
      name: '기본 레이어',
      color: '#000000',
      isVisible: true,
    }
  ]);
  const [layersByDocument, setLayersByDocument] = useState<LayerManagerState>({});
  const [activeLayer, setActiveLayer] = useState<Layer>(layers[0]);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);

  // 문서와 페이지에 대한 초기화
  const initializeDocumentPage = useCallback((documentId: string, pageNumber: number) => {
    setLayersByDocument(prev => {
      if (prev[documentId]?.[pageNumber]) return prev;

      // 기존 레이어들의 캔버스 생성
      const allCanvases = layers.map(layer => ({ 
        layerId: layer.id, 
        canvasRef: null 
      }));

      return {
        ...prev,
        [documentId]: {
          ...prev[documentId],
          [pageNumber]: {
            boxes: [],
            canvases: allCanvases
          }
        }
      };
    });
  }, [layers]);

  // 새 레이어 추가
  const addLayer = useCallback((name: string, color: string): Layer => {
    const newLayer: Layer = {
      id: `layer_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name,
      color,
      isVisible: true
    };

    // 레이어 상태 업데이트
    setLayers(prevLayers => [...prevLayers, newLayer]);

    // layersByDocument 상태 업데이트
    setLayersByDocument(prevDoc => {
      const newState = { ...prevDoc };
      
      // 각 문서와 페이지에 새 레이어의 캔버스 추가
      for (const documentId in newState) {
        for (const pageNumber in newState[documentId]) {
          const pageData = newState[documentId][pageNumber];
          // 이미 존재하는 레이어인지 확인
          const existingCanvas = pageData.canvases.find(canvas => canvas.layerId === newLayer.id);
          
          if (!existingCanvas) {
            newState[documentId][pageNumber] = {
              boxes: pageData.boxes || [],
              canvases: [...pageData.canvases, { layerId: newLayer.id, canvasRef: null }]
            };
          }
        }
      }
      
      return newState;
    });

    // 활성 레이어 설정
    setActiveLayer(newLayer);

    return newLayer;
  }, []);

  // 레이어 삭제
  const removeLayer = useCallback((layerId: string) => {
    // 기본 레이어는 삭제할 수 없음
    if (layerId === 'default') return;

    setLayers(prev => {
      const updatedLayers = prev.filter(layer => layer.id !== layerId);
      if (activeLayer.id === layerId) {
        setActiveLayer(updatedLayers[0]);
      }
      return updatedLayers;
    });

    // 모든 페이지에서 해당 레이어의 박스와 캔버스 제거
    setLayersByDocument(prev => {
      const newState = { ...prev };
      Object.entries(newState).forEach(([documentId, document]) => {
        Object.entries(document).forEach(([pageNumber, pageData]) => {
          if (pageData) {
            newState[documentId][parseInt(pageNumber)] = {
              boxes: pageData.boxes.filter((box: Box) => box.layerId !== layerId),
              canvases: pageData.canvases.filter((canvas: LayerCanvas) => canvas.layerId !== layerId)
            };
          }
        });
      });
      return newState;
    });
  }, [activeLayer]);

  // 레이어 표시/숨김 토글
  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayers(prev => 
      prev.map(layer =>
        layer.id === layerId ? { ...layer, isVisible: !layer.isVisible } : layer
      )
    );
  }, []);

  // 캔버스 참조 설정
  const setCanvasRef = useCallback((documentId: string, pageNumber: number, layerId: string, ref: HTMLCanvasElement | null) => {
    setLayersByDocument(prev => {
      const pageData = prev[documentId]?.[pageNumber];
      if (!pageData) return prev;

      const existingCanvas = pageData.canvases.find(canvas => canvas.layerId === layerId);
      if (existingCanvas?.canvasRef === ref) return prev;

      const updatedCanvases = pageData.canvases.map(canvas =>
        canvas.layerId === layerId ? { ...canvas, canvasRef: ref } : canvas
      );

      return {
        ...prev,
        [documentId]: {
          ...prev[documentId],
          [pageNumber]: {
            ...pageData,
            canvases: updatedCanvases
          }
        }
      };
    });
  }, []);

  // 박스 그리기 함수
  const drawBox = useCallback((ctx: CanvasRenderingContext2D, box: Box, color: string, isDashed = false) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.fillStyle = color + '20';
    if (isDashed) {
      ctx.setLineDash([5, 3]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.lineWidth = 2;
    ctx.rect(box.x, box.y, box.width, box.height);
    ctx.stroke();
    ctx.fill();
  }, []);

  // 캔버스 다시 그리기
  const redrawCanvas = useCallback((documentId: string, pageNumber: number, layerId: string) => {
    const pageData = layersByDocument[documentId]?.[pageNumber];
    if (!pageData) return;

    const canvas = pageData.canvases.find(c => c.layerId === layerId)?.canvasRef;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 해당 레이어의 박스들만 그리기
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !layer.isVisible) return;

    // 활성 레이어의 박스만 그리기
    if (activeLayer && layerId === activeLayer.id) {
      const boxes = pageData.boxes.filter(box => box.layerId === layerId);
      boxes.forEach(box => {
        const isSelected = selectedBox?.id === box.id;
        drawBox(ctx, box, box.color || layer.color, isSelected);
      });
    }
  }, [layersByDocument, layers, selectedBox, drawBox, activeLayer]);

  // 모든 캔버스 다시 그리기
  const redrawAllCanvases = useCallback((documentId: string, pageNumber: number) => {
    const pageData = layersByDocument[documentId]?.[pageNumber];
    if (!pageData) return;

    // 모든 캔버스 초기화
    pageData.canvases.forEach(canvas => {
      if (canvas.canvasRef) {
        const ctx = canvas.canvasRef.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.canvasRef.width, canvas.canvasRef.height);
        }
      }
    });

    // 활성 레이어의 캔버스만 다시 그리기
    if (activeLayer) {
      redrawCanvas(documentId, pageNumber, activeLayer.id);
    }
  }, [layersByDocument, activeLayer, redrawCanvas]);

  // 박스 추가
  const addBox = useCallback((documentId: string, pageNumber: number, box: Omit<Box, 'id' | 'layerId'>) => {
    if (!activeLayer) return;

    const newBox: Box = {
      ...box,
      id: `box_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      layerId: activeLayer.id,
      color: activeLayer.color
    };

    setLayersByDocument(prev => {
      const pageData = prev[documentId]?.[pageNumber];
      if (!pageData) return prev;

      return {
        ...prev,
        [documentId]: {
          ...prev[documentId],
          [pageNumber]: {
            ...pageData,
            boxes: [...pageData.boxes, newBox]
          }
        }
      };
    });

    return newBox;
  }, [activeLayer]);

  // 박스 삭제
  const removeBox = useCallback((documentId: string, pageNumber: number, boxId: string) => {
    setLayersByDocument(prev => {
      const pageData = prev[documentId]?.[pageNumber];
      if (!pageData) return prev;

      return {
        ...prev,
        [documentId]: {
          ...prev[documentId],
          [pageNumber]: {
            ...pageData,
            boxes: pageData.boxes.filter(box => box.id !== boxId)
          }
        }
      };
    });

    if (selectedBox?.id === boxId) {
      setSelectedBox(null);
    }
  }, [selectedBox]);

  // 박스 업데이트
  const updateBox = useCallback((documentId: string, pageNumber: number, boxId: string, updates: Partial<Box>) => {
    setLayersByDocument(prev => {
      const pageData = prev[documentId]?.[pageNumber];
      if (!pageData) return prev;

      return {
        ...prev,
        [documentId]: {
          ...prev[documentId],
          [pageNumber]: {
            ...pageData,
            boxes: pageData.boxes.map(box =>
              box.id === boxId ? { ...box, ...updates } : box
            )
          }
        }
      };
    });
  }, []);

  // 페이지 데이터 가져오기를 최적화
  const getPageData = useCallback((documentId: string, pageNumber: number) => {
    const pageData = layersByDocument[documentId]?.[pageNumber];
    
    // 해당 페이지에 있는 레이어 ID만 필터링
    const pageLayerIds = new Set(pageData?.canvases.map(canvas => canvas.layerId) || []);
    const filteredLayers = layers.filter(layer => pageLayerIds.has(layer.id));
    
    return {
      layers: filteredLayers,
      boxes: pageData?.boxes || [],
      canvases: pageData?.canvases || []
    };
  }, [layers, layersByDocument]);

  // layers 변경 시 UI 업데이트를 위한 useEffect
  useEffect(() => {
    const redrawTimeout = setTimeout(() => {
      // 모든 문서의 모든 페이지의 캔버스 다시 그리기
      Object.entries(layersByDocument).forEach(([documentId, pages]) => {
        Object.keys(pages).forEach(pageNumber => {
          const pageNum = parseInt(pageNumber);
          const pageData = pages[pageNum];
          
          // 각 레이어의 캔버스만 다시 그리기
          pageData.canvases.forEach(canvas => {
            if (canvas.canvasRef) {
              const layer = layers.find(l => l.id === canvas.layerId);
              if (layer) {
                redrawCanvas(documentId, pageNum, layer.id);
              }
            }
          });
        });
      });
    }, 0);

    return () => clearTimeout(redrawTimeout);
  }, [layers.length, activeLayer?.id]); // 레이어 개수와 활성 레이어 ID만 감시

  const updateLayerBoxesColor = useCallback((documentId: string, pageNumber: number, layerId: string, color: string) => {
    setLayersByDocument(prev => {
      const documentKey = `${documentId}_${pageNumber}`;
      const pageData = prev[documentKey];
      if (!pageData) return prev;

      const updatedBoxes = pageData.boxes.map((box: Box) => 
        box.layerId === layerId ? { ...box, color } : box
      );

      return {
        ...prev,
        [documentKey]: {
          ...pageData,
          boxes: updatedBoxes
        }
      };
    });
  }, []);

  return {
    layers,
    layersByDocument,
    activeLayer,
    selectedBox,
    setLayers,
    setActiveLayer,
    setSelectedBox,
    initializeDocumentPage,
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    setCanvasRef,
    addBox,
    removeBox,
    updateBox,
    getPageData,
    redrawCanvas,
    redrawAllCanvases,
    updateLayerBoxesColor,
  };
} 