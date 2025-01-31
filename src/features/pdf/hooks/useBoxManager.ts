import { useState, useCallback } from 'react';
import type { Box } from '@/types';

interface UseBoxManagerProps {
  file: File | null;
  activeLayer: { id: string; color: string } | null;
  scale: number;
  addBox: (fileName: string, box: Box) => void;
  removeBox: (fileName: string, boxId: string) => void;
  updateBox: (boxId: string, updates: Partial<Box>) => void;
  generateBoxId: () => string;
}

export const useBoxManager = ({
  file,
  activeLayer,
  scale,
  addBox: addBoxToLayer,
  removeBox: removeBoxFromLayer,
  updateBox: updateBoxInLayer,
  generateBoxId,
}: UseBoxManagerProps) => {
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [selectedBoxIds, setSelectedBoxIds] = useState<Set<string>>(new Set());
  const [editingBox, setEditingBox] = useState<Box | null>(null);
  const [isBoxDetailOpen, setIsBoxDetailOpen] = useState(false);
  const [currentBox, setCurrentBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    pageNumber: number;
  } | null>(null);

  // 박스 추가 핸들러
  const handleAddBox = useCallback((box: Box) => {
    if (!file || !activeLayer) {
      console.log('AddBox - Early return:', { hasFile: !!file, hasActiveLayer: !!activeLayer });
      return;
    }
    
    console.log('AddBox - 박스 추가:', {
      boxId: box.id,
      fileName: file.name,
      activeLayerId: activeLayer.id,
      pageNumber: box.pageNumber
    });

    try {
      addBoxToLayer(file.name, box);
      return box;
    } catch (error) {
      console.error('AddBox - Error adding box:', error);
      return null;
    }
  }, [file, activeLayer, addBoxToLayer]);

  // 박스 생성 핸들러
  const handleBoxCreated = useCallback((box: {
    x: number;
    y: number;
    width: number;
    height: number;
    pageNumber: number;
  }) => {
    if (!file || !activeLayer) return;

    // 박스 ID 생성
    const boxId = generateBoxId();
    console.log('새로운 박스 ID 생성:', boxId);

    // 박스 좌표 정규화
    const normalizedBox: Box = {
      id: boxId,
      layerId: activeLayer.id,
      pageNumber: box.pageNumber,
      x: Math.min(box.x, box.x + box.width),
      y: Math.min(box.y, box.y + box.height),
      width: Math.abs(box.width),
      height: Math.abs(box.height),
      type: 'box',
      color: activeLayer.color,
      text: '',
      textItems: [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    // 박스 추가
    handleAddBox(normalizedBox);
    return normalizedBox;
  }, [file, activeLayer, generateBoxId, handleAddBox]);

  // 박스 삭제 핸들러
  const handleRemoveBox = useCallback((boxId: string) => {
    if (!file) return;
    
    try {
      removeBoxFromLayer(file.name, boxId);
      
      // 선택된 박스 초기화
      if (selectedBox?.id === boxId) {
        setSelectedBox(null);
      }
      
      // 다중 선택 목록에서도 제거
      setSelectedBoxIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(boxId);
        return newSet;
      });
    } catch (error) {
      console.error('RemoveBox - Error removing box:', error);
    }
  }, [file, selectedBox, removeBoxFromLayer]);

  // 박스 업데이트 핸들러
  const handleUpdateBox = useCallback((boxId: string, updates: Partial<Box>) => {
    if (!file || !activeLayer) return;
    
    try {
      updateBoxInLayer(boxId, updates);
      setIsBoxDetailOpen(false);
      setEditingBox(null);
    } catch (error) {
      console.error('UpdateBox - Error updating box:', error);
    }
  }, [file, activeLayer, updateBoxInLayer]);

  // 박스 클릭 핸들러
  const handleBoxClick = useCallback((box: Box, openDetail: boolean = false) => {
    setSelectedBox(box);
    if (openDetail) {
      setIsBoxDetailOpen(true);
    }
  }, []);

  // 다중 선택 핸들러
  const handleMultipleBoxSelect = useCallback((box: Box) => {
    setSelectedBoxIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(box.id)) {
        newSet.delete(box.id);
      } else {
        newSet.add(box.id);
      }
      return newSet;
    });
  }, []);

  // 다중 삭제 핸들러
  const handleMultipleDelete = useCallback(async () => {
    if (selectedBoxIds.size === 0) return;
    
    if (window.confirm(`선택한 ${selectedBoxIds.size}개의 박스를 삭제하시겠습니까?`)) {
      try {
        for (const boxId of selectedBoxIds) {
          await handleRemoveBox(boxId);
        }
        setSelectedBoxIds(new Set());
        setSelectedBox(null);
      } catch (error) {
        console.error('박스 다중 삭제 중 오류 발생:', error);
        alert('박스 삭제 중 오류가 발생했습니다.');
      }
    }
  }, [selectedBoxIds, handleRemoveBox]);

  return {
    selectedBox,
    selectedBoxIds,
    editingBox,
    isBoxDetailOpen,
    currentBox,
    setSelectedBox,
    setSelectedBoxIds,
    setEditingBox,
    setIsBoxDetailOpen,
    setCurrentBox,
    handleAddBox,
    handleBoxCreated,
    handleRemoveBox,
    handleUpdateBox,
    handleBoxClick,
    handleMultipleBoxSelect,
    handleMultipleDelete,
  };
}; 