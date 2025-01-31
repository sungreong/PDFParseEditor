export const API_ENDPOINTS = {
  CAPTURE_BOX: (documentName: string, pageNumber: number) => 
    `/api/pdf/${encodeURIComponent(documentName)}/pages/${pageNumber}/capture`,
  PROCESS_TEXT: '/api/process/text',
  ANALYZE_BOX: '/api/analyze/box',
} as const; 