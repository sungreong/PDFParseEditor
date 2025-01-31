import { useState, useCallback } from 'react';

interface PDFState {
  numPages: number;
  pageNumber: number;
  scale: number;
  isScrollMode: boolean;
  isTextSelectable: boolean;
  visiblePages: number[];
  isSidebarOpen: boolean;
  isLayerSidebarOpen: boolean;
}

export const usePDFState = () => {
  const [state, setState] = useState<PDFState>({
    numPages: 0,
    pageNumber: 1,
    scale: 1,
    isScrollMode: false,
    isTextSelectable: false,
    visiblePages: [],
    isSidebarOpen: true,
    isLayerSidebarOpen: false,
  });

  const setNumPages = useCallback((value: number | ((prev: number) => number)) => {
    setState(prev => ({
      ...prev,
      numPages: typeof value === 'function' ? value(prev.numPages) : value
    }));
  }, []);

  const setPageNumber = useCallback((value: number | ((prev: number) => number)) => {
    setState(prev => ({
      ...prev,
      pageNumber: typeof value === 'function' ? value(prev.pageNumber) : value
    }));
  }, []);

  const setScale = useCallback((value: number | ((prev: number) => number)) => {
    setState(prev => ({
      ...prev,
      scale: typeof value === 'function' ? value(prev.scale) : value
    }));
  }, []);

  const setIsScrollMode = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, isScrollMode: value }));
  }, []);

  const setIsTextSelectable = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, isTextSelectable: value }));
  }, []);

  const setVisiblePages = useCallback((pages: number[]) => {
    setState(prev => ({ ...prev, visiblePages: pages }));
  }, []);

  const setIsSidebarOpen = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, isSidebarOpen: value }));
  }, []);

  const setIsLayerSidebarOpen = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, isLayerSidebarOpen: value }));
  }, []);

  return {
    ...state,
    setNumPages,
    setPageNumber,
    setScale,
    setIsScrollMode,
    setIsTextSelectable,
    setVisiblePages,
    setIsSidebarOpen,
    setIsLayerSidebarOpen,
  };
}; 