import React from 'react';
import { useDropzone } from 'react-dropzone';

interface PDFDropzoneProps {
  onFileUpload: (file: File) => void;
}

const PDFDropzone: React.FC<PDFDropzoneProps> = ({ onFileUpload }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        onFileUpload(file);
      }
    },
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`w-full max-w-2xl p-4 sm:p-8 mb-4 border-2 border-dashed rounded-lg cursor-pointer
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p className="text-center text-blue-500">PDF 파일을 여기에 놓으세요...</p>
      ) : (
        <p className="text-center text-gray-500">
          PDF 파일을 드래그 앤 드롭하거나 클릭하여 선택하세요
        </p>
      )}
    </div>
  );
};

export default PDFDropzone; 