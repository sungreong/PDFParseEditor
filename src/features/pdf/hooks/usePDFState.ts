import { useState, useCallback } from 'react';

interface PDFState {
  numPages: number;
  pageNumber: number;
  scale: number;
  isScrollMode: boolean;
  visiblePages: number[];
  isSidebarOpen: boolean;
  isLayerSidebarOpen: boolean;
}

export function usePDFState() {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [isScrollMode, setIsScrollMode] = useState(false);
  const [visiblePages, setVisiblePages] = useState<number[]>([1]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLayerSidebarOpen, setIsLayerSidebarOpen] = useState(true);

  return {
    numPages,
    pageNumber,
    scale,
    isScrollMode,
    visiblePages,
    isSidebarOpen,
    isLayerSidebarOpen,
    setNumPages,
    setPageNumber,
    setScale,
    setIsScrollMode,
    setVisiblePages,
    setIsSidebarOpen,
    setIsLayerSidebarOpen,
  };
} 