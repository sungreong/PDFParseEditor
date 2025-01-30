import { useState } from 'react';
import type { PDFState } from '../types';

export const usePDFState = () => {
  const [state, setState] = useState<PDFState>({
    numPages: 0,
    pageNumber: 1,
    scale: 1,
    isScrollMode: false,
    isTextSelectable: false,
    visiblePages: [1],
    isSidebarOpen: true,
    isLayerSidebarOpen: false,
  });

  const setNumPages = (numPages: number) => setState(prev => ({ ...prev, numPages }));
  const setPageNumber = (pageNumber: number) => setState(prev => ({ ...prev, pageNumber }));
  const setScale = (scale: number) => setState(prev => ({ ...prev, scale }));
  const setIsScrollMode = (isScrollMode: boolean) => setState(prev => ({ ...prev, isScrollMode }));
  const setIsTextSelectable = (isTextSelectable: boolean) => setState(prev => ({ ...prev, isTextSelectable }));
  const setVisiblePages = (visiblePages: number[]) => setState(prev => ({ ...prev, visiblePages }));
  const setIsSidebarOpen = (isSidebarOpen: boolean) => setState(prev => ({ ...prev, isSidebarOpen }));
  const setIsLayerSidebarOpen = (isLayerSidebarOpen: boolean) => setState(prev => ({ ...prev, isLayerSidebarOpen }));

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