import React, { useRef } from 'react';
import { Document, Page } from 'react-pdf';
import { ToolState, ToolActions } from '@/types/tools';
import PDFPage from './PDFPage';

interface PDFDocumentProps {
  file: File;
  pageNumber: number;
  scale: number;
  isScrollMode: boolean;
  isTextSelectable: boolean;
  visiblePages: number[];
  toolState: ToolState;
  toolActions: ToolActions;
  onBoxSelect: (boxId: string) => void;
  onLoadSuccess: ({ numPages }: { numPages: number }) => void;
}

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
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      ref={containerRef}
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
        onLoadSuccess={onLoadSuccess}
        className="mx-auto"
      >
        {isScrollMode ? (
          <div 
            className="flex flex-col items-center w-full" 
            style={{ gap: `${Math.max(32 * scale, 24)}px` }}
          >
            {visiblePages.map(pageNum => (
              <PDFPage
                key={pageNum}
                pageNumber={pageNum}
                scale={scale}
                isTextSelectable={isTextSelectable}
                toolState={toolState}
                toolActions={toolActions}
                onBoxSelect={onBoxSelect}
              />
            ))}
          </div>
        ) : (
          <PDFPage
            pageNumber={pageNumber}
            scale={scale}
            isTextSelectable={isTextSelectable}
            toolState={toolState}
            toolActions={toolActions}
            onBoxSelect={onBoxSelect}
          />
        )}
      </Document>
    </div>
  );
};

export default PDFDocument; 