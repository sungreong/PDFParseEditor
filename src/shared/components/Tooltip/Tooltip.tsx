import React from 'react';

interface TooltipProps {
  content: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  children,
}) => {
  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };

  return (
    <div className="relative group">
      {children}
      <div
        className={`absolute hidden group-hover:block px-2 py-1 bg-gray-800 text-white text-sm rounded whitespace-nowrap z-50 ${getPositionClasses()}`}
      >
        {content}
        <div
          className={`absolute w-2 h-2 bg-gray-800 transform rotate-45 ${
            position === 'top'
              ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2'
              : position === 'right'
              ? 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2'
              : position === 'bottom'
              ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2'
              : 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2'
          }`}
        />
      </div>
    </div>
  );
};

export default Tooltip; 