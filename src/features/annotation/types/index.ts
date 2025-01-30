export interface Annotation {
  id: string;
  text: string;
  pageNumber: number;
  position: {
    x: number;
    y: number;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface AnnotationState {
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  editingAnnotationId: string | null;
}

export interface AnnotationPopupProps {
  annotation: Annotation;
  onSave: (text: string) => void;
  onDelete: () => void;
  onClose: () => void;
  position: {
    x: number;
    y: number;
  };
}

export interface AnnotationListProps {
  annotations: Annotation[];
  onSelect: (annotationId: string) => void;
  onDelete: (annotationId: string) => void;
  currentPage: number;
}

export interface AnnotationDrawingState {
  isDrawing: boolean;
  startPoint: {
    x: number;
    y: number;
  } | null;
} 