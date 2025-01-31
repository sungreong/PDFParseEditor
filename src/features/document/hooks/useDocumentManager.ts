import { useState, useCallback } from 'react';
import type { Document } from '@/types';

export const useDocumentManager = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);

  const addDocument = useCallback((document: Document) => {
    setDocuments(prev => [...prev, document]);
  }, []);

  const updateDocument = useCallback((documentId: string, updates: Partial<Document>) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId ? { ...doc, ...updates } : doc
    ));
    
    if (currentDocument?.id === documentId) {
      setCurrentDocument(prev => prev ? { ...prev, ...updates } : prev);
    }
  }, [currentDocument]);

  const deleteDocument = useCallback((documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    if (currentDocument?.id === documentId) {
      setCurrentDocument(null);
    }
  }, [currentDocument]);

  const getDocumentById = useCallback((documentId: string) => {
    return documents.find(doc => doc.id === documentId) || null;
  }, [documents]);

  return {
    documents,
    currentDocument,
    setCurrentDocument,
    addDocument,
    updateDocument,
    deleteDocument,
    getDocumentById,
  };
}; 