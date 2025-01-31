import { useState, useCallback } from 'react';
import type { DocumentPageData, Layer as LayerType, Box as BoxType } from '@/features/layer/types';
import type { TextItem } from '@/types';

export interface Layer extends LayerType {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
  boxes: BoxType[];
  boxesByPage: Record<number, BoxType[]>;  // 타입 호환성을 위해 유지
}

export interface Box extends BoxType {
  id: string;
  layerId: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'box' | 'group';
  color?: string;
  text?: string;
  textItems?: TextItem[];
  metadata?: {
    createdAt: string;
    updatedAt: string;
    extractedAt?: string;
    [key: string]: any;
  };
}

interface PageData {
  boxes: Box[];
  canvasRefs: Record<string, HTMLCanvasElement | null>;
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
      boxes: [],
      boxesByPage: {}  // 타입 호환성을 위해 유지
    }
  ]);
  
  const [layersByDocument, setLayersByDocument] = useState<LayerManagerState>({});
  const [activeLayer, setActiveLayer] = useState<Layer>(layers[0]);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);

  // 문서와 페이지 초기화
  const initializeDocumentPage = useCallback((documentId: string, pageNumber: number) => {
    setLayersByDocument(prev => {
      if (prev[documentId]?.[pageNumber.toString()]) return prev;

      return {
        ...prev,
        [documentId]: {
          ...prev[documentId],
          [pageNumber.toString()]: {
            boxes: [],
            canvasRefs: {}
          }
        }
      };
    });
  }, []);

  // 레이어 추가
  const addLayer = useCallback((name: string, color: string): Layer => {
    const newLayer: Layer = {
      id: `layer_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name,
      color,
      isVisible: true,
      boxes: [],
      boxesByPage: {}  // 타입 호환성을 위해 유지
    };

    setLayers(prev => [...prev, newLayer]);
    setActiveLayer(newLayer);
    return newLayer;
  }, []);

  // 레이어 삭제
  const removeLayer = useCallback((layerId: string) => {
    if (layerId === 'default') return;

    setLayers(prev => {
      const updatedLayers = prev.filter(layer => layer.id !== layerId);
      if (activeLayer.id === layerId) {
        setActiveLayer(updatedLayers[0]);
      }
      return updatedLayers;
    });

    setLayersByDocument(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(documentId => {
        Object.keys(newState[documentId]).forEach(pageNumber => {
          newState[documentId][pageNumber] = {
            ...newState[documentId][pageNumber],
            boxes: newState[documentId][pageNumber].boxes.filter(box => box.layerId !== layerId)
          };
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

      return {
        ...prev,
        [documentId]: {
          ...prev[documentId],
          [pageNumber]: {
            ...pageData,
            canvasRefs: {
              ...pageData.canvasRefs,
              [layerId]: ref
            }
          }
        }
      };
    });
  }, []);

  // 박스 추가
  const addBox = useCallback((documentId: string, box: Partial<Box> & { pageNumber: number }) => {
    if (!activeLayer) return null;

    const newBox: Box = {
      id: `box_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      layerId: activeLayer.id,
      pageNumber: box.pageNumber,
      x: box.x || 0,
      y: box.y || 0,
      width: box.width || 0,
      height: box.height || 0,
      type: box.type || 'box',
      color: box.color || activeLayer.color,
      text: box.text || '',
      textItems: box.textItems || [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        extractedAt: box.metadata?.extractedAt || new Date().toISOString()
      }
    };

    setLayersByDocument(prev => {
      const pageStr = newBox.pageNumber.toString();
      const currentPage = prev[documentId]?.[pageStr] || { boxes: [], canvasRefs: {} };

      return {
        ...prev,
        [documentId]: {
          ...prev[documentId],
          [pageStr]: {
            ...currentPage,
            boxes: [...(currentPage.boxes || []), newBox]
          }
        }
      };
    });

    return newBox;
  }, [activeLayer]);

  // 박스 삭제
  const removeBox = useCallback((documentId: string, pageNumber: number, boxId: string) => {
    setLayersByDocument(prev => ({
      ...prev,
      [documentId]: {
        ...prev[documentId],
        [pageNumber]: {
          ...prev[documentId]?.[pageNumber],
          boxes: prev[documentId]?.[pageNumber]?.boxes.filter(box => box.id !== boxId) || []
        }
      }
    }));

    if (selectedBox?.id === boxId) {
      setSelectedBox(null);
    }
  }, [selectedBox]);

  // 박스 업데이트
  const updateBox = useCallback((documentId: string, pageNumber: number, boxId: string, updates: Partial<Box>) => {
    setLayersByDocument(prev => ({
      ...prev,
      [documentId]: {
        ...prev[documentId],
        [pageNumber]: {
          ...prev[documentId]?.[pageNumber],
          boxes: prev[documentId]?.[pageNumber]?.boxes.map(box =>
            box.id === boxId
              ? {
                  ...box,
                  ...updates,
                  metadata: {
                    ...box.metadata,
                    updatedAt: new Date().toISOString()
                  }
                }
              : box
          ) || []
        }
      }
    }));
  }, []);

  // 페이지 데이터 가져오기
  const getPageData = useCallback((documentId: string, pageNumber: number): DocumentPageData => {
    const pageData = layersByDocument[documentId]?.[pageNumber];
    
    if (!pageData) {
      return {
        layers: layers.map(layer => ({ ...layer, boxes: [] })),
        boxes: [],
        canvases: layers.map(layer => ({
          layerId: layer.id,
          canvasRef: null
        })),
        groupBoxes: []  // DocumentPageData 타입 호환성을 위해 추가
      };
    }

    const pageBoxes = pageData.boxes || [];
    const layersWithBoxes = layers.map(layer => ({
      ...layer,
      boxes: pageBoxes.filter(box => box.layerId === layer.id)
    }));

    return {
      layers: layersWithBoxes,
      boxes: pageBoxes,
      canvases: layers.map(layer => ({
        layerId: layer.id,
        canvasRef: pageData.canvasRefs[layer.id] || null
      })),
      groupBoxes: []  // DocumentPageData 타입 호환성을 위해 추가
    };
  }, [layersByDocument, layers]);

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
    getPageData
  };
} 