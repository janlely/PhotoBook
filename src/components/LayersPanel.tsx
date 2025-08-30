import React, { useCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useCanvas } from '../contexts/CanvasContext';
import { ItemTypes } from '../types/dnd';
import type { LayerDragItem } from '../types/dnd';
import type { CanvasElement } from '../contexts/CanvasContext';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  LockClosedIcon, 
  LockOpenIcon,
  Square3Stack3DIcon,
  PhotoIcon,
  DocumentTextIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';

interface DraggableLayerItemProps {
  element: CanvasElement;
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onVisibilityToggle: (id: string) => void;
  onLockToggle: (id: string) => void;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
}

const DraggableLayerItem: React.FC<DraggableLayerItemProps> = ({
  element,
  index,
  isSelected,
  onSelect,
  onVisibilityToggle,
  onLockToggle,
  onReorder,
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.LAYER,
    item: (): LayerDragItem => ({
      type: ItemTypes.LAYER,
      layerId: `layer-${element.id}`,
      elementId: element.id,
      index,
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.LAYER,
    hover: (item: LayerDragItem) => {
      if (item.index !== index) {
        onReorder(item.index, index);
        item.index = index;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const getElementIcon = () => {
    switch (element.type) {
      case 'image':
        return <PhotoIcon className="w-4 h-4" />;
      case 'text':
        return <DocumentTextIcon className="w-4 h-4" />;
      case 'shape':
        return <Squares2X2Icon className="w-4 h-4" />;
      default:
        return <Square3Stack3DIcon className="w-4 h-4" />;
    }
  };

  const getElementLabel = () => {
    switch (element.type) {
      case 'text':
        const textElement = element as any;
        return textElement.content || 'Text Element';
      case 'image':
        const imageElement = element as any;
        return imageElement.alt || 'Image Element';
      case 'shape':
        const shapeElement = element as any;
        return `${shapeElement.shapeType} Shape`;
      default:
        return 'Element';
    }
  };

  return (
    <div
      ref={(node) => {
        if (node) {
          drag(drop(node));
        }
      }}
      className={`
        flex items-center p-2 border rounded-md cursor-pointer transition-all
        ${isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}
        ${isDragging ? 'opacity-50' : ''}
        ${isOver ? 'bg-gray-50' : ''}
        hover:bg-gray-50
      `}
      onClick={() => onSelect(element.id)}
    >
      {/* Drag handle */}
      <div className="mr-2 text-gray-400 cursor-grab active:cursor-grabbing">
        <Square3Stack3DIcon className="w-4 h-4" />
      </div>

      {/* Element icon */}
      <div className="mr-2 text-gray-600">
        {getElementIcon()}
      </div>

      {/* Element info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {getElementLabel()}
        </div>
        <div className="text-xs text-gray-500">
          Layer {element.zIndex}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-1">
        {/* Visibility toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onVisibilityToggle(element.id);
          }}
          className={`p-1 rounded ${
            element.visible 
              ? 'text-gray-600 hover:text-gray-800' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
          title={element.visible ? 'Hide layer' : 'Show layer'}
        >
          {element.visible ? (
            <EyeIcon className="w-4 h-4" />
          ) : (
            <EyeSlashIcon className="w-4 h-4" />
          )}
        </button>

        {/* Lock toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLockToggle(element.id);
          }}
          className={`p-1 rounded ${
            element.locked 
              ? 'text-red-600 hover:text-red-800' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
          title={element.locked ? 'Unlock layer' : 'Lock layer'}
        >
          {element.locked ? (
            <LockClosedIcon className="w-4 h-4" />
          ) : (
            <LockOpenIcon className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

interface LayersPanelProps {
  className?: string;
}

const LayersPanel: React.FC<LayersPanelProps> = ({ className }) => {
  const {
    state,
    selectElement,
    updateElement,
    moveElementToFront,
    moveElementToBack,
  } = useCanvas();

  // Sort elements by zIndex (highest first for layer panel)
  const sortedElements = [...state.elements].sort((a, b) => b.zIndex - a.zIndex);

  const handleElementSelect = useCallback((id: string) => {
    selectElement(id);
  }, [selectElement]);

  const handleVisibilityToggle = useCallback((id: string) => {
    const element = state.elements.find(el => el.id === id);
    if (element) {
      updateElement(id, { visible: !element.visible });
    }
  }, [state.elements, updateElement]);

  const handleLockToggle = useCallback((id: string) => {
    const element = state.elements.find(el => el.id === id);
    if (element) {
      updateElement(id, { locked: !element.locked });
    }
  }, [state.elements, updateElement]);

  const handleReorder = useCallback((dragIndex: number, hoverIndex: number) => {
    // Reorder elements by updating their zIndex
    const dragElement = sortedElements[dragIndex];
    const hoverElement = sortedElements[hoverIndex];
    
    if (dragElement && hoverElement) {
      // Swap zIndex values
      updateElement(dragElement.id, { zIndex: hoverElement.zIndex });
      updateElement(hoverElement.id, { zIndex: dragElement.zIndex });
    }
  }, [sortedElements, updateElement]);

  return (
    <div className={`bg-white rounded-lg shadow border ${className || ''}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Square3Stack3DIcon className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Layers</h3>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Drag to reorder • Click to select
        </p>
      </div>

      {/* Layers list */}
      <div className="p-3">
        {sortedElements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Square3Stack3DIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No layers yet</p>
            <p className="text-xs mt-1">Add elements to see layers</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedElements.map((element, index) => (
              <DraggableLayerItem
                key={element.id}
                element={element}
                index={index}
                isSelected={state.selectedElementIds.includes(element.id)}
                onSelect={handleElementSelect}
                onVisibilityToggle={handleVisibilityToggle}
                onLockToggle={handleLockToggle}
                onReorder={handleReorder}
              />
            ))}
          </div>
        )}
      </div>

      {/* Layer controls */}
      {sortedElements.length > 0 && (
        <div className="p-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Layer Actions:</div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                const selectedElement = state.selectedElementIds[0];
                if (selectedElement) {
                  moveElementToFront(selectedElement);
                }
              }}
              disabled={state.selectedElementIds.length !== 1}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              To Front
            </button>
            <button
              onClick={() => {
                const selectedElement = state.selectedElementIds[0];
                if (selectedElement) {
                  moveElementToBack(selectedElement);
                }
              }}
              disabled={state.selectedElementIds.length !== 1}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              To Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayersPanel;