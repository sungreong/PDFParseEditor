import { useState, useCallback } from 'react';
import type { Layer } from '@/types';

interface UseLayerSidebarManagerProps {
  addLayer: (name: string) => void;
  removeLayer: (layerId: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  setActiveLayer: (layer: Layer) => void;
  duplicateLayer: (layerId: string) => void;
}

export const useLayerSidebarManager = ({
  addLayer,
  removeLayer,
  toggleLayerVisibility,
  setActiveLayer,
  duplicateLayer,
}: UseLayerSidebarManagerProps) => {
  const [isLayerSidebarOpen, setIsLayerSidebarOpen] = useState(false);

  const handleAddLayer = useCallback(() => {
    addLayer('새 레이어');
  }, [addLayer]);

  const handleRemoveLayer = useCallback((layerId: string) => {
    if (window.confirm('정말로 이 레이어를 삭제하시겠습니까?')) {
      removeLayer(layerId);
    }
  }, [removeLayer]);

  const handleToggleLayerVisibility = useCallback((layerId: string) => {
    toggleLayerVisibility(layerId);
  }, [toggleLayerVisibility]);

  const handleSetActiveLayer = useCallback((layer: Layer) => {
    setActiveLayer(layer);
  }, [setActiveLayer]);

  const handleDuplicateLayer = useCallback((layerId: string) => {
    duplicateLayer(layerId);
  }, [duplicateLayer]);

  return {
    isLayerSidebarOpen,
    setIsLayerSidebarOpen,
    handleAddLayer,
    handleRemoveLayer,
    handleToggleLayerVisibility,
    handleSetActiveLayer,
    handleDuplicateLayer,
  };
}; 