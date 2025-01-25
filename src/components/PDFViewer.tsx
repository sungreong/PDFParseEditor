'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Document, Page, pdfjs } from 'react-pdf';
import useWindowSize from '@/hooks/useWindowSize';

// PDF.js 워커 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const PDFViewer = () => {
  const windowSize = useWindowSize();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isScrollMode, setIsScrollMode] = useState<boolean>(false);
  const [isTextSelectable, setIsTextSelectable] = useState<boolean>(false);
  const [visiblePages, setVisiblePages] = useState<number[]>([1]);
  const [scale, setScale] = useState<number>(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [pageInputValue, setPageInputValue] = useState<string>('1');

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

      // 스크롤이 하단에 가까워지면 다음 페이지 로드
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
    
    // 초기 페이지 설정
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
      setPdfFile(acceptedFiles[0]);
      setPageNumber(1);
      setVisiblePages([1]);
      setScale(1);
      pageRefs.current.clear();
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

  const renderPage = (pageNum: number) => {
    return (
      <div 
        key={`page_${pageNum}`}
        ref={(ref) => setPageRef(pageNum, ref)}
        data-page={pageNum}
        className="pdf-page-container"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          marginBottom: isScrollMode ? `${Math.max(50 * scale, 32)}px` : '1rem',
          height: isScrollMode ? pdfDimensions.height : 'auto',
          minHeight: isScrollMode ? pdfDimensions.height : 'auto'
        }}
      >
        <div className={`pdf-page ${isTextSelectable ? 'selectable' : ''}`}>
          <Page
            pageNumber={pageNum}
            width={pdfDimensions.width / scale}
            className="shadow-lg"
            renderTextLayer={true}
            renderAnnotationLayer={false}
            loading={
              <div className="w-full h-[500px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            }
          />
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

  const renderSidebar = () => {
    if (!pdfFile) return null;

    return (
      <div 
        className={`fixed right-0 top-0 h-full bg-white shadow-lg transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-80' : 'w-0'
        }`}
      >
        <div className="relative h-full flex flex-col">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute -left-10 top-4 bg-white p-2 rounded-l-lg shadow-lg hover:bg-gray-100"
          >
            {isSidebarOpen ? '→' : '←'}
          </button>

          {/* 사이드바 헤더 */}
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-bold mb-2">문서 정보</h2>
            <p className="text-sm text-gray-600">
              {pdfFile.name}
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-6">
              {/* 페이지 네비게이션 섹션 */}
              <div className="bg-white rounded-lg p-4 shadow-sm border">
                <h3 className="font-semibold text-gray-700 mb-3">페이지 탐색</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">현재 페이지</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={numPages}
                        value={pageInputValue}
                        onChange={handlePageInputChange}
                        onBlur={handlePageInputBlur}
                        className="w-16 px-2 py-1 border rounded text-center"
                      />
                      <span className="text-sm text-gray-500">/ {numPages}</span>
                    </div>
                  </div>
                  {!isScrollMode && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPageNumber(page => Math.max(page - 1, 1))}
                        disabled={pageNumber <= 1}
                        className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm disabled:opacity-50"
                      >
                        이전
                      </button>
                      <button
                        onClick={() => setPageNumber(page => Math.min(page + 1, numPages))}
                        disabled={pageNumber >= numPages}
                        className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm disabled:opacity-50"
                      >
                        다음
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 보기 설정 섹션 */}
              <div className="bg-white rounded-lg p-4 shadow-sm border">
                <h3 className="font-semibold text-gray-700 mb-3">보기 설정</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">보기 모드</label>
                    <button
                      onClick={() => {
                        setIsScrollMode(!isScrollMode);
                        setVisiblePages([1]);
                        setPageNumber(1);
                      }}
                      className="w-full px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-sm"
                    >
                      {isScrollMode ? '페이지 모드로 전환' : '스크롤 모드로 전환'}
                    </button>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">텍스트 선택</label>
                    <button
                      onClick={() => setIsTextSelectable(!isTextSelectable)}
                      className={`w-full px-4 py-2 ${
                        isTextSelectable 
                          ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      } border rounded text-sm`}
                    >
                      {isTextSelectable ? '텍스트 선택 비활성화' : '텍스트 선택 활성화'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 확대/축소 섹션 */}
              <div className="bg-white rounded-lg p-4 shadow-sm border">
                <h3 className="font-semibold text-gray-700 mb-3">확대/축소 ({Math.round(scale * 100)}%)</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={handleZoomOut}
                      className="flex-1 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-sm"
                    >
                      축소
                    </button>
                    <button
                      onClick={handleResetZoom}
                      className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm"
                    >
                      100%
                    </button>
                    <button
                      onClick={handleZoomIn}
                      className="flex-1 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-sm"
                    >
                      확대
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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

      {pdfFile && (
        <div className="relative w-full">
          <div 
            ref={containerRef}
            className="w-full flex flex-col items-center overflow-auto max-h-[80vh] pdf-container"
            style={{ 
              minHeight: pdfDimensions.height,
              scrollBehavior: isScrollMode ? 'smooth' : 'auto',
              padding: isScrollMode ? `${Math.max(20 * scale, 16)}px 0` : 0,
              marginRight: isSidebarOpen ? '16rem' : '0',
              transition: 'margin-right 0.3s ease-in-out'
            }}
          >
            <Document
              file={pdfFile}
              onLoadSuccess={onDocumentLoadSuccess}
              className="flex flex-col items-center w-full"
              loading={<p>PDF를 불러오는 중...</p>}
              error={<p>PDF를 불러오는데 실패했습니다.</p>}
            >
              {isScrollMode ? (
                <div className="flex flex-col items-center" style={{ gap: `${Math.max(32 * scale, 24)}px` }}>
                  {visiblePages.map(pageNum => renderPage(pageNum))}
                </div>
              ) : (
                renderPage(pageNumber)
              )}
            </Document>
          </div>
          {renderSidebar()}
        </div>
      )}
    </div>
  );
};

export default PDFViewer; 