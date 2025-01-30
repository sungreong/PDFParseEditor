import React from 'react';
import { useDropzone } from 'react-dropzone';
import type { PDFDropzoneProps } from '../types';

const PDFDropzone: React.FC<PDFDropzoneProps> = ({ onFileUpload }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileUpload(acceptedFiles[0]);
      }
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`w-full p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
      }`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p className="text-center text-blue-500">PDF 파일을 여기에 놓으세요...</p>
      ) : (
        <p className="text-gray-500">
          PDF 파일을 드래그 앤 드롭하거나 클릭하여 선택하세요
        </p>
      )}
    </div>
  );
};

export default PDFDropzone; 