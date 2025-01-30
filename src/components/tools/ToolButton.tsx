import React from 'react';
import { Tool } from '../../types/tools';

interface ToolButtonProps {
  tool: Tool;
}

const ToolButton: React.FC<ToolButtonProps> = ({ tool }) => {
  return (
    <button
      onClick={tool.onClick}
      className={`w-full px-4 py-2 rounded ${
        tool.isActive ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <div className="flex items-center justify-center space-x-2">
        {tool.icon}
        <span>{tool.name}</span>
      </div>
    </button>
  );
};

export default ToolButton; 