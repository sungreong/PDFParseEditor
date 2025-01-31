import { useState, useCallback } from 'react';

export interface ToolState {
  isDrawMode: boolean;
  isMultiSelectMode: boolean;
  selectedBoxes: string[];
}

export interface ToolActions {
  onToggleDrawMode: () => void;
  onToggleMultiSelect: () => void;
}

export const useToolState = () => {
  const [toolState, setToolState] = useState<ToolState>({
    isDrawMode: false,
    isMultiSelectMode: false,
    selectedBoxes: [],
  });

  const toolActions: ToolActions = {
    onToggleDrawMode: useCallback(() => {
      setToolState((prev: ToolState) => ({
        ...prev,
        isDrawMode: !prev.isDrawMode,
        isMultiSelectMode: false,
      }));
    }, []),

    onToggleMultiSelect: useCallback(() => {
      setToolState((prev: ToolState) => ({
        ...prev,
        isMultiSelectMode: !prev.isMultiSelectMode,
        isDrawMode: false,
      }));
    }, []),
  };

  const handleBoxSelect = useCallback((boxId: string) => {
    if (toolState.isMultiSelectMode) {
      setToolState((prev: ToolState) => ({
        ...prev,
        selectedBoxes: prev.selectedBoxes.includes(boxId)
          ? prev.selectedBoxes.filter((id: string) => id !== boxId)
          : [...prev.selectedBoxes, boxId],
      }));
    } else {
      setToolState((prev: ToolState) => ({
        ...prev,
        selectedBoxes: [boxId],
      }));
    }
  }, [toolState.isMultiSelectMode]);

  return {
    toolState,
    toolActions,
    handleBoxSelect,
  };
}; 