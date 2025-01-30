import React, { useState } from 'react';
import { Tooltip } from '@/shared/components/Tooltip';

interface ToolButtonProps {
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  tooltip: string;
}

export const ToolButton: React.FC<ToolButtonProps> = ({
  icon,
  isActive,
  onClick,
  tooltip,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`p-2 rounded transition-colors ${
          isActive
            ? 'bg-blue-100 text-blue-600'
            : 'hover:bg-gray-100 text-gray-700'
        }`}
      >
        {icon}
      </button>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-sm rounded whitespace-nowrap">
          {tooltip}
        </div>
      )}
    </div>
  );
};

export default ToolButton; 