import type { PDFInfo } from '../types';

export class PDFService {
  private static instance: PDFService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  public static getInstance(): PDFService {
    if (!PDFService.instance) {
      PDFService.instance = new PDFService();
    }
    return PDFService.instance;
  }

  async uploadPDF(file: File): Promise<PDFInfo> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/api/pdf/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('PDF 업로드 실패');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('PDF 업로드 중 오류 발생:', error);
      throw error;
    }
  }

  async getPDFInfo(fileId: string): Promise<PDFInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pdf/${fileId}`);
      
      if (!response.ok) {
        throw new Error('PDF 정보 조회 실패');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('PDF 정보 조회 중 오류 발생:', error);
      throw error;
    }
  }

  async extractText(fileId: string, pageNumber: number): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/pdf/${fileId}/text?page=${pageNumber}`
      );

      if (!response.ok) {
        throw new Error('텍스트 추출 실패');
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('텍스트 추출 중 오류 발생:', error);
      throw error;
    }
  }
} 