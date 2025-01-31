import { useState, useCallback, useEffect, useRef } from 'react';

interface UsePageManagerProps {
  numPages: number;
  isScrollMode: boolean;
  onPageChange?: (pageNumber: number) => void;
}

export const usePageManager = ({
  numPages,
  isScrollMode,
  onPageChange,
}: UsePageManagerProps) => {
  const [pageNumber, setPageNumber] = useState(1);
  const [visiblePages, setVisiblePages] = useState<number[]>([1]);
  const [pageRefs, setPageRefs] = useState<{ [key: number]: HTMLDivElement | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // 페이지 변경 핸들러
  const handlePageChange = useCallback((newPage: number) => {
    const validatedPage = Math.max(1, Math.min(newPage, numPages));
    if (validatedPage === pageNumber) return;
    
    console.log('PageChange - Changing to page:', {
      from: pageNumber,
      to: validatedPage,
      numPages
    });
    
    setPageNumber(validatedPage);
    onPageChange?.(validatedPage);
  }, [pageNumber, numPages, onPageChange]);

  // 페이지 ref 설정
  const setPageRef = useCallback((pageNum: number, ref: HTMLDivElement | null) => {
    if (pageRefs[pageNum] !== ref) {
      setPageRefs(prev => ({
        ...prev,
        [pageNum]: ref
      }));
    }
  }, [pageRefs]);

  // 스크롤 모드에서 보이는 페이지 업데이트
  useEffect(() => {
    if (!isScrollMode || !containerRef.current) return;

    const container = containerRef.current;
    const handleScroll = () => {
      if (!container) return;

      const { scrollTop, clientHeight } = container;
      const pageElements = container.querySelectorAll('.pdf-page-container');
      const newVisiblePages: number[] = [];

      pageElements.forEach((element: Element) => {
        const rect = element.getBoundingClientRect();
        const pageNum = parseInt(element.getAttribute('data-page') || '1');
        
        if (rect.top < clientHeight && rect.bottom > 0) {
          newVisiblePages.push(pageNum);
        }
      });

      if (newVisiblePages.length > 0) {
        setVisiblePages(newVisiblePages);
        setPageNumber(newVisiblePages[0]);
      }
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [isScrollMode]);

  return {
    pageNumber,
    visiblePages,
    pageRefs,
    containerRef,
    setPageNumber,
    setVisiblePages,
    handlePageChange,
    setPageRef,
  };
}; 