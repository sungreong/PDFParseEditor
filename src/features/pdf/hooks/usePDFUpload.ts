import { useState } from 'react';
import { PDFService } from '../services/pdfService';
import type { PDFInfo } from '../types';

export const usePDFUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<Error | null>(null);

  const uploadPDF = async (file: File): Promise<PDFInfo | null> => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const pdfService = PDFService.getInstance();
      const result = await pdfService.uploadPDF(file);
      return result;
    } catch (error) {
      setUploadError(error instanceof Error ? error : new Error('알 수 없는 오류가 발생했습니다.'));
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadPDF,
    isUploading,
    uploadError,
  };
}; 