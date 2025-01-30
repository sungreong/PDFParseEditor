import React, { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
      >
        <span className="font-medium text-gray-700">{title}</span>
        <span className="text-gray-500">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && (
        <div className="p-4 border-t">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleSection; 