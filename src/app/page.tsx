'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// PDFViewer를 클라이언트 사이드에서만 로드
const PDFViewer = dynamic(() => import('@/components/PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  ),
});

export default function Home() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">PDF 뷰어</h1>
        <PDFViewer 
          file={pdfFile} 
          onFileChange={setPdfFile}
        />
      </div>
    </main>
  );
}
