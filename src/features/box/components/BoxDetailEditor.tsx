import React, { useState, useEffect, useCallback } from 'react';
import type { Box } from '@/types';
import ReactMarkdown from 'react-markdown';
import { PDFDocumentProxy } from 'pdfjs-dist';
import { API_ENDPOINTS } from '@/features/pdf/config/api';
import DraggablePopup from '@/components/common/DraggablePopup';

interface BoxDetailEditorProps {
  box: Box;
  originalBox?: Box | null;
  onUpdate: (boxId: string, updates: Partial<Box>) => void;
  onCancel?: () => void;
  pageNumber: number;
  documentName: string;
  viewerWidth: number;
  viewerHeight: number;
  layers: { id: string; name: string; color: string }[];
  isOpen: boolean;
}

// ... 나머지 코드는 동일하게 유지 ... 