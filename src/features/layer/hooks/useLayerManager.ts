import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Box as BoxType, DocumentPageData, TextItem } from '@/types';
import type { Layer as BaseLayer } from '../types';

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

export interface Layer extends BaseLayer {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
  boxes: Box[];
  boxesByPage: Record<number, Box[]>;
}

interface PageData {
  boxes: Box[];
  canvases: {
    layerId: string;
    canvasRef: HTMLCanvasElement | null;
  }[];
}

interface DocumentState {
  [pageNumber: string]: PageData;
}

interface LayerManagerState {
  layers: Layer[];
  activeLayer: Layer | null;
  selectedBox: Box | null;
  currentPage: number;
  layersByDocument: {
    [documentId: string]: DocumentState;
  };
}

interface BoxInput {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  color?: string;
  text?: string;
  textItems?: TextItem[];
  metadata?: {
    extractedAt?: string;
    [key: string]: any;
  };
}

export const useLayerManager = () => {
  const [state, setState] = useState<LayerManagerState>({
    layers: [{
      id: 'default',
      name: '기본 레이어',
      color: '#000000',
      isVisible: true,
      boxes: [],
      boxesByPage: {}
    }],
    activeLayer: null,
    selectedBox: null,
    currentPage: 1,
    layersByDocument: {},
  });

  const [canvasRefs, setCanvasRefs] = useState<{
    [key: string]: HTMLCanvasElement | null;
  }>({});

  const initializeDocumentPage = useCallback((documentId: string, pageNumber: number) => {
    setState(prev => {
      const pageKey = pageNumber.toString();
      const existingDocument = prev.layersByDocument[documentId] || {};
      
      const newPageData: PageData = {
        boxes: [],
        canvases: prev.layers.map(layer => ({
          layerId: layer.id,
          canvasRef: null
        }))
      };

      return {
        ...prev,
        layersByDocument: {
          ...prev.layersByDocument,
          [documentId]: {
            ...existingDocument,
            [pageKey]: newPageData
          }
        }
      };
    });
  }, []);

  const addLayer = useCallback((name: string) => {
    const newLayer: Layer = {
      id: uuidv4(),
      name,
      color: '#000000',
      isVisible: true,
      boxes: [],
      boxesByPage: {}
    };

    setState(prev => ({
      ...prev,
      layers: [...prev.layers, newLayer],
      activeLayer: newLayer,
    }));
  }, []);

  const removeLayer = useCallback((layerId: string) => {
    setState(prev => ({
      ...prev,
      layers: prev.layers.filter(layer => layer.id !== layerId),
      activeLayer: prev.activeLayer?.id === layerId ? null : prev.activeLayer,
    }));
  }, []);

  const toggleLayerVisibility = useCallback((layerId: string) => {
    setState(prev => ({
      ...prev,
      layers: prev.layers.map(layer =>
        layer.id === layerId ? { ...layer, isVisible: !layer.isVisible } : layer
      ),
    }));
  }, []);

  const setCurrentPage = useCallback((pageNumber: number) => {
    setState(prev => ({
      ...prev,
      currentPage: pageNumber
    }));
  }, []);

  // 박스 ID 생성 함수 수정
  const generateBoxId = useCallback(() => {
    return `box_${Date.now()}_${uuidv4().split('-')[0]}`;
  }, []);

  const addBox = useCallback((documentId: string, boxInput: Box) => {
    if (!state.activeLayer) {
      console.error('활성 레이어가 없습니다.');
      return;
    }

    if (!documentId) {
      console.error('문서 ID가 제공되지 않았습니다.');
      return;
    }

    const pageNumber = boxInput.pageNumber;
    const pageKey = pageNumber.toString();

    // 문서와 페이지 데이터 초기화 확인
    const documentData = state.layersByDocument[documentId];
    if (!documentData || !documentData[pageKey]) {
      console.log('페이지 데이터 초기화 중...', { documentId, pageNumber });
      initializeDocumentPage(documentId, pageNumber);
    }

    // 새 박스 생성 (generateBoxId 사용)
    const newBox: Box = {
      id: generateBoxId(),
      layerId: state.activeLayer.id,
      pageNumber: pageNumber,
      x: boxInput.x,
      y: boxInput.y,
      width: boxInput.width,
      height: boxInput.height,
      type: 'box',
      color: state.activeLayer.color,
      text: boxInput.text || '',
      textItems: boxInput.textItems || [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        extractedAt: boxInput.metadata?.extractedAt || new Date().toISOString()
      }
    };

    setState(prev => {
      const documentData = prev.layersByDocument[documentId] || {};
      const pageData = documentData[pageKey] || {
        boxes: [],
        canvases: prev.layers.map(layer => ({
          layerId: layer.id,
          canvasRef: null
        }))
      };

      // 현재 레이어의 boxes와 boxesByPage 업데이트
      const updatedLayers = prev.layers.map(layer =>
        layer.id === state.activeLayer?.id
          ? {
              ...layer,
              boxes: [...layer.boxes, newBox],
              boxesByPage: {
                ...layer.boxesByPage,
                [pageNumber]: [...(layer.boxesByPage[pageNumber] || []), newBox]
              }
            }
          : layer
      );

      // 문서의 페이지 데이터 업데이트
      return {
        ...prev,
        layers: updatedLayers,
        layersByDocument: {
          ...prev.layersByDocument,
          [documentId]: {
            ...documentData,
            [pageKey]: {
              ...pageData,
              boxes: [...pageData.boxes, newBox]
            }
          }
        }
      };
    });

    return newBox;
  }, [state.activeLayer, initializeDocumentPage, generateBoxId]);

  const removeBox = useCallback((documentId: string, boxId: string) => {
    setState(prev => {
      try {
        // 1. 박스 정보 찾기
        let targetBox: Box | undefined;
        let targetLayerId: string | undefined;

        // 모든 레이어에서 박스 찾기
        for (const layer of prev.layers) {
          targetBox = layer.boxes.find(box => box.id === boxId);
          if (targetBox) {
            targetLayerId = layer.id;
            break;
          }
        }

        if (!targetBox || !targetLayerId) {
          console.warn('삭제할 박스를 찾을 수 없습니다:', { boxId, documentId });
          return prev;
        }

        const pageNumber = targetBox.pageNumber;
        const pageKey = pageNumber.toString();

        // 2. 레이어 데이터 업데이트
        const updatedLayers = prev.layers.map(layer => {
          if (layer.id === targetLayerId) {
            return {
              ...layer,
              // boxes 배열에서 제거
              boxes: layer.boxes.filter(box => box.id !== boxId),
              // boxesByPage에서 제거
              boxesByPage: {
                ...layer.boxesByPage,
                [pageNumber]: (layer.boxesByPage[pageNumber] || [])
                  .filter(box => box.id !== boxId)
              }
            };
          }
          return layer;
        });

        // 3. 문서의 페이지 데이터 업데이트
        const documentData = prev.layersByDocument[documentId] || {};
        const pageData = documentData[pageKey];

        const updatedLayersByDocument = {
          ...prev.layersByDocument,
          [documentId]: {
            ...documentData,
            [pageKey]: pageData ? {
              ...pageData,
              boxes: pageData.boxes.filter(box => box.id !== boxId)
            } : pageData
          }
        };

        // 4. 상태 업데이트
        return {
          ...prev,
          layers: updatedLayers,
          layersByDocument: updatedLayersByDocument,
          // 선택된 박스가 삭제되는 박스인 경우 선택 해제
          selectedBox: prev.selectedBox?.id === boxId ? null : prev.selectedBox
        };
      } catch (error) {
        console.error('박스 삭제 중 오류 발생:', error);
        return prev;
      }
    });
  }, []);

  const updateBox = useCallback((boxId: string, updates: Partial<Box>) => {
    setState(prev => ({
      ...prev,
      layers: prev.layers.map(layer => ({
        ...layer,
        boxes: layer.boxes.map(box =>
          box.id === boxId ? { ...box, ...updates } : box
        ),
      })),
    }));
  }, []);

  const getPageData = useCallback((documentId: string, pageNumber: number): DocumentPageData => {
    const documentData = state.layersByDocument[documentId];
    const pageKey = pageNumber.toString();
    
    if (!documentData || !documentData[pageKey]) {
      // 페이지 데이터가 없을 때는 레이어의 boxesByPage에서 해당 페이지의 박스들을 가져옴
      const pageBoxes = state.layers.flatMap(layer => 
        layer.boxesByPage[pageNumber] || []
      );

      return {
        layers: state.layers.map(layer => ({
          ...layer,
          boxes: layer.boxesByPage[pageNumber] || []
        })),
        boxes: pageBoxes,
        canvases: state.layers.map(layer => ({
          layerId: layer.id,
          canvasRef: canvasRefs[`${documentId}_${pageNumber}_${layer.id}`] || null,
        })),
        groupBoxes: [],
      };
    }

    const pageData = documentData[pageKey];
    
    // 현재 페이지의 박스들과 레이어의 boxesByPage에 있는 박스들을 합침
    const pageBoxes = [
      ...(pageData.boxes || []),
      ...state.layers.flatMap(layer => layer.boxesByPage[pageNumber] || [])
    ].reduce((unique, box) => {
      // 중복 제거
      const exists = unique.find(b => b.id === box.id);
      if (!exists) {
        unique.push(box);
      }
      return unique;
    }, [] as Box[]);
    
    // 각 레이어별로 현재 페이지의 박스들만 필터링하여 레이어 정보 구성
    const layersWithPageBoxes = state.layers.map(layer => ({
      ...layer,
      boxes: pageBoxes.filter((box: Box) => box.layerId === layer.id)
    }));

    return {
      layers: layersWithPageBoxes,
      boxes: pageBoxes,
      canvases: layersWithPageBoxes.map(layer => ({
        layerId: layer.id,
        canvasRef: canvasRefs[`${documentId}_${pageNumber}_${layer.id}`] || null,
      })),
      groupBoxes: [],
    };
  }, [state.layersByDocument, state.layers, canvasRefs]);

  const setCanvasRef = useCallback((documentId: string, pageNumber: number, layerId: string, ref: HTMLCanvasElement | null) => {
    setCanvasRefs(prev => ({
      ...prev,
      [`${documentId}_${pageNumber}_${layerId}`]: ref,
    }));
  }, []);


  const updateLayerName = useCallback((layerId: string, newName: string) => {
    setState(prev => ({
      ...prev,
      layers: prev.layers.map(layer =>
        layer.id === layerId ? { ...layer, name: newName } : layer
      ),
    }));
  }, []);

  const updateLayerColor = useCallback((layerId: string, newColor: string) => {
    setState(prev => ({
      ...prev,
      layers: prev.layers.map(layer =>
        layer.id === layerId ? { ...layer, color: newColor } : layer
      ),
    }));
  }, []);

  const moveBoxToLayer = useCallback((boxId: string, targetLayerId: string) => {
    setState(prev => ({
      ...prev,
      layers: prev.layers.map(layer => {
        if (layer.id === targetLayerId) {
          const box = prev.layers.flatMap(l => l.boxes).find(b => b.id === boxId);
          if (box) {
            return {
              ...layer,
              boxes: [...layer.boxes, { ...box, layerId: targetLayerId }]
            };
          }
        }
        return {
          ...layer,
          boxes: layer.boxes.filter(box => box.id !== boxId)
        };
      }),
    }));
  }, [state.layers]);

  const duplicateLayer = useCallback((layerId: string) => {
    const sourceLayer = state.layers.find(layer => layer.id === layerId);
    if (sourceLayer) {
      const newLayer: Layer = {
        ...sourceLayer,
        id: `layer_${Date.now()}`,
        name: `${sourceLayer.name} (복사본)`,
        boxes: sourceLayer.boxes.map(box => ({
          ...box,
          id: `box_${Date.now()}_${Math.random()}`,
          layerId: `layer_${Date.now()}`
        })),
        boxesByPage: sourceLayer.boxesByPage
      };
      setState(prev => ({
        ...prev,
        layers: [...prev.layers, newLayer],
      }));
    }
  }, [state.layers]);

  const mergeLayer = useCallback((sourceLayerId: string, targetLayerId: string) => {
    const sourceLayer = state.layers.find(layer => layer.id === sourceLayerId);
    if (sourceLayer) {
      setState(prev => ({
        ...prev,
        layers: prev.layers.map(layer => {
          if (layer.id === targetLayerId) {
            return {
              ...layer,
              boxes: [...layer.boxes, ...sourceLayer.boxes.map(box => ({
                ...box,
                layerId: targetLayerId
              }))]
            };
          }
          return layer;
        }).filter(layer => layer.id !== sourceLayerId)
      }));
    }
  }, [state.layers]);

  const clearLayer = useCallback((layerId: string) => {
    setState(prev => ({
      ...prev,
      layers: prev.layers.map(layer =>
        layer.id === layerId ? { ...layer, boxes: [] } : layer
      ),
    }));
  }, []);

  const exportLayer = useCallback((layerId: string) => {
    const layer = state.layers.find(l => l.id === layerId);
    if (layer) {
      const layerData = JSON.stringify(layer);
      const blob = new Blob([layerData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${layer.name}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [state.layers]);

  const importLayer = useCallback((layerData: string) => {
    try {
      const layer = JSON.parse(layerData) as Layer;
      const newLayer: Layer = {
        ...layer,
        id: `layer_${Date.now()}`,
        boxes: layer.boxes.map(box => ({
          ...box,
          id: `box_${Date.now()}_${Math.random()}`,
          layerId: `layer_${Date.now()}`
        })),
        boxesByPage: layer.boxesByPage
      };
      setState(prev => ({
        ...prev,
        layers: [...prev.layers, newLayer],
      }));
    } catch (error) {
      console.error('레이어 가져오기 실패:', error);
    }
  }, []);

  const duplicateBox = useCallback((box: Box) => {
    return {
      ...box,
      id: generateBoxId(),
      metadata: {
        ...box.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
  }, [generateBoxId]);

  return {
    layers: state.layers,
    activeLayer: state.activeLayer,
    selectedBox: state.selectedBox,
    currentPage: state.currentPage,
    layersByDocument: state.layersByDocument,
    setLayers: (layers: Layer[]) => setState(prev => ({ ...prev, layers })),
    setActiveLayer: (layer: Layer | null) => setState(prev => ({ ...prev, activeLayer: layer })),
    setSelectedBox: (box: Box | null) => setState(prev => ({ ...prev, selectedBox: box })),
    setCurrentPage,
    initializeDocumentPage,
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    addBox,
    removeBox,
    updateBox,
    getPageData,
    setCanvasRef,
    updateLayerName,
    updateLayerColor,
    moveBoxToLayer,
    duplicateLayer,
    mergeLayer,
    clearLayer,
    exportLayer,
    importLayer,
    duplicateBox,
    generateBoxId,
  };
}; 