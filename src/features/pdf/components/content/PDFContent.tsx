import React from 'react';
import PDFToolbar from './PDFToolbar';
import PDFViewer from './PDFViewer';

interface PDFContentProps {
  isLayerSidebarOpen: boolean;
  setIsLayerSidebarOpen: (isOpen: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  pageNumber: number;
  numPages: number;
  handlePageChange: (page: number) => void;
  file: File;
  handlePDFLoadSuccess: (pdf: any) => void;
  isScrollMode: boolean;
  visiblePages: number[];
  renderPage: (pageNum: number) => React.ReactElement;
}

const PDFContent: React.FC<PDFContentProps> = ({
  isLayerSidebarOpen,
  setIsLayerSidebarOpen,
  isSidebarOpen,
  setIsSidebarOpen,
  pageNumber,
  numPages,
  handlePageChange,
  file,
  handlePDFLoadSuccess,
  isScrollMode,
  visiblePages,
  renderPage,
}) => {
  return (
    <div className={`flex-1 transition-all duration-300 ${isLayerSidebarOpen ? 'ml-80' : 'ml-0'} ${isSidebarOpen ? 'mr-80' : 'mr-0'}`}>
      <PDFToolbar
        isLayerSidebarOpen={isLayerSidebarOpen}
        setIsLayerSidebarOpen={setIsLayerSidebarOpen}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        pageNumber={pageNumber}
        numPages={numPages}
        handlePageChange={handlePageChange}
      />

      <PDFViewer
        file={file}
        handlePDFLoadSuccess={handlePDFLoadSuccess}
        isScrollMode={isScrollMode}
        visiblePages={visiblePages}
        pageNumber={pageNumber}
        renderPage={renderPage}
      />
    </div>
  );
};

export default PDFContent; 