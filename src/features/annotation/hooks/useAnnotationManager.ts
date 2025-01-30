import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Annotation, AnnotationState, AnnotationDrawingState } from '../types';

export const useAnnotationManager = () => {
  const [state, setState] = useState<AnnotationState>({
    annotations: [],
    selectedAnnotationId: null,
    editingAnnotationId: null,
  });

  const [drawingState, setDrawingState] = useState<AnnotationDrawingState>({
    isDrawing: false,
    startPoint: null,
  });

  const startDrawing = useCallback((x: number, y: number) => {
    setDrawingState({
      isDrawing: true,
      startPoint: { x, y },
    });
  }, []);

  const finishDrawing = useCallback((text: string, pageNumber: number) => {
    if (!drawingState.startPoint) return;

    const newAnnotation: Annotation = {
      id: uuidv4(),
      text,
      pageNumber,
      position: drawingState.startPoint,
      createdAt: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      annotations: [...prev.annotations, newAnnotation],
    }));

    setDrawingState({
      isDrawing: false,
      startPoint: null,
    });

    return newAnnotation;
  }, [drawingState.startPoint]);

  const cancelDrawing = useCallback(() => {
    setDrawingState({
      isDrawing: false,
      startPoint: null,
    });
  }, []);

  const selectAnnotation = useCallback((annotationId: string | null) => {
    setState(prev => ({
      ...prev,
      selectedAnnotationId: annotationId,
    }));
  }, []);

  const editAnnotation = useCallback((annotationId: string | null) => {
    setState(prev => ({
      ...prev,
      editingAnnotationId: annotationId,
    }));
  }, []);

  const updateAnnotation = useCallback((annotationId: string, text: string) => {
    setState(prev => ({
      ...prev,
      annotations: prev.annotations.map(ann =>
        ann.id === annotationId
          ? {
              ...ann,
              text,
              updatedAt: new Date().toISOString(),
            }
          : ann
      ),
      editingAnnotationId: null,
    }));
  }, []);

  const deleteAnnotation = useCallback((annotationId: string) => {
    setState(prev => ({
      ...prev,
      annotations: prev.annotations.filter(ann => ann.id !== annotationId),
      selectedAnnotationId:
        prev.selectedAnnotationId === annotationId ? null : prev.selectedAnnotationId,
      editingAnnotationId:
        prev.editingAnnotationId === annotationId ? null : prev.editingAnnotationId,
    }));
  }, []);

  const getAnnotationsByPage = useCallback((pageNumber: number) => {
    return state.annotations.filter(ann => ann.pageNumber === pageNumber);
  }, [state.annotations]);

  return {
    annotations: state.annotations,
    selectedAnnotationId: state.selectedAnnotationId,
    editingAnnotationId: state.editingAnnotationId,
    drawingState,
    startDrawing,
    finishDrawing,
    cancelDrawing,
    selectAnnotation,
    editAnnotation,
    updateAnnotation,
    deleteAnnotation,
    getAnnotationsByPage,
  };
}; 