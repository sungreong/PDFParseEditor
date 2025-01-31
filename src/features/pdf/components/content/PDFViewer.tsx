import React from 'react';
import { Document } from 'react-pdf';

interface PDFViewerProps {
  file: File;
  handlePDFLoadSuccess: (pdf: any) => void;
  isScrollMode: boolean;
  visiblePages: number[];
  pageNumber: number;
  renderPage: (pageNum: number) => React.ReactElement;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  file,
  handlePDFLoadSuccess,
  isScrollMode,
  visiblePages,
  pageNumber,
  renderPage,
}) => {
  return (
    <Document
      file={file}
      onLoadSuccess={handlePDFLoadSuccess}
      className="mx-auto"
    >
      {isScrollMode ? (
        visiblePages.map(renderPage)
      ) : (
        renderPage(pageNumber)
      )}
    </Document>
  );
};

export default PDFViewer; 