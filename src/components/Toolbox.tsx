import React from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../types/dnd';
import type { ToolDragItem } from '../types/dnd';
import { 
  PhotoIcon, 
  DocumentTextIcon, 
  RectangleStackIcon,
  CircleStackIcon,
  MinusIcon,
  CursorArrowRaysIcon
} from '@heroicons/react/24/outline';

interface DraggableToolProps {
  type: string;
  toolType: 'image' | 'text' | 'rectangle' | 'circle' | 'line';
  icon: React.ReactNode;
  label: string;
  description?: string;
}

const DraggableTool: React.FC<DraggableToolProps> = ({ 
  type, 
  toolType, 
  icon, 
  label, 
  description 
}) => {
  const [{ isDragging }, drag] = useDrag({
    type,
    item: {
      type,
      toolType,
      defaultProps: {},
    } as ToolDragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag as any}
      className={`
        flex flex-col items-center p-3 rounded-lg border-2 border-dashed cursor-grab
        transition-all duration-200 hover:bg-gray-50 hover:border-gray-400
        ${isDragging 
          ? 'opacity-50 bg-blue-50 border-blue-400 transform scale-95' 
          : 'border-gray-300 hover:shadow-md'
        }
      `}
      title={description || `Drag to add ${label.toLowerCase()}`}
    >
      <div className={`text-2xl mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-600'}`}>
        {icon}
      </div>
      <span className={`text-xs font-medium ${isDragging ? 'text-blue-600' : 'text-gray-700'}`}>
        {label}
      </span>
    </div>
  );
};

interface ToolboxProps {
  className?: string;
}

const Toolbox: React.FC<ToolboxProps> = ({ className }) => {
  const tools = [
    {
      type: ItemTypes.TOOL_TEXT,
      toolType: 'text' as const,
      icon: <DocumentTextIcon className="w-6 h-6" />,
      label: 'Text',
      description: 'Add text element to canvas',
    },
    {
      type: ItemTypes.TOOL_IMAGE,
      toolType: 'image' as const,
      icon: <PhotoIcon className="w-6 h-6" />,
      label: 'Image',
      description: 'Add image placeholder to canvas',
    },
    {
      type: ItemTypes.TOOL_RECTANGLE,
      toolType: 'rectangle' as const,
      icon: <RectangleStackIcon className="w-6 h-6" />,
      label: 'Rectangle',
      description: 'Add rectangle shape to canvas',
    },
    {
      type: ItemTypes.TOOL_CIRCLE,
      toolType: 'circle' as const,
      icon: <CircleStackIcon className="w-6 h-6" />,
      label: 'Circle',
      description: 'Add circle shape to canvas',
    },
    {
      type: ItemTypes.TOOL_LINE,
      toolType: 'line' as const,
      icon: <MinusIcon className="w-6 h-6" />,
      label: 'Line',
      description: 'Add line shape to canvas',
    },
  ];

  return (
    <div className={`bg-white rounded-lg shadow-lg border ${className || ''}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <CursorArrowRaysIcon className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Toolbox</h3>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Drag tools to the canvas to add elements
        </p>
      </div>

      {/* Tools Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {tools.map((tool) => (
            <DraggableTool
              key={tool.type}
              type={tool.type}
              toolType={tool.toolType}
              icon={tool.icon}
              label={tool.label}
              description={tool.description}
            />
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="px-4 pb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-800 mb-1">
            How to use:
          </h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Drag tools to the canvas to create elements</li>
            <li>• Use file drag & drop for images</li>
            <li>• Hold Ctrl while dragging to copy elements</li>
            <li>• Enable grid snap for precise positioning</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Toolbox;