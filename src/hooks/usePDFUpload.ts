import { useState } from 'react';
import { API_ENDPOINTS } from '../config/api';

interface PDFInfo {
  filename: string;
  page_count: number;
  metadata: any;
  size: number;
}

export const usePDFUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadPDF = async (file: File): Promise<PDFInfo | null> => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(API_ENDPOINTS.UPLOAD_PDF, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '파일 업로드에 실패했습니다.');
      }

      const pdfInfo = await response.json();
      return pdfInfo;
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const getPDFPageImage = async (documentName: string, pageNumber: number): Promise<string> => {
    const response = await fetch(API_ENDPOINTS.GET_PDF_PAGE(documentName, pageNumber));
    if (!response.ok) {
      throw new Error('페이지 이미지를 불러오는데 실패했습니다.');
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  };

  const getPDFInfo = async (documentName: string): Promise<PDFInfo> => {
    const response = await fetch(API_ENDPOINTS.GET_PDF_INFO(documentName));
    if (!response.ok) {
      throw new Error('PDF 정보를 불러오는데 실패했습니다.');
    }
    return response.json();
  };

  return {
    uploadPDF,
    getPDFPageImage,
    getPDFInfo,
    isUploading,
    uploadError,
  };
}; 