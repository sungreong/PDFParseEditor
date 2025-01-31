'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import PDFViewer from '@/features/pdf/components/PDFViewer';
import { ConnectionProvider } from '@/features/connection/contexts/ConnectionContext';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <ConnectionProvider>
      <main className="min-h-screen">
        <PDFViewer 
          file={file} 
          onFileChange={setFile}
        />
      </main>
    </ConnectionProvider>
  );
}
