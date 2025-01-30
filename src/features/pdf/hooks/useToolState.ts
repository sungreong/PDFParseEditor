import { useState, useCallback } from 'react';
import type { ToolState, ToolActions, Box, Point } from '../types';

export const useToolState = () => {
  const [state, setState] = useState<ToolState>({
    isDrawMode: false,
    isDrawingArrow: false,
    isMultiSelectMode: false,
    startBox: null,
    selectedBoxes: [],
    selectionCoords: null,
  });

  const toolActions: ToolActions = {
    onToggleDrawMode: useCallback(() => {
      setState(prev => ({
        ...prev,
        isDrawMode: !prev.isDrawMode,
        isMultiSelectMode: false,
        isDrawingArrow: false,
      }));
    }, []),

    onToggleArrowDrawing: useCallback(() => {
      setState(prev => ({
        ...prev,
        isDrawingArrow: !prev.isDrawingArrow,
        isDrawMode: false,
        isMultiSelectMode: false,
      }));
    }, []),

    onToggleMultiSelect: useCallback(() => {
      setState(prev => ({
        ...prev,
        isMultiSelectMode: !prev.isMultiSelectMode,
        isDrawMode: false,
        isDrawingArrow: false,
      }));
    }, []),

    setStartBox: useCallback((box: Box | null) => {
      setState(prev => ({
        ...prev,
        startBox: box,
      }));
    }, []),

    setSelectedBoxes: useCallback((boxes: string[]) => {
      setState(prev => ({
        ...prev,
        selectedBoxes: boxes,
      }));
    }, []),

    setSelectionCoords: useCallback((coords: { start: Point; end: Point } | null) => {
      setState(prev => ({
        ...prev,
        selectionCoords: coords,
      }));
    }, []),
  };

  const handleBoxSelect = useCallback((boxId: string) => {
    if (state.isMultiSelectMode) {
      setState(prev => ({
        ...prev,
        selectedBoxes: prev.selectedBoxes.includes(boxId)
          ? prev.selectedBoxes.filter(id => id !== boxId)
          : [...prev.selectedBoxes, boxId],
      }));
    } else {
      setState(prev => ({
        ...prev,
        selectedBoxes: [boxId],
      }));
    }
  }, [state.isMultiSelectMode]);

  return {
    toolState: state,
    toolActions,
    handleBoxSelect,
  };
}; 