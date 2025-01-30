import React from 'react';
import type { Annotation } from '../types';

interface AnnotationListProps {
  annotations: Annotation[];
  onSelect: (annotationId: string) => void;
  onDelete: (annotationId: string) => void;
  currentPage: number;
}

export const AnnotationList: React.FC<AnnotationListProps> = ({
  annotations,
  onSelect,
  onDelete,
  currentPage,
}) => {
  const sortedAnnotations = [...annotations].sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) {
      return a.pageNumber - b.pageNumber;
    }
    return a.position.y - b.position.y;
  });

  const groupedAnnotations = sortedAnnotations.reduce((acc, annotation) => {
    const page = annotation.pageNumber;
    if (!acc[page]) {
      acc[page] = [];
    }
    acc[page].push(annotation);
    return acc;
  }, {} as Record<number, Annotation[]>);

  return (
    <div className="h-full overflow-y-auto">
      {Object.entries(groupedAnnotations).map(([pageNum, pageAnnotations]) => (
        <div
          key={pageNum}
          className={`mb-4 ${
            parseInt(pageNum) === currentPage ? '' : 'opacity-50'
          }`}
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            {pageNum}페이지
          </h3>
          <div className="space-y-2">
            {pageAnnotations.map((annotation) => (
              <div
                key={annotation.id}
                className="bg-white rounded-lg shadow p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => onSelect(annotation.id)}
                  >
                    <p className="text-sm text-gray-800 line-clamp-2">
                      {annotation.text}
                    </p>
                  </div>
                  <button
                    onClick={() => onDelete(annotation.id)}
                    className="ml-2 text-gray-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <span>
                    {new Date(annotation.createdAt).toLocaleDateString()}
                  </span>
                  {annotation.updatedAt && (
                    <span className="ml-2">
                      (수정됨: {new Date(annotation.updatedAt).toLocaleDateString()})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AnnotationList; 