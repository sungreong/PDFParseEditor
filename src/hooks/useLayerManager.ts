import { useState, useCallback, useRef, useEffect } from 'react';
import type { DocumentPageData, Layer as LayerType, Box as BoxType } from '@/features/layer/types';

export interface Layer extends LayerType {
  boxesByPage: Record<number, BoxType[]>;
  boxes: BoxType[];
}

export interface Box extends BoxType {
  id: string;
  layerId: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  color?: string;
  text?: string;
  metadata?: {
    createdAt: string;
    updatedAt: string;
  };
}

interface LayerCanvas {
  layerId: string;
  canvasRef: HTMLCanvasElement | null;
}

interface PageData {
  boxes: Box[];
  canvases: LayerCanvas[];
  pageBoxes: Record<number, Box[]>;
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
      boxesByPage: {},
      boxes: []
    }
  ]);
  
  const [canvasRefs, setCanvasRefs] = useState<Record<string, HTMLCanvasElement | null>>({});
  const [layersByDocument, setLayersByDocument] = useState<LayerManagerState>({});
  const [activeLayer, setActiveLayer] = useState<Layer>(layers[0]);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);

  // 문서와 페이지에 대한 초기화
  const initializeDocumentPage = useCallback((documentId: string, pageNumber: number) => {
    setLayersByDocument(prev => {
      const newState = { ...prev };
      const pageNumberStr = pageNumber.toString();
      
      // 문서가 없으면 새로 생성
      if (!newState[documentId]) {
        newState[documentId] = {};
      }

      // 페이지가 없으면 새로 생성
      if (!newState[documentId][pageNumberStr]) {
        newState[documentId][pageNumberStr] = {
          boxes: [],
          canvases: layers.map(layer => ({
            layerId: layer.id,
            canvasRef: null
          })),
          pageBoxes: {} as Record<number, Box[]>
        };
      }

      // 디버깅: 페이지 초기화 후 상태 확인
      console.log('페이지 초기화 후 상태:', {
        documentId,
        pageNumber,
        pageData: newState[documentId][pageNumberStr],
        전체상태: newState
      });

      return newState;
    });
  }, [layers]);

  // 새 레이어 추가
  const addLayer = useCallback((name: string, color: string): Layer => {
    const newLayer: Layer = {
      id: `layer_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name,
      color,
      isVisible: true,
      boxesByPage: {},
      boxes: []
    };

    // 레이어 상태 업데이트
    setLayers(prevLayers => [...prevLayers, newLayer]);

    // layersByDocument 상태 업데이트
    setLayersByDocument(prevDoc => {
      const newState = { ...prevDoc };
      
      // 각 문서와 페이지에 새 레이어의 캔버스 추가
      Object.keys(newState).forEach(documentId => {
        Object.keys(newState[documentId]).forEach(pageNumber => {
          const pageData = newState[documentId][pageNumber];
          // 이미 존재하는 레이어인지 확인
          const existingCanvas = pageData.canvases.find(canvas => canvas.layerId === newLayer.id);
          
          if (!existingCanvas) {
            newState[documentId][pageNumber] = {
              boxes: pageData.boxes || [],
              canvases: [...pageData.canvases, { layerId: newLayer.id, canvasRef: null }],
              pageBoxes: { ...pageData.pageBoxes }  // 기존 pageBoxes 유지
            };
          }
        });
      });
      
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
            // 해당 레이어의 박스들을 제거하고 pageBoxes도 업데이트
            const filteredBoxes = pageData.boxes.filter(box => box.layerId !== layerId);
            const updatedPageBoxes = { ...pageData.pageBoxes };
            
            // pageBoxes의 각 페이지에서도 해당 레이어의 박스들을 제거
            Object.keys(updatedPageBoxes).forEach(pageNumStr => {
              const pageNum = parseInt(pageNumStr, 10);
              if (!isNaN(pageNum)) {
                updatedPageBoxes[pageNum] = (updatedPageBoxes[pageNum] || []).filter((box: Box) => box.layerId !== layerId);
              }
            });

            newState[documentId][pageNumber] = {
              boxes: filteredBoxes,
              canvases: pageData.canvases.filter(canvas => canvas.layerId !== layerId),
              pageBoxes: updatedPageBoxes
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
    const pageNumberStr = pageNumber.toString();
    const pageData = layersByDocument[documentId]?.[pageNumberStr];
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
    const pageNumberStr = pageNumber.toString();
    const pageData = layersByDocument[documentId]?.[pageNumberStr];
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
  const addBox = useCallback((documentId: string, pageNumber: number, box: Omit<Box, 'id' | 'layerId' | 'pageNumber'>) => {
    if (!activeLayer) {
      console.error('활성 레이어가 없습니다.');
      return null;
    }

    const pageNumberStr = pageNumber.toString();
    
    // 페이지 데이터가 없으면 초기화
    setLayersByDocument(prev => {
      const newState = { ...prev };
      if (!newState[documentId]) {
        newState[documentId] = {};
      }
      if (!newState[documentId][pageNumberStr]) {
        newState[documentId][pageNumberStr] = {
          boxes: [],
          canvases: layers.map(layer => ({
            layerId: layer.id,
            canvasRef: null
          })),
          pageBoxes: {} as Record<number, Box[]>
        };
      }
      return newState;
    });

    const newBox: Box = {
      ...box,
      id: `box_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      layerId: activeLayer.id,
      pageNumber,
      type: 'box',
      color: activeLayer.color,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    setLayersByDocument(prev => {
      const pageData = prev[documentId]?.[pageNumberStr];
      if (!pageData) {
        console.error('페이지 데이터가 없습니다:', { documentId, pageNumber });
        return prev;
      }

      // 현재 레이어의 박스만 필터링하여 새 박스 추가
      const currentLayerBoxes = pageData.boxes.filter(b => b.layerId === activeLayer.id);
      const otherLayerBoxes = pageData.boxes.filter(b => b.layerId !== activeLayer.id);

      const newState = {
        ...prev,
        [documentId]: {
          ...prev[documentId],
          [pageNumberStr]: {
            ...pageData,
            boxes: [...otherLayerBoxes, ...currentLayerBoxes, newBox],
            pageBoxes: {
              ...pageData.pageBoxes,
              [pageNumber]: [...(pageData.pageBoxes[pageNumber] || []), newBox]
            }
          }
        }
      };

      // 디버깅: 박스가 추가된 후의 상태 확인
      console.log('박스 추가 후 상태:', {
        documentId,
        pageNumber,
        newBox,
        layerId: activeLayer.id,
        currentLayerBoxes: newState[documentId][pageNumberStr].boxes.filter(b => b.layerId === activeLayer.id),
        allBoxes: newState[documentId][pageNumberStr].boxes,
        전체상태: newState
      });

      return newState;
    });

    return newBox;
  }, [activeLayer, layers]);

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
              box.id === boxId ? {
                ...box,
                ...updates,
                metadata: {
                  ...box.metadata,
                  updatedAt: new Date().toISOString()
                }
              } : box
            )
          }
        }
      };
    });
  }, []);

  // 페이지 데이터 가져오기를 최적화
  const getPageData = useCallback((documentId: string, pageNumber: number): DocumentPageData => {
    const key = `${documentId}`;
    const documentData = layersByDocument[key];
    
    if (!documentData || !documentData[pageNumber.toString()]) {
      return {
        layers: [],
        boxes: [],
        canvases: [],
        groupBoxes: []
      };
    }

    const pageData = documentData[pageNumber.toString()];
    
    // 현재 페이지의 박스들만 가져오기
    const pageBoxes = pageData.pageBoxes[pageNumber] || [];
    
    // 각 레이어별로 현재 페이지의 박스들만 필터링
    const layersWithPageBoxes = layers.map(layer => ({
      ...layer,
      boxes: layer.boxesByPage[pageNumber] || []
    }));

    return {
      layers: layersWithPageBoxes,
      boxes: pageBoxes,
      canvases: layersWithPageBoxes.map(layer => ({
        layerId: layer.id,
        canvasRef: canvasRefs[`${documentId}_${pageNumber}_${layer.id}`] || null,
      })),
      groupBoxes: []
    };
  }, [layersByDocument, layers, canvasRefs]);

  // layers 변경 시 UI 업데이트를 위한 useEffect
  useEffect(() => {
    const redrawTimeout = setTimeout(() => {
      // 모든 문서의 모든 페이지의 캔버스 다시 그리기
      Object.entries(layersByDocument).forEach(([documentId, pages]) => {
        Object.entries(pages).forEach(([pageNumber]) => {
          const pageNum = parseInt(pageNumber);
          redrawAllCanvases(documentId, pageNum);
        });
      });
    }, 0);

    return () => clearTimeout(redrawTimeout);
  }, [layers, activeLayer, layersByDocument, redrawAllCanvases]); // 모든 관련 의존성 추가

  const updateLayerBoxesColor = useCallback((documentId: string, pageNumber: number, layerId: string, color: string) => {
    setLayersByDocument(prev => {
      const pageNumberStr = pageNumber.toString();
      const pageData = prev[documentId]?.[pageNumberStr];
      if (!pageData) return prev;

      const newState = {
        ...prev,
        [documentId]: {
          ...prev[documentId],
          [pageNumberStr]: {
            ...pageData,
            boxes: pageData.boxes.map(box => 
              box.layerId === layerId ? { ...box, color } : box
            )
          }
        }
      };

      // 디버깅: 색상 업데이트 후 상태 확인
      console.log('색상 업데이트 후 상태:', {
        documentId,
        pageNumber,
        layerId,
        color,
        boxes: newState[documentId][pageNumberStr].boxes,
        전체상태: newState
      });

      return newState;
    });
  }, []);

  // 여러 박스 한번에 추가
  const addBoxes = useCallback((documentId: string, boxes: Box[]) => {
    if (!activeLayer) {
      console.error('활성 레이어가 없습니다.');
      return;
    }

    setLayersByDocument(prev => {
      const newState = { ...prev };
      
      // 페이지별로 박스 그룹화
      const boxesByPage = new Map<number, Box[]>();
      boxes.forEach(box => {
        const boxWithMetadata = {
          ...box,
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        };
        const pageBoxes = boxesByPage.get(box.pageNumber) || [];
        pageBoxes.push(boxWithMetadata);
        boxesByPage.set(box.pageNumber, pageBoxes);
      });

      // 각 페이지에 박스 추가
      boxesByPage.forEach((pageBoxes, pageNumber) => {
        const pageNumberStr = pageNumber.toString();
        
        // 페이지 데이터가 없으면 초기화
        if (!newState[documentId]) {
          newState[documentId] = {};
        }
        if (!newState[documentId][pageNumberStr]) {
          newState[documentId][pageNumberStr] = {
            boxes: [],
            canvases: layers.map(layer => ({
              layerId: layer.id,
              canvasRef: null
            })),
            pageBoxes: {}
          };
        }

        // 박스 추가
        const pageData = newState[documentId][pageNumberStr];
        const currentLayerBoxes = pageData.boxes.filter(b => b.layerId === activeLayer.id);
        const otherLayerBoxes = pageData.boxes.filter(b => b.layerId !== activeLayer.id);

        newState[documentId][pageNumberStr] = {
          ...pageData,
          boxes: [...otherLayerBoxes, ...currentLayerBoxes, ...pageBoxes],
          pageBoxes: {
            ...pageData.pageBoxes,
            [pageNumber]: [...currentLayerBoxes, ...pageBoxes]
          }
        };
      });

      return newState;
    });
  }, [activeLayer, layers]);

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
    addBoxes,
    removeBox,
    updateBox,
    getPageData,
    redrawCanvas,
    redrawAllCanvases,
    updateLayerBoxesColor,
  };
} 