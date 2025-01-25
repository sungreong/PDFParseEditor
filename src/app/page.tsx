'use client';

import PDFViewer from '@/components/PDFViewer';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold text-center mb-8">PDF 뷰어</h1>
      <PDFViewer />
    </main>
  );
}
