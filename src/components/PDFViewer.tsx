'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Document, Page, pdfjs } from 'react-pdf';
import useWindowSize from '@/hooks/useWindowSize';
import { useLayerManager } from '../hooks/useLayerManager';
import type { Layer, Box } from '../hooks/useLayerManager';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import Sidebar from './Sidebar';
import DraggablePopup from './DraggablePopup';
import BoxDetailEditor from './BoxDetailEditor';
import LayerBoxManager from './LayerBoxManager';
import html2canvas from 'html2canvas';
import { usePDFUpload } from '../hooks/usePDFUpload';

// PDF.js 워커 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

interface PDFViewerProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

interface CompareViewerProps {
  file: File;
  layers: Layer[];
  pageNumber: number;
  scale: number;
  onClose: () => void;
}

const CompareViewer: React.FC<CompareViewerProps> = ({
  file,
  layers,
  pageNumber,
  scale,
  onClose
}) => {
  const { getPageData } = useLayerManager();
  const windowSize = useWindowSize();

  // PDF 크기 계산 로직
  const pdfDimensions = useMemo(() => {
    const maxWidth = Math.min(windowSize.width * 0.8, 1200); // 최대 너비 제한
    const width = maxWidth / layers.length; // 레이어 개수로 나누어 항상 한 행으로 표시
    return {
      width,
      height: width * 1.414,
      containerWidth: maxWidth
    };
  }, [windowSize.width, layers.length]);

  // 페이지 데이터를 직접 가져옴
  const pageData = useMemo(() => {
    if (!file || !pageNumber) return null;
    const data = getPageData(file.name, pageNumber);
    console.log('CompareViewer pageData:', {
      fileName: file.name,
      pageNumber,
      data
    });
    return data;
  }, [file, pageNumber, getPageData]);
  
  if (!pageData) {
    return (
      <DraggablePopup
        isOpen={true}
        onClose={onClose}
        title="레이어 비교"
        width="90vw"
        height="90vh"
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">데이터를 불러오는 중...</div>
        </div>
      </DraggablePopup>
    );
  }

  return (
    <DraggablePopup
      isOpen={true}
      onClose={onClose}
      title="레이어 비교"
      width="90vw"
      height="90vh"
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto p-4">
          <div className="flex justify-center">
            <div 
              className="grid gap-4"
              style={{ 
                gridTemplateColumns: `repeat(${layers.length}, 1fr)`,
                width: pdfDimensions.containerWidth,
                margin: '0 auto'
              }}
            >
              {layers.map(layer => {
                // 현재 레이어의 박스만 필터링
                const boxes = pageData.boxes.filter(box => box.layerId === layer.id);
                console.log('Layer boxes:', {
                  layerId: layer.id,
                  layerName: layer.name,
                  boxCount: boxes.length,
                  boxes
                });
                
                return (
                  <div key={layer.id} className="flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border border-gray-300"
                            style={{ backgroundColor: layer.color }}
                          />
                          <h3 className="text-lg font-semibold">{layer.name}</h3>
                        </div>
                        <span className="text-sm text-gray-500">
                          박스 {boxes.length}개
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        페이지 {pageNumber}
                      </div>
                    </div>
                    <div className="relative flex-1 p-4">
                      <Document file={file}>
                        <div className="relative">
                          <Page
                            pageNumber={pageNumber}
                            width={pdfDimensions.width}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            className="shadow-md"
                          />
                          <div className="absolute top-0 left-0 w-full h-full">
                            {boxes.map((box) => (
                              <div
                                key={box.id}
                                data-box-id={box.id}
                                className="absolute border-2 group"
                                style={{
                                  left: `${box.x * (pdfDimensions.width / 800)}px`,
                                  top: `${box.y * (pdfDimensions.width / 800)}px`,
                                  width: `${box.width * (pdfDimensions.width / 800)}px`,
                                  height: `${box.height * (pdfDimensions.width / 800)}px`,
                                  borderColor: box.color || layer.color,
                                  backgroundColor: `${box.color || layer.color}20`
                                }}
                              >
                                <div className="absolute -top-8 left-0 bg-white px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity text-xs whitespace-nowrap">
                                  {box.text || '텍스트 없음'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Document>
                    </div>
                    <div className="bg-gray-50 p-4 border-t max-h-48 overflow-y-auto">
                      <div className="space-y-2">
                        {boxes.map((box, index) => (
                          <div 
                            key={box.id}
                            className="text-sm p-2 bg-white rounded border hover:border-blue-300 cursor-pointer transition-colors"
                            onClick={() => {
                              const element = document.querySelector(`[data-box-id="${box.id}"]`);
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                (element as HTMLElement).style.outline = '2px solid blue';
                                setTimeout(() => {
                                  (element as HTMLElement).style.outline = 'none';
                                }, 2000);
                              }
                            }}
                          >
                            <div className="font-medium text-gray-700">박스 {index + 1}</div>
                            <div className="text-gray-500 truncate text-xs">
                              {box.text || '텍스트 없음'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DraggablePopup>
  );
};

const PDFViewer: React.FC<PDFViewerProps> = ({ file, onFileChange }) => {
  const windowSize = useWindowSize();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isScrollMode, setIsScrollMode] = useState<boolean>(false);
  const [isTextSelectable, setIsTextSelectable] = useState<boolean>(false);
  const [visiblePages, setVisiblePages] = useState<number[]>([1]);
  const [scale, setScale] = useState<number>(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [pageInputValue, setPageInputValue] = useState<string>('1');
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isBoxDetailOpen, setIsBoxDetailOpen] = useState(false);
  const [isLayerBoxManagerOpen, setIsLayerBoxManagerOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320); // 기본 너비를 320px로 변경
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isLayerSidebarOpen, setIsLayerSidebarOpen] = useState(false);
  const [layerSidebarWidth] = useState(300); // 레이어 사이드바 너비 고정
  const layerSidebarRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'layer' | 'document' | null>(null);
  const [compareViewers, setCompareViewers] = useState<Layer[]>([]);
  const [selectedLayers, setSelectedLayers] = useState<Layer[]>([]);
  const [isCompareViewerOpen, setIsCompareViewerOpen] = useState(false);
  const [isResizingBox, setIsResizingBox] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStartPoint, setResizeStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [originalBox, setOriginalBox] = useState<Box | null>(null);
  const { uploadPDF, isUploading, uploadError } = usePDFUpload();
  const [viewerDimensions, setViewerDimensions] = useState({ width: 800, height: 600 });
  const viewerRef = useRef<HTMLDivElement>(null);
  
  const {
    layersByDocument,
    activeLayer,
    selectedBox,
    layers,
    setLayers,
    setActiveLayer,
    setSelectedBox,
    initializeDocumentPage,
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    setCanvasRef,
    addBox,
    removeBox,
    updateBox,
    getPageData,
    redrawCanvas,
    redrawAllCanvases,
    updateLayerBoxesColor
  } = useLayerManager();

  // PDF 크기 계산
  const pdfDimensions = useMemo(() => {
    const maxHeight = windowSize.height * 0.8;
    const baseWidth = Math.min(windowSize.width * 0.9, maxHeight / 1.414, 800);
    const width = baseWidth * scale;
    const height = baseWidth * 1.414 * scale;

    // PDF 크기가 변경될 때마다 뷰어 크기도 업데이트
    setViewerDimensions({ width, height });
    
    return {
      width,
      height,
    };
  }, [windowSize, scale]);

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.1, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1);
  }, []);

  // 스크롤 이벤트 처리
  useEffect(() => {
    if (!isScrollMode || !containerRef.current) return;

    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const { scrollTop, clientHeight, scrollHeight } = container;
      const bottomOffset = scrollHeight - (scrollTop + clientHeight);
      const lastVisiblePage = Math.max(...visiblePages);

      if (bottomOffset < clientHeight * 0.5 && lastVisiblePage < numPages) {
        setVisiblePages(prev => {
          const nextPage = lastVisiblePage + 1;
          if (nextPage <= numPages && !prev.includes(nextPage)) {
            return [...prev, nextPage];
          }
          return prev;
        });
      }
    };

    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll);
    
    if (visiblePages.length === 1) {
      const initialPages = Array.from(
        { length: Math.min(3, numPages) },
        (_, i) => i + 1
      );
      setVisiblePages(initialPages);
    }

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [isScrollMode, numPages, visiblePages]);

  // 파일 업로드 처리
  const handleFileUpload = async (file: File) => {
    try {
      const pdfInfo = await uploadPDF(file);
      if (pdfInfo) {
        onFileChange(file);
        // PDF 정보를 기반으로 초기 설정
        setNumPages(pdfInfo.page_count);
        setPageNumber(1);
        
        // 첫 페이지의 레이어 초기화
        if (file) {
          initializeDocumentPage(file.name, 1);
        }
      }
    } catch (error) {
      console.error('파일 업로드 실패:', error);
    }
  };

  // react-dropzone onDrop 핸들러 수정
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      await handleFileUpload(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  });

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const setPageRef = useCallback((page: number, ref: HTMLDivElement | null) => {
    if (ref) {
      pageRefs.current.set(page, ref);
    }
  }, []);

  // 페이지 로드 시 레이어 초기화
  useEffect(() => {
    if (file && numPages > 0) {
      for (let i = 1; i <= numPages; i++) {
        initializeDocumentPage(file.name, i);
      }
    }
  }, [file, numPages, initializeDocumentPage]);

  // 캔버스 이벤트 핸들러
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawMode || !activeLayer) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setStartPoint({ x, y });
    setSelectedBox(null);
  }, [isDrawMode, activeLayer, scale, setSelectedBox]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawMode || !startPoint || !activeLayer) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    setCurrentBox({
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y)
    });
  }, [isDrawMode, startPoint, activeLayer, scale]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawMode || !startPoint || !currentBox || !activeLayer || !file) return;
    
    // 텍스트 레이어에서 선택된 영역의 텍스트 추출
    const textLayer = e.currentTarget.parentElement?.querySelector('.react-pdf__Page__textContent') as HTMLElement;
    let selectedText = '';
    
    if (textLayer) {
      const textElements = Array.from(textLayer.getElementsByTagName('span'));
      const scale = pdfDimensions.width / (textLayer.parentElement?.clientWidth || 1);
      
      textElements.forEach(span => {
        const rect = span.getBoundingClientRect();
        const canvasRect = e.currentTarget.getBoundingClientRect();
        
        // 텍스트 요소의 위치를 캔버스 기준으로 변환
        const elementX = (rect.left - canvasRect.left) / scale;
        const elementY = (rect.top - canvasRect.top) / scale;
        const elementRight = elementX + (rect.width / scale);
        const elementBottom = elementY + (rect.height / scale);

        // 박스 영역과 겹치는지 확인
        if (
          elementX < (currentBox.x + currentBox.width) &&
          elementRight > currentBox.x &&
          elementY < (currentBox.y + currentBox.height) &&
          elementBottom > currentBox.y
        ) {
          selectedText += span.textContent + ' ';
        }
      });
    }

    // 추출된 텍스트를 포함하여 박스 추가
    const newBox = addBox(file.name, pageNumber, {
      ...currentBox,
      type: 'box',
      text: selectedText.trim()
    });

    if (newBox) {
      setSelectedBox(newBox);
    }

    setStartPoint(null);
    setCurrentBox(null);
  }, [isDrawMode, startPoint, currentBox, activeLayer, file, pageNumber, addBox, setSelectedBox, pdfDimensions.width]);

  // 박스 클릭 이벤트 핸들러
  const handleBoxClick = useCallback((box: Box) => {
    setSelectedBox(box);
    setIsBoxDetailOpen(true);
  }, [setSelectedBox]);

  // 텍스트 추출 함수 수정
  const extractTextFromBox = useCallback((box: Box) => {
    const textLayer = document.querySelector('.react-pdf__Page__textContent') as HTMLElement;
    let selectedText = '';
    
    if (textLayer) {
      const textElements = Array.from(textLayer.getElementsByTagName('span'));
      const pdfPage = document.querySelector('.react-pdf__Page') as HTMLElement;
      
      if (pdfPage) {
        const pdfRect = pdfPage.getBoundingClientRect();
        const textLayerRect = textLayer.getBoundingClientRect();

        // PDF 페이지와 텍스트 레이어 간의 스케일 계산
        const scaleX = pdfDimensions.width / textLayerRect.width;
        const scaleY = pdfDimensions.height / textLayerRect.height;

        textElements.forEach(span => {
          const rect = span.getBoundingClientRect();
          
          // 텍스트 요소의 위치를 PDF 좌표계로 변환
          const elementX = (rect.left - textLayerRect.left) * scaleX;
          const elementY = (rect.top - textLayerRect.top) * scaleY;
          const elementWidth = rect.width * scaleX;
          const elementHeight = rect.height * scaleY;
          const elementRight = elementX + elementWidth;
          const elementBottom = elementY + elementHeight;

          // 박스 영역과 겹치는지 확인 (여유 있게 체크)
          const margin = 3; // 여유 마진 증가
          const overlap = (
            elementX - margin < (box.x + box.width) &&
            elementRight + margin > box.x &&
            elementY - margin < (box.y + box.height) &&
            elementBottom + margin > box.y
          );

          // 겹침 영역의 비율 계산
          if (overlap) {
            const overlapX = Math.min(elementRight, box.x + box.width) - Math.max(elementX, box.x);
            const overlapY = Math.min(elementBottom, box.y + box.height) - Math.max(elementY, box.y);
            const overlapArea = overlapX * overlapY;
            const elementArea = elementWidth * elementHeight;
            
            // 일정 비율 이상 겹치는 경우에만 텍스트 추가
            if (overlapArea > elementArea * 0.3) { // 30% 이상 겹치는 경우
              selectedText += span.textContent + ' ';
            }
          }
        });
      }
    }
    
    return selectedText.trim();
  }, [pdfDimensions.width, pdfDimensions.height]);

  const handleBoxUpdate = useCallback((boxId: string, updates: Partial<Box>) => {
    if (!file || !selectedBox) return;
    
    // 새로운 박스 상태 생성
    const updatedBox: Box = {
      ...selectedBox,
      ...updates
    };

    // 텍스트 처리 로직
    if ('text' in updates) {
      // 사용자가 직접 텍스트를 수정한 경우, 해당 텍스트를 사용
      updatedBox.text = updates.text;
    } else if ('x' in updates || 'y' in updates || 'width' in updates || 'height' in updates) {
      // 위치나 크기가 변경된 경우 항상 텍스트를 새로 추출
      const newText = extractTextFromBox(updatedBox);
      if (newText) {
        updatedBox.text = newText;
      } else {
        // 텍스트 추출 실패 시 기존 텍스트 유지
        updatedBox.text = updatedBox.text || '';
      }
    }

    // 상태 업데이트를 Promise로 래핑
    Promise.resolve()
      .then(() => {
        setSelectedBox(updatedBox);
        return new Promise<void>((resolve) => setTimeout(resolve, 0));
      })
      .then(() => {
        // 전체 업데이트된 박스 정보를 한 번에 전달
        updateBox(file.name, pageNumber, boxId, updatedBox);
        return new Promise<void>((resolve) => setTimeout(resolve, 0));
      })
      .then(() => {
        redrawAllCanvases(file.name, pageNumber);
      });
  }, [file, pageNumber, selectedBox, extractTextFromBox, updateBox, redrawAllCanvases]);

  // 박스 삭제 이벤트 핸들러
  const handleBoxDelete = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' && selectedBox && file) {
      removeBox(file.name, pageNumber, selectedBox.id);
    }
  }, [selectedBox, file, pageNumber, removeBox]);

  // 키보드 이벤트 리스너 추가
  useEffect(() => {
    window.addEventListener('keydown', handleBoxDelete);
    return () => {
      window.removeEventListener('keydown', handleBoxDelete);
    };
  }, [handleBoxDelete]);

  // 레이어 관련 핸들러
  const handleLayerChange = useCallback((layer: Layer) => {
    setActiveLayer(layer);
  }, [setActiveLayer]);

  const handleVisibilityToggle = useCallback((layerId: string) => {
    toggleLayerVisibility(layerId);
  }, [toggleLayerVisibility]);

  const handleLayerDelete = useCallback((layerId: string) => {
    if (window.confirm('레이어를 삭제하시겠습니까?')) {
      removeLayer(layerId);
    }
  }, [removeLayer]);

  const handleAddLayer = useCallback(() => {
    const name = prompt('새 레이어 이름을 입력하세요:');
    if (!name) return;

    // 레이어 이름 중복 체크
    const isNameExists = layers.some((layer: Layer) => layer.name === name);
    if (isNameExists) {
      alert('이미 존재하는 레이어 이름입니다. 다른 이름을 입력해주세요.');
      return;
    }

    // HSL을 HEX로 변환하는 함수
    const hslToHex = (h: number, s: number, l: number) => {
      l /= 100;
      const a = s * Math.min(l, 1 - l) / 100;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };

    // 랜덤 HSL 색상 생성
    const hue = Math.floor(Math.random() * 360);
    const saturation = Math.floor(Math.random() * 30) + 70; // 70-100% 채도
    const lightness = Math.floor(Math.random() * 20) + 40; // 40-60% 명도
    const defaultColor = hslToHex(hue, saturation, lightness);
    
    const newLayer = addLayer(name, defaultColor);
    
    // 색상 선택기 대화상자 생성
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.value = defaultColor;
    
    colorPicker.addEventListener('change', (e) => {
      const color = (e.target as HTMLInputElement).value;
      if (newLayer) {
        const updatedLayer = { ...newLayer, color };
        setActiveLayer(updatedLayer);
        setLayers((prev: Layer[]) => 
          prev.map((layer: Layer) => 
            layer.id === newLayer.id ? { ...layer, color } : layer
          )
        );
        
        // 현재 레이어의 모든 박스 색상 업데이트
        if (file) {
          updateLayerBoxesColor(file.name, pageNumber, newLayer.id, color);
          redrawAllCanvases(file.name, pageNumber);
        }
      }
    });

    colorPicker.click();
  }, [addLayer, setActiveLayer, setLayers, file, pageNumber, updateLayerBoxesColor, redrawAllCanvases, layers]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 320 && newWidth < window.innerWidth * 0.4) { // 최소 너비를 320px로 변경
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // 박스 리사이즈 핸들러
  const handleResizeStart = useCallback((e: React.MouseEvent, box: Box, handle: string) => {
    e.stopPropagation();
    setIsResizingBox(true);
    setResizeHandle(handle);
    setResizeStartPoint({
      x: e.clientX,
      y: e.clientY
    });
    setOriginalBox(box);
    setSelectedBox(box);
  }, [setSelectedBox]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingBox || !resizeStartPoint || !originalBox || !resizeHandle || !file) return;

    const deltaX = (e.clientX - resizeStartPoint.x) / scale;
    const deltaY = (e.clientY - resizeStartPoint.y) / scale;

    let newBox = { ...originalBox };

    switch (resizeHandle) {
      case 'top':
        newBox.y += deltaY;
        newBox.height -= deltaY;
        break;
      case 'bottom':
        newBox.height += deltaY;
        break;
      case 'left':
        newBox.x += deltaX;
        newBox.width -= deltaX;
        break;
      case 'right':
        newBox.width += deltaX;
        break;
      case 'top-left':
        newBox.x += deltaX;
        newBox.y += deltaY;
        newBox.width -= deltaX;
        newBox.height -= deltaY;
        break;
      case 'top-right':
        newBox.y += deltaY;
        newBox.width += deltaX;
        newBox.height -= deltaY;
        break;
      case 'bottom-left':
        newBox.x += deltaX;
        newBox.width -= deltaX;
        newBox.height += deltaY;
        break;
      case 'bottom-right':
        newBox.width += deltaX;
        newBox.height += deltaY;
        break;
    }

    // 최소 크기 제한
    if (newBox.width < 10) {
      newBox.width = 10;
      newBox.x = originalBox.x + (originalBox.width - 10);
    }
    if (newBox.height < 10) {
      newBox.height = 10;
      newBox.y = originalBox.y + (originalBox.height - 10);
    }

    // 텍스트 추출 및 업데이트
    const newText = extractTextFromBox(newBox);
    if (newText !== newBox.text) {
      newBox.text = newText;
    }

    // 상태 업데이트를 Promise로 래핑
    Promise.resolve()
      .then(() => {
        setSelectedBox(newBox);
        return new Promise<void>((resolve) => setTimeout(resolve, 0));
      })
      .then(() => {
        updateBox(file.name, pageNumber, newBox.id, newBox);
        return new Promise<void>((resolve) => setTimeout(resolve, 0));
      })
      .then(() => {
        redrawAllCanvases(file.name, pageNumber);
      });
  }, [isResizingBox, resizeStartPoint, originalBox, resizeHandle, scale, file, pageNumber, extractTextFromBox, updateBox, redrawAllCanvases]);

  const handleResizeEnd = useCallback(() => {
    setIsResizingBox(false);
    setResizeHandle(null);
    setResizeStartPoint(null);
    setIsBoxDetailOpen(true);
  }, []);

  // 리사이즈 이벤트 리스너
  useEffect(() => {
    if (isResizingBox) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizingBox, handleResizeMove, handleResizeEnd]);

  const renderPage = (pageNum: number) => {
    const pageData = file ? getPageData(file.name, pageNum) : null;

    return (
      <div 
        key={`page_${pageNum}`}
        ref={(ref) => setPageRef(pageNum, ref)}
        data-page={pageNum}
        className="pdf-page-container relative"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          marginBottom: isScrollMode ? `${Math.max(50 * scale, 32)}px` : '1rem',
          height: isScrollMode ? pdfDimensions.height : 'auto',
          minHeight: isScrollMode ? pdfDimensions.height : 'auto'
        }}
      >
        <div 
          className={`pdf-page ${isTextSelectable ? 'selectable' : ''} relative`}
          style={{
            position: 'relative',
            zIndex: isTextSelectable ? 10 : 1
          }}
        >
          <Page
            pageNumber={pageNum}
            width={pdfDimensions.width / scale}
            className={`shadow-lg ${isTextSelectable ? 'selectable' : ''}`}
            renderTextLayer={true}
            renderAnnotationLayer={false}
            loading={
              <div className="w-full h-[500px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            }
          />
          {pageData?.canvases.map(canvas => (
            <canvas
              key={canvas.layerId}
              ref={ref => {
                if (ref && ref !== canvas.canvasRef) {
                  requestAnimationFrame(() => {
                    setCanvasRef(file!.name, pageNum, canvas.layerId, ref);
                  });
                }
              }}
              className={`canvas-layer ${isDrawMode && activeLayer?.id === canvas.layerId ? 'active' : ''}`}
              width={pdfDimensions.width}
              height={pdfDimensions.height}
              style={{
                opacity: 0.7,
                display: canvas.layerId === activeLayer?.id ? 'block' : 'none',
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: isTextSelectable ? 'none' : (isDrawMode && activeLayer?.id === canvas.layerId ? 'auto' : 'none'),
                zIndex: isTextSelectable ? 1 : 2,
                backgroundColor: 'transparent'
              }}
              onMouseDown={!isTextSelectable ? handleCanvasMouseDown : undefined}
              onMouseMove={!isTextSelectable ? handleCanvasMouseMove : undefined}
              onMouseUp={!isTextSelectable ? handleCanvasMouseUp : undefined}
            />
          ))}
          {/* 현재 그리고 있는 박스 미리보기 */}
          {currentBox && isDrawMode && !isTextSelectable && (
            <div
              className="box-preview"
              style={{
                left: `${currentBox.x}px`,
                top: `${currentBox.y}px`,
                width: `${currentBox.width}px`,
                height: `${currentBox.height}px`,
                borderColor: activeLayer?.color,
                zIndex: 3
              }}
            />
          )}
          {/* 그려진 박스들 표시 */}
          {pageData?.boxes.map(box => {
            const layer = pageData.layers.find(l => l.id === box.layerId);
            if (!layer?.isVisible) return null;
            return renderBox(box, layer);
          })}
        </div>
      </div>
    );
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setPageInputValue(newValue);
    
    const pageNum = parseInt(newValue);
    if (!isNaN(pageNum)) {
      if (pageNum < 1) {
        setPageNumber(1);
        setPageInputValue('1');
      } else if (pageNum > numPages) {
        setPageNumber(numPages);
        setPageInputValue(numPages.toString());
      } else {
        setPageNumber(pageNum);
      }
    }
  };

  const handlePageInputBlur = () => {
    const pageNum = parseInt(pageInputValue);
    if (isNaN(pageNum)) {
      setPageInputValue(pageNumber.toString());
    } else if (pageNum < 1) {
      setPageNumber(1);
      setPageInputValue('1');
    } else if (pageNum > numPages) {
      setPageNumber(numPages);
      setPageInputValue(numPages.toString());
    }
  };

  useEffect(() => {
    setPageInputValue(pageNumber.toString());
  }, [pageNumber]);

  // 레이어 비교 버튼 핸들러
  const handleCompareLayer = useCallback((layer: Layer) => {
    setCompareViewers(prev => {
      if (prev.find(l => l.id === layer.id)) {
        return prev.filter(l => l.id !== layer.id);
      }
      return [...prev, layer];
    });
  }, []);

  // 레이어 선택 토글 핸들러
  const handleLayerSelect = useCallback((layer: Layer) => {
    setSelectedLayers(prev => {
      const isSelected = prev.some(l => l.id === layer.id);
      if (isSelected) {
        return prev.filter(l => l.id !== layer.id);
      }
      return [...prev, layer];
    });
  }, []);

  // 레이어 관리 섹션 렌더링 수정
  const renderLayerManagementSection = useCallback(() => {
    if (!file) return null;

    const pageData = getPageData(file.name, pageNumber);

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <button
            onClick={handleAddLayer}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-lg">+</span>
            <span>새 레이어 추가</span>
          </button>
          {selectedLayers.length > 0 && (
            <button
              onClick={() => setIsCompareViewerOpen(true)}
              className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
            >
              <span>📊</span>
              <span>{selectedLayers.length}개 레이어 비교</span>
            </button>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-xs text-gray-500 mb-2 px-2">전체 레이어 ({pageData?.layers.length || 0})</div>
          <div className="space-y-2">
            {pageData?.layers.map(layer => {
              const boxCount = pageData.boxes.filter(box => box.layerId === layer.id).length;
              return (
                <div
                  key={layer.id}
                  className={`bg-white rounded-lg p-3 border transition-colors ${
                    activeLayer?.id === layer.id ? 'border-blue-300 shadow-sm' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layer.isVisible}
                        onChange={() => handleVisibilityToggle(layer.id)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span
                        className={`cursor-pointer ${
                          activeLayer?.id === layer.id ? 'font-semibold' : ''
                        }`}
                        onClick={() => handleLayerChange(layer)}
                      >
                        {layer.name}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedLayers.some(l => l.id === layer.id)}
                      onChange={() => handleLayerSelect(layer)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-gray-500 text-xs">
                      박스 {boxCount}개
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          handleLayerChange(layer);
                          setIsLayerBoxManagerOpen(true);
                        }}
                        className="px-2 py-1 text-blue-500 hover:bg-blue-50 rounded transition-colors text-xs"
                      >
                        박스 관리
                      </button>
                      <button
                        onClick={() => handleLayerDelete(layer.id)}
                        className="px-2 py-1 text-red-500 hover:bg-red-50 rounded transition-colors text-xs"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={() => setIsDrawMode(!isDrawMode)}
            className={`w-full px-4 py-2 rounded-lg transition-colors ${
              isDrawMode 
                ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            } border text-sm flex items-center justify-center gap-2`}
          >
            <span>{isDrawMode ? '✏️' : '🖌️'}</span>
            <span>{isDrawMode ? '그리기 모드 비활성화' : '그리기 모드 활성화'}</span>
          </button>
        </div>
      </div>
    );
  }, [file, pageNumber, getPageData, activeLayer, handleAddLayer, handleLayerChange, handleVisibilityToggle, handleLayerDelete, selectedLayers, handleLayerSelect, isDrawMode]);

  const renderLayerTab = useCallback(() => {
    return (
      <>
        {/* 레이어 탭 버튼 */}
        <div className="fixed left-0 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-r-lg z-50">
          <button
            onClick={() => setIsLayerSidebarOpen(!isLayerSidebarOpen)}
            className="p-3 hover:bg-gray-100 transition-colors"
            title="레이어 관리"
          >
            📑
          </button>
        </div>

        {/* 레이어 관리 팝업 */}
        {isLayerSidebarOpen && (
          <div
            className="fixed top-0 left-14 h-full bg-white border-r shadow-lg"
            style={{ width: '300px', zIndex: 40 }}
          >
            <div className="h-full overflow-y-auto p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">레이어 관리</h2>
                <button
                  onClick={() => setIsLayerSidebarOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
              {renderLayerManagementSection()}
            </div>
          </div>
        )}
      </>
    );
  }, [isLayerSidebarOpen, renderLayerManagementSection]);

  const renderSidebar = useCallback(() => {
    if (!file) return null;

    return (
      <div
        ref={sidebarRef}
        className="fixed top-0 right-0 h-full bg-white border-l shadow-lg"
        style={{ width: `${sidebarWidth}px`, zIndex: 0 }}
      >
        <div className="relative h-full">
          <div
            className="absolute left-0 top-0 w-1 h-full cursor-ew-resize hover:bg-blue-200 transition-colors"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
          />
          <div className="h-full overflow-y-auto p-3 space-y-4">
            {/* 문서 정보 탭 버튼 */}
            <div className="fixed right-0 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-l-lg z-50">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-3 hover:bg-gray-100 transition-colors"
                title="문서 정보"
              >
                📄
              </button>
            </div>

            {/* 문서 정보 사이드바 */}
            {isSidebarOpen && (
              <div
                ref={sidebarRef}
                className="fixed top-0 right-0 h-full bg-white border-l shadow-lg"
                style={{ width: `${sidebarWidth}px`, zIndex: 40 }}
              >
                <div className="h-full overflow-y-auto p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">문서 정보</h2>
                    <button
                      onClick={() => setIsSidebarOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      ✕
                    </button>
                  </div>
                  {/* 문서 정보 내용 */}
                  <div className="space-y-4">
                    {/* 문서 정보 섹션 */}
                    <div className="bg-gray-50 p-3 rounded-lg border">
                      <h2 className="text-base font-bold mb-1">문서 정보</h2>
                      <p className="text-sm text-gray-600 truncate">{file?.name}</p>
                    </div>

                    {/* 페이지 네비게이션 섹션 */}
                    <div className="bg-white rounded-lg p-3 shadow-sm border">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">페이지 탐색</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">현재 페이지</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={numPages}
                              value={pageInputValue}
                              onChange={handlePageInputChange}
                              onBlur={handlePageInputBlur}
                              className="w-16 px-2 py-1 border rounded text-center text-sm"
                            />
                            <span className="text-xs text-gray-500">/ {numPages}</span>
                          </div>
                        </div>
                        {!isScrollMode && (
                          <div className="flex gap-1 mt-2">
                            <button
                              onClick={() => setPageNumber(page => Math.max(page - 1, 1))}
                              disabled={pageNumber <= 1}
                              className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs disabled:opacity-50"
                            >
                              이전
                            </button>
                            <button
                              onClick={() => setPageNumber(page => Math.min(page + 1, numPages))}
                              disabled={pageNumber >= numPages}
                              className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs disabled:opacity-50"
                            >
                              다음
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 보기 설정 섹션 */}
                    <div className="bg-white rounded-lg p-3 shadow-sm border">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">보기 설정</h3>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">보기 모드</label>
                          <button
                            onClick={() => {
                              setIsScrollMode(!isScrollMode);
                              setVisiblePages([1]);
                              setPageNumber(1);
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-xs"
                          >
                            {isScrollMode ? '페이지 모드로 전환' : '스크롤 모드로 전환'}
                          </button>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">텍스트 선택</label>
                          <button
                            onClick={() => setIsTextSelectable(!isTextSelectable)}
                            className={`w-full px-3 py-1.5 ${
                              isTextSelectable 
                                ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            } border rounded text-xs`}
                          >
                            {isTextSelectable ? '텍스트 선택 비활성화' : '텍스트 선택 활성화'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 확대/축소 섹션 */}
                    <div className="bg-white rounded-lg p-3 shadow-sm border">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">확대/축소 ({Math.round(scale * 100)}%)</h3>
                      <div className="flex items-center justify-between gap-1">
                        <button
                          onClick={handleZoomOut}
                          className="flex-1 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-xs"
                        >
                          축소
                        </button>
                        <button
                          onClick={handleResetZoom}
                          className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs"
                        >
                          100%
                        </button>
                        <button
                          onClick={handleZoomIn}
                          className="flex-1 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-xs"
                        >
                          확대
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }, [
    file, sidebarWidth,
    numPages, pageInputValue, handlePageInputChange, handlePageInputBlur,
    isScrollMode, pageNumber, isTextSelectable,
    scale, handleZoomOut, handleResetZoom, handleZoomIn, isSidebarOpen
  ]);

  const renderBox = useCallback((box: Box, layer: Layer) => {
    const isSelected = selectedBox?.id === box.id;
    
    return (
      <div
        key={box.id}
        className={`box ${isSelected ? 'selected' : ''} relative group`}
        style={{
          left: `${box.x}px`,
          top: `${box.y}px`,
          width: `${box.width}px`,
          height: `${box.height}px`,
          borderColor: box.color || layer.color,
          borderWidth: '2px',
          borderStyle: 'solid',
          pointerEvents: isTextSelectable ? 'none' : 'auto',
          zIndex: isTextSelectable ? 1 : 2
        }}
        onClick={!isTextSelectable ? (e) => handleBoxClick(box) : undefined}
      >
        {isSelected && !isTextSelectable && (
          <>
            {/* 모서리 핸들 */}
            <div
              className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nw-resize -top-1.5 -left-1.5"
              onMouseDown={(e) => handleResizeStart(e, box, 'top-left')}
            />
            <div
              className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ne-resize -top-1.5 -right-1.5"
              onMouseDown={(e) => handleResizeStart(e, box, 'top-right')}
            />
            <div
              className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-sw-resize -bottom-1.5 -left-1.5"
              onMouseDown={(e) => handleResizeStart(e, box, 'bottom-left')}
            />
            <div
              className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-se-resize -bottom-1.5 -right-1.5"
              onMouseDown={(e) => handleResizeStart(e, box, 'bottom-right')}
            />
            
            {/* 변 핸들 */}
            <div
              className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-n-resize top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
              onMouseDown={(e) => handleResizeStart(e, box, 'top')}
            />
            <div
              className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-s-resize bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"
              onMouseDown={(e) => handleResizeStart(e, box, 'bottom')}
            />
            <div
              className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-w-resize top-1/2 left-0 -translate-x-1/2 -translate-y-1/2"
              onMouseDown={(e) => handleResizeStart(e, box, 'left')}
            />
            <div
              className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-e-resize top-1/2 right-0 translate-x-1/2 -translate-y-1/2"
              onMouseDown={(e) => handleResizeStart(e, box, 'right')}
            />
          </>
        )}
      </div>
    );
  }, [selectedBox, isTextSelectable, handleBoxClick, handleResizeStart, scale]);

  // 뷰어 크기 측정
  useEffect(() => {
    const updateViewerDimensions = () => {
      const container = containerRef.current;
      if (container) {
        // PDF 페이지를 감싸는 div 요소 찾기
        const pdfPage = container.querySelector('.react-pdf__Page');
        if (pdfPage) {
          const rect = pdfPage.getBoundingClientRect();
          console.log('실제 PDF 페이지 크기:', { width: rect.width, height: rect.height });
          setViewerDimensions({ width: rect.width, height: rect.height });
        }
      }
    };

    // 초기 측정 및 PDF 로드 후 측정
    const timer = setTimeout(updateViewerDimensions, 1000);

    // ResizeObserver를 사용하여 크기 변경 감지
    const resizeObserver = new ResizeObserver(() => {
      updateViewerDimensions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // 이벤트 리스너 등록
    window.addEventListener('resize', updateViewerDimensions);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateViewerDimensions);
    };
  }, [file, scale]); // scale 변경 시에도 크기 업데이트

  return (
    <div className="flex flex-col items-center p-4 min-h-screen" ref={viewerRef}>
      <div
        {...getRootProps()}
        className={`w-full max-w-2xl p-4 sm:p-8 mb-4 border-2 border-dashed rounded-lg cursor-pointer
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-center text-blue-500">PDF 파일을 여기에 놓으세요...</p>
        ) : (
          <p className="text-center text-gray-500">
            PDF 파일을 드래그 앤 드롭하거나 클릭하여 선택하세요
          </p>
        )}
      </div>

      {file && (
        <div className="relative w-full" ref={containerRef}>
          <div 
            className="pdf-container relative flex justify-center"
            style={{ 
              width: '100%',
              margin: '0 auto',
              paddingRight: '0',
              transition: 'padding 0.3s ease-in-out',
              display: 'flex',
              justifyContent: 'center'
            }}
          >
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              className="mx-auto"
            >
              {isScrollMode ? (
                <div className="flex flex-col items-center w-full" style={{ gap: `${Math.max(32 * scale, 24)}px` }}>
                  {visiblePages.map(pageNum => renderPage(pageNum))}
                </div>
              ) : (
                renderPage(pageNumber)
              )}
            </Document>
          </div>
          {renderLayerTab()}
          {renderSidebar()}
        </div>
      )}

      {/* LayerBoxManager 추가 */}
      {activeLayer && file && (
        <DraggablePopup
          isOpen={isLayerBoxManagerOpen}
          onClose={() => setIsLayerBoxManagerOpen(false)}
          title={`${activeLayer.name} 박스 관리`}
          width="800px"
          height="80vh"
        >
          <LayerBoxManager
            layer={activeLayer}
            documentName={file.name}
            getPageData={getPageData}
            numPages={numPages}
            onBoxSelect={(box) => {
              setSelectedBox(box);
              setIsBoxDetailOpen(true);
            }}
            onBoxDelete={(boxId) => {
              removeBox(file.name, pageNumber, boxId);
              redrawAllCanvases(file.name, pageNumber);
            }}
            onBoxUpdate={handleBoxUpdate}
            onBoxesUpload={(boxes) => {
              boxes.forEach(box => {
                addBox(file.name, box.pageNumber, {
                  x: box.x,
                  y: box.y,
                  width: box.width,
                  height: box.height,
                  text: box.text,
                  type: box.type,
                  color: box.color
                });
              });
              redrawAllCanvases(file.name, pageNumber);
            }}
          />
        </DraggablePopup>
      )}

      {/* 박스 상세 정보 팝업 */}
      {selectedBox && file && (
        <DraggablePopup
          isOpen={isBoxDetailOpen}
          width="400px"
          height="90vh"
          onClose={() => {
            setIsBoxDetailOpen(false);
            setOriginalBox(null);
          }}
          title="박스 상세 정보"
        >
          <BoxDetailEditor
            box={selectedBox}
            originalBox={originalBox}
            pageNumber={pageNumber}
            documentName={file.name}
            onUpdate={(boxId, updates) => {
              // 텍스트 업데이트가 있는 경우
              if ('text' in updates) {
                handleBoxUpdate(boxId, updates);
              } 
              // 위치나 크기 변경이 있는 경우
              else if ('x' in updates || 'y' in updates || 'width' in updates || 'height' in updates) {
                const textLayer = document.querySelector('.react-pdf__Page__textContent') as HTMLElement;
                if (textLayer) {
                  const updatedBox = {
                    ...selectedBox,
                    ...updates
                  };
                  const newText = extractTextFromBox(updatedBox);
                  handleBoxUpdate(boxId, { ...updates, text: newText });
                }
              } 
              // 기타 업데이트의 경우
              else {
                handleBoxUpdate(boxId, updates);
              }
            }}
            onCancel={() => {
              if (file && originalBox) {
                const updatedBox = { ...originalBox };
                setSelectedBox(updatedBox);
                updateBox(file.name, pageNumber, originalBox.id, updatedBox);
                redrawAllCanvases(file.name, pageNumber);
              }
              setIsBoxDetailOpen(false);
              setOriginalBox(null);
            }}
            viewerWidth={viewerDimensions.width}
            viewerHeight={viewerDimensions.height}
          />
        </DraggablePopup>
      )}

      {/* 비교 뷰어 */}
      {file && isCompareViewerOpen && selectedLayers.length > 0 && (
        <>
          {console.log('CompareViewer 렌더링:', {
            selectedLayers,
            pageNumber,
            pageData: getPageData(file.name, pageNumber),
            boxes: getPageData(file.name, pageNumber)?.boxes || [],
            전체상태: layersByDocument
          })}
          <CompareViewer
            file={file}
            layers={selectedLayers}
            pageNumber={pageNumber}
            scale={scale}
            onClose={() => {
              setIsCompareViewerOpen(false);
              setSelectedLayers([]);
            }}
          />
        </>
      )}
    </div>
  );
};

export default PDFViewer; 