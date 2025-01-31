import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Box } from '@/types';
import type { Connection, ConnectionContextType } from '../types';

const ConnectionContext = createContext<ConnectionContextType | null>(null);

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);

  const addConnection = useCallback((startBox: Box, endBox: Box) => {
    const newConnection: Connection = {
      id: `connection_${Date.now()}`,
      startBox,
      endBox,
      layerId: startBox.layerId
    };
    setConnections(prev => [...prev, newConnection]);
  }, []);

  const updateConnection = useCallback((id: string, updates: Partial<Connection>) => {
    setConnections(prev => 
      prev.map(conn => conn.id === id ? { ...conn, ...updates } : conn)
    );
  }, []);

  const deleteConnection = useCallback((id: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== id));
  }, []);

  const getConnectionsByPage = useCallback((pageNumber: number) => {
    return connections.filter(conn => conn.startBox.pageNumber === pageNumber);
  }, [connections]);

  const value = {
    connections,
    selectedConnection,
    addConnection,
    updateConnection,
    deleteConnection,
    setSelectedConnection,
    getConnectionsByPage,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
}; 