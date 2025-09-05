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

  // Generate background style based on background type
  const getBackgroundStyle = () => {
    const { background } = state;
    
    switch (background.type) {
      case 'solid':
        return {
          backgroundColor: background.color,
          zIndex: -1
        };
      
      case 'gradient':
        const gradientStops = background.stops
          .map(stop => `${stop.color} ${stop.position}%`)
          .join(', ');

        const gradient = background.gradientType === 'linear'
          ? `linear-gradient(${background.direction}, ${gradientStops})`
          : `radial-gradient(circle, ${gradientStops})`;

        return {
          background: gradient,
          zIndex: -1
        };
      
      case 'image':
        return {
          backgroundImage: `url(${background.url})`,
          backgroundSize: background.size || 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: -1
        };
      
      default:
        return {
          backgroundColor: '#ffffff',
          zIndex: -1
        };
    }
  };

  return (
    <>
      {/* Background layer */}
      <div 
        className="absolute inset-0"
        style={getBackgroundStyle()}
      />
      
      {/* Elements layer */}
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
