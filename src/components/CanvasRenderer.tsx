import React, { useCallback } from 'react';
import { useCanvas } from '../contexts/CanvasContext';
import DraggableElement, { CustomDragLayer } from './DraggableElement';
import type { CanvasElement } from '../contexts/CanvasContext';

interface CanvasRendererProps {
  className?: string;
  onElementDoubleClick?: (element: CanvasElement) => void;
}

const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  className,
  onElementDoubleClick,
}) => {
  const {
    state,
    selectElement,
    getElementById,
  } = useCanvas();

  // Handle element selection
  const handleElementSelect = useCallback((id: string, addToSelection: boolean) => {
    selectElement(id, addToSelection);
  }, [selectElement]);

  // Sort elements by zIndex for proper rendering order
  const sortedElements = [...state.elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <>
      {/* Render all canvas elements */}
      <div className={`relative w-full h-full ${className || ''}`}>
        {sortedElements.map((element) => {
          const isSelected = state.selectedElementIds.includes(element.id);
          
          return (
            <DraggableElement
              key={element.id}
              element={element}
              isSelected={isSelected}
              onSelect={handleElementSelect}
              onDoubleClick={onElementDoubleClick}
            />
          );
        })}
      </div>

      {/* Custom drag layer for preview */}
      <CustomDragLayer />
    </>
  );
};

export default CanvasRenderer;