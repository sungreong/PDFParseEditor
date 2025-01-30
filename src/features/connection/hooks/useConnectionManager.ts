import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Connection, ConnectionState, ConnectionDrawingState } from '../types';

export const useConnectionManager = () => {
  const [state, setState] = useState<ConnectionState>({
    connections: [],
    selectedConnectionId: null,
    editingConnectionId: null,
  });

  const [drawingState, setDrawingState] = useState<ConnectionDrawingState>({
    isDrawing: false,
    startBoxId: null,
    endBoxId: null,
    type: 'arrow',
  });

  const startDrawing = useCallback((boxId: string, type: 'arrow' | 'line') => {
    setDrawingState({
      isDrawing: true,
      startBoxId: boxId,
      endBoxId: null,
      type,
    });
  }, []);

  const finishDrawing = useCallback((endBoxId: string) => {
    if (!drawingState.startBoxId || !drawingState.isDrawing) return;

    const newConnection: Connection = {
      id: uuidv4(),
      startBoxId: drawingState.startBoxId,
      endBoxId,
      type: drawingState.type,
    };

    setState(prev => ({
      ...prev,
      connections: [...prev.connections, newConnection],
    }));

    setDrawingState({
      isDrawing: false,
      startBoxId: null,
      endBoxId: null,
      type: 'arrow',
    });
  }, [drawingState]);

  const cancelDrawing = useCallback(() => {
    setDrawingState({
      isDrawing: false,
      startBoxId: null,
      endBoxId: null,
      type: 'arrow',
    });
  }, []);

  const selectConnection = useCallback((connectionId: string | null) => {
    setState(prev => ({
      ...prev,
      selectedConnectionId: connectionId,
    }));
  }, []);

  const editConnection = useCallback((connectionId: string | null) => {
    setState(prev => ({
      ...prev,
      editingConnectionId: connectionId,
    }));
  }, []);

  const updateConnection = useCallback((
    connectionId: string,
    updates: Partial<Connection>
  ) => {
    setState(prev => ({
      ...prev,
      connections: prev.connections.map(conn =>
        conn.id === connectionId ? { ...conn, ...updates } : conn
      ),
    }));
  }, []);

  const deleteConnection = useCallback((connectionId: string) => {
    setState(prev => ({
      ...prev,
      connections: prev.connections.filter(conn => conn.id !== connectionId),
      selectedConnectionId: prev.selectedConnectionId === connectionId ? null : prev.selectedConnectionId,
      editingConnectionId: prev.editingConnectionId === connectionId ? null : prev.editingConnectionId,
    }));
  }, []);

  const getConnectionsByBox = useCallback((boxId: string) => {
    return state.connections.filter(
      conn => conn.startBoxId === boxId || conn.endBoxId === boxId
    );
  }, [state.connections]);

  return {
    connections: state.connections,
    selectedConnectionId: state.selectedConnectionId,
    editingConnectionId: state.editingConnectionId,
    drawingState,
    startDrawing,
    finishDrawing,
    cancelDrawing,
    selectConnection,
    editConnection,
    updateConnection,
    deleteConnection,
    getConnectionsByBox,
  };
}; 