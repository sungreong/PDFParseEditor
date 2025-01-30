import React from 'react';
import { Tool, ToolState, ToolActions } from '../../types/tools';
import ToolButton from './ToolButton';

interface ToolManagerProps {
  toolState: ToolState;
  toolActions: ToolActions;
}

const ToolManager: React.FC<ToolManagerProps> = ({ toolState, toolActions }) => {
  const tools: Tool[] = [
    {
      id: 'draw',
      name: '박스 그리기',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm0 2h12v12H4V4z"
            clipRule="evenodd"
          />
        </svg>
      ),
      isActive: toolState.isDrawMode,
      onClick: () => {
        toolActions.onToggleDrawMode();
        if (toolState.isDrawingArrow) {
          toolActions.onToggleArrowDrawing();
        }
      }
    },
    {
      id: 'connect',
      name: '박스 연결하기',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      ),
      isActive: toolState.isDrawingArrow,
      onClick: () => {
        toolActions.onToggleArrowDrawing();
        if (toolState.isDrawMode) {
          toolActions.onToggleDrawMode();
        }
      }
    },
    {
      id: 'multiSelect',
      name: '박스 다중 선택',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M7 2a2 2 0 012 2v12a2 2 0 01-2 2H3a2 2 0 01-2-2V4a2 2 0 012-2h4zm0 1H3a1 1 0 00-1 1v12a1 1 0 001 1h4a1 1 0 001-1V4a1 1 0 00-1-1zm7-1a2 2 0 012 2v12a2 2 0 01-2 2h-4a2 2 0 01-2-2V4a2 2 0 012-2h4zm0 1h-4a1 1 0 00-1 1v12a1 1 0 001 1h4a1 1 0 001-1V4a1 1 0 00-1-1z" />
        </svg>
      ),
      isActive: toolState.isMultiSelectMode,
      onClick: () => {
        toolActions.onToggleMultiSelect();
        if (toolState.isDrawMode) toolActions.onToggleDrawMode();
        if (toolState.isDrawingArrow) toolActions.onToggleArrowDrawing();
      }
    }
  ];

  const getToolDescription = () => {
    if (!toolState.isDrawMode) return '';
    
    if (toolState.isDrawingArrow) {
      return toolState.startBox ? '두 번째 박스를 그리세요' : '첫 번째 박스를 그리세요';
    }
    
    return '마우스로 드래그하여 박스를 그리세요';
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-2">도구</h3>
      <div className="space-y-2">
        {tools.map(tool => (
          <ToolButton key={tool.id} tool={tool} />
        ))}
      </div>
      <div className="text-xs text-gray-500 mt-2">
        {getToolDescription()}
      </div>
    </div>
  );
};

export default ToolManager; 