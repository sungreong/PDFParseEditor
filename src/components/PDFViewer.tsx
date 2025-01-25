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

// PDF.js 워커 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

interface PDFViewerProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

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
    return {
      width: baseWidth * scale,
      height: baseWidth * 1.414 * scale,
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileChange(acceptedFiles[0]);
      setPageNumber(1);
      setVisiblePages([1]);
      setScale(1);
      pageRefs.current.clear();
    }
  }, [onFileChange]);

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

  const handleBoxUpdate = useCallback((boxId: string, updates: Partial<Box>) => {
    if (file) {
      updateBox(file.name, pageNumber, boxId, updates);
      redrawAllCanvases(file.name, pageNumber);
    }
  }, [file, pageNumber, updateBox, redrawAllCanvases]);

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
                zIndex: isTextSelectable ? 1 : 2
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
            
            return (
              <div
                key={box.id}
                className={`box ${selectedBox?.id === box.id ? 'selected' : ''}`}
                style={{
                  left: `${box.x}px`,
                  top: `${box.y}px`,
                  width: `${box.width}px`,
                  height: `${box.height}px`,
                  borderColor: box.color || layer.color,
                  backgroundColor: `${box.color || layer.color}20`,
                  pointerEvents: isTextSelectable ? 'none' : 'auto',
                  zIndex: isTextSelectable ? 1 : 2
                }}
                onClick={!isTextSelectable ? (e) => handleBoxClick(box) : undefined}
              />
            );
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

  // 레이어 관리 섹션 렌더링
  const renderLayerManagementSection = useCallback(() => {
    if (!file) return null;

    const pageData = getPageData(file.name, pageNumber);
    const currentLayerBoxes = pageData?.boxes.filter(box => box.layerId === activeLayer?.id) || [];

    return (
      <div className="space-y-4 mb-6">
        <button
          onClick={handleAddLayer}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          새 레이어 추가
        </button>
        <div className="space-y-2">
          {pageData?.layers.map(layer => (
            <div
              key={layer.id}
              className={`flex items-center justify-between p-2 rounded ${
                activeLayer?.id === layer.id ? 'bg-blue-50' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layer.isVisible}
                  onChange={() => handleVisibilityToggle(layer.id)}
                  className="w-4 h-4"
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleLayerChange(layer);
                    setIsLayerBoxManagerOpen(true);
                  }}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  박스 관리
                </button>
                <button
                  onClick={() => handleLayerDelete(layer.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
        <div>
          <button
            onClick={() => setIsDrawMode(!isDrawMode)}
            className={`w-full px-4 py-2 transition-colors ${
              isDrawMode 
                ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            } border rounded text-sm`}
          >
            {isDrawMode ? '그리기 모드 비활성화' : '그리기 모드 활성화'}
          </button>
        </div>
      </div>
    );
  }, [file, pageNumber, getPageData, activeLayer, handleAddLayer, handleLayerChange, handleVisibilityToggle, handleLayerDelete, isDrawMode]);

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
        style={{ width: `${sidebarWidth}px`, zIndex: 50 }}
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
            {/* 문서 정보 섹션 */}
            <div className="bg-gray-50 p-3 rounded-lg border">
              <h2 className="text-base font-bold mb-1">문서 정보</h2>
              <p className="text-sm text-gray-600 truncate">{file.name}</p>
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
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPageNumber(page => Math.max(page - 1, 1))}
                      disabled={pageNumber <= 1}
                      className="flex-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs disabled:opacity-50"
                    >
                      이전
                    </button>
                    <button
                      onClick={() => setPageNumber(page => Math.min(page + 1, numPages))}
                      disabled={pageNumber >= numPages}
                      className="flex-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs disabled:opacity-50"
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
    );
  }, [
    file, sidebarWidth,
    numPages, pageInputValue, handlePageInputChange, handlePageInputBlur,
    isScrollMode, pageNumber, isTextSelectable,
    scale, handleZoomOut, handleResetZoom, handleZoomIn
  ]);

  const renderBoxContent = useCallback((box: Box) => {
    return null;  // 박스 내부에 텍스트를 표시하지 않음
  }, []);

  return (
    <div className="flex flex-col items-center p-4 min-h-screen">
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
        <div className="relative w-full">
          {renderLayerTab()}
          {renderSidebar()}
          <div 
            ref={containerRef}
            className="w-full flex flex-col items-center overflow-auto max-h-[80vh] pdf-container"
            style={{ 
              minHeight: pdfDimensions.height,
              minWidth: '800px',
              scrollBehavior: isScrollMode ? 'smooth' : 'auto',
              padding: isScrollMode ? `${Math.max(20 * scale, 16)}px 0` : 0,
              paddingLeft: '60px',
              paddingRight: isSidebarOpen ? `${sidebarWidth}px` : '0',
              transition: 'padding 0.3s ease-in-out',
              margin: '0 auto',
              maxWidth: '1600px'
            }}
          >
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              className="flex flex-col items-center w-full"
              loading={
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              }
              error={<p>PDF를 불러오는데 실패했습니다.</p>}
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
        </div>
      )}

      {/* LayerBoxManager 추가 */}
      {activeLayer && file && (
        <LayerBoxManager
          isOpen={isLayerBoxManagerOpen}
          onClose={() => setIsLayerBoxManagerOpen(false)}
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
        />
      )}

      {/* 박스 상세 정보 팝업 */}
      {selectedBox && (
        <DraggablePopup
          isOpen={isBoxDetailOpen}
          onClose={() => setIsBoxDetailOpen(false)}
          title="박스 상세 정보"
        >
          <BoxDetailEditor
            box={selectedBox}
            onUpdate={handleBoxUpdate}
          />
        </DraggablePopup>
      )}
    </div>
  );
};

export default PDFViewer; 