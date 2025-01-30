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
      visible: true,
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
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      ),
    }));
  }, []);

  const addBox = useCallback((box: Omit<Box, 'id' | 'layerId'>) => {
    if (!state.activeLayer) return;

    const newBox: Box = {
      ...box,
      id: uuidv4(),
      layerId: state.activeLayer.id,
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
    };
  }, [state.layersByDocument, state.layers]);

  const redrawAllCanvases = useCallback(() => {
    // 캔버스 다시 그리기 로직 구현
    // 실제 구현은 캔버스 컴포넌트에서 처리
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
  };
}; 