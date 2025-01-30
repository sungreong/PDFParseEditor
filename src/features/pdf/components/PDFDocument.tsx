'use client';

import React, { useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import type { PDFDocumentProps } from '../types';

// PDF.js 워커 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const PDFDocument: React.FC<PDFDocumentProps> = ({
  file,
  pageNumber,
  scale,
  isScrollMode,
  isTextSelectable,
  visiblePages,
  toolState,
  toolActions,
  onBoxSelect,
  onLoadSuccess,
}) => {
  useEffect(() => {
    // PDF 로드 시 필요한 초기화 작업
  }, [file]);

  const renderPage = (pageNum: number) => (
    <div
      key={pageNum}
      className={`pdf-page ${isTextSelectable ? 'selectable' : ''} relative`}
      style={{
        marginBottom: '1rem',
      }}
    >
      <Page
        pageNumber={pageNum}
        scale={scale}
        className="shadow-lg"
        renderTextLayer={isTextSelectable}
        renderAnnotationLayer={false}
      />
      {/* 여기에 박스, 화살표 등의 오버레이 요소 추가 */}
    </div>
  );

  return (
    <div className="pdf-container relative flex justify-center">
      <Document
        file={file}
        onLoadSuccess={onLoadSuccess}
        className="relative"
      >
        {isScrollMode ? (
          visiblePages.map(renderPage)
        ) : (
          renderPage(pageNumber)
        )}
      </Document>
    </div>
  );
};

export default PDFDocument; 