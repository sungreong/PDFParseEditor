import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Layer, Box, LayerState, DocumentPageData } from '../types';

export const useLayerManager = () => {
  const [state, setState] = useState<LayerState>({
    layers: [],
    activeLayer: null,
    selectedBox: null,
    layersByDocument: {},
  });

  const [canvasRefs, setCanvasRefs] = useState<{
    [key: string]: HTMLCanvasElement | null;
  }>({});

  const initializeDocumentPage = useCallback((documentId: string, pageNumber: number) => {
    setState(prev => ({
      ...prev,
      layersByDocument: {
        ...prev.layersByDocument,
        [`${documentId}_${pageNumber}`]: [],
      },
    }));
  }, []);

  const addLayer = useCallback((name: string) => {
    const newLayer: Layer = {
      id: uuidv4(),
      name,
      color: '#000000',
      isVisible: true,
      boxes: [],
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

  const addBox = useCallback((box: Omit<Box, 'id' | 'layerId'>) => {
    if (!state.activeLayer) return;

    const newBox: Box = {
      ...box,
      id: uuidv4(),
      layerId: state.activeLayer.id,
      type: box.type || 'default',
      pageNumber: box.pageNumber || 1,
    };

    setState(prev => ({
      ...prev,
      layers: prev.layers.map(layer =>
        layer.id === prev.activeLayer?.id
          ? { ...layer, boxes: [...layer.boxes, newBox] }
          : layer
      ),
    }));

    return newBox;
  }, [state.activeLayer]);

  const removeBox = useCallback((boxId: string) => {
    setState(prev => ({
      ...prev,
      layers: prev.layers.map(layer => ({
        ...layer,
        boxes: layer.boxes.filter(box => box.id !== boxId),
      })),
      selectedBox: prev.selectedBox?.id === boxId ? null : prev.selectedBox,
    }));
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
    const key = `${documentId}_${pageNumber}`;
    return {
      layers: state.layersByDocument[key] || [],
      boxes: state.layers.flatMap(layer => layer.boxes),
      canvases: state.layers.map(layer => ({
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

  const redrawAllCanvases = useCallback(() => {
    // 캔버스 다시 그리기 로직 구현
    // 실제 구현은 캔버스 컴포넌트에서 처리
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
        }))
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
        }))
      };
      setState(prev => ({
        ...prev,
        layers: [...prev.layers, newLayer],
      }));
    } catch (error) {
      console.error('레이어 가져오기 실패:', error);
    }
  }, []);

  return {
    ...state,
    setLayers: (layers: Layer[]) => setState(prev => ({ ...prev, layers })),
    setActiveLayer: (layer: Layer | null) => setState(prev => ({ ...prev, activeLayer: layer })),
    setSelectedBox: (box: Box | null) => setState(prev => ({ ...prev, selectedBox: box })),
    initializeDocumentPage,
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    addBox,
    removeBox,
    updateBox,
    getPageData,
    redrawAllCanvases,
    setCanvasRef,
    updateLayerName,
    updateLayerColor,
    moveBoxToLayer,
    duplicateLayer,
    mergeLayer,
    clearLayer,
    exportLayer,
    importLayer,
  };
}; 