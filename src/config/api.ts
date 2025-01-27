export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export const API_ENDPOINTS = {
  UPLOAD_PDF: `${API_BASE_URL}/api/upload`,
  GET_PDF_PAGE: (documentName: string, pageNumber: number) => 
    `${API_BASE_URL}/api/pages/${encodeURIComponent(documentName)}/${pageNumber}`,
  GET_PDF_INFO: (documentName: string) => 
    `${API_BASE_URL}/api/documents/${encodeURIComponent(documentName)}/info`,
  CAPTURE_BOX: (documentName: string, pageNumber: number) =>
    `${API_BASE_URL}/api/pages/${encodeURIComponent(documentName)}/${pageNumber}/capture`,
}; 