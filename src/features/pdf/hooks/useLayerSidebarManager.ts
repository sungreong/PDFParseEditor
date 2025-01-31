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
  addLayer: addLayerToDocument,
  removeLayer: removeLayerFromDocument,
  toggleLayerVisibility: toggleLayerVisibilityInDocument,
  setActiveLayer: setActiveLayerInDocument,
  duplicateLayer: duplicateLayerInDocument,
}: UseLayerSidebarManagerProps) => {
  const [isLayerSidebarOpen, setIsLayerSidebarOpen] = useState(false);
  const [isBoxDetailOpen, setIsBoxDetailOpen] = useState(false);

  // 레이어 추가 핸들러
  const handleAddLayer = useCallback((name: string) => {
    addLayerToDocument(name);
  }, [addLayerToDocument]);

  // 레이어 삭제 핸들러
  const handleRemoveLayer = useCallback((layerId: string) => {
    if (window.confirm('레이어를 삭제하시겠습니까?')) {
      removeLayerFromDocument(layerId);
    }
  }, [removeLayerFromDocument]);

  // 레이어 가시성 토글 핸들러
  const handleToggleLayerVisibility = useCallback((layerId: string) => {
    toggleLayerVisibilityInDocument(layerId);
  }, [toggleLayerVisibilityInDocument]);

  // 레이어 선택 핸들러
  const handleSetActiveLayer = useCallback((layer: Layer) => {
    setActiveLayerInDocument(layer);
  }, [setActiveLayerInDocument]);

  // 레이어 복제 핸들러
  const handleDuplicateLayer = useCallback((layerId: string) => {
    duplicateLayerInDocument(layerId);
  }, [duplicateLayerInDocument]);

  return {
    isLayerSidebarOpen,
    isBoxDetailOpen,
    setIsLayerSidebarOpen,
    setIsBoxDetailOpen,
    handleAddLayer,
    handleRemoveLayer,
    handleToggleLayerVisibility,
    handleSetActiveLayer,
    handleDuplicateLayer,
  };
}; 