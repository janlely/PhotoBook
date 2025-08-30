import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useDrag, useDragLayer } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useCanvas } from '../contexts/CanvasContext';
import { ItemTypes } from '../types/dnd';
import type { CanvasElement, TextElement, ImageElement, ShapeElement } from '../contexts/CanvasContext';
import type { CanvasElementDragItem } from '../types/dnd';

interface DraggableElementProps {
  element: CanvasElement;
  isSelected?: boolean;
  onSelect?: (id: string, addToSelection: boolean) => void;
  onDoubleClick?: (element: CanvasElement) => void;
  children?: React.ReactNode;
}

const DraggableElement: React.FC<DraggableElementProps> = ({
  element,
  isSelected = false,
  onSelect,
  onDoubleClick,
  children,
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const { state } = useCanvas();
  
  // 用于在拖动过程中实时更新元素位置的状态
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Create drag source
  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.CANVAS_ELEMENT,
    item: (): CanvasElementDragItem => {
      // Detect if Ctrl/Cmd key is pressed for copy operation
      const isCtrlPressed = window.event && (window.event as any).ctrlKey || (window.event as any).metaKey;
      
      // 重置拖动偏移量
      setDragOffset({ x: 0, y: 0 });
      
      return {
        type: ItemTypes.CANVAS_ELEMENT,
        id: element.id,
        elementType: element.type,
        element: element,
        isCopyOperation: isCtrlPressed,
        // 记录拖动开始时的元素位置
        originalPosition: {
          x: element.transform.x,
          y: element.transform.y
        }
      };
    },
    end: () => {
      // 拖动结束后重置偏移量
      setDragOffset({ x: 0, y: 0 });
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  // 使用 useDragLayer 来监听拖动过程中的位置变化
  const { dragItem, differenceFromInitialOffset } = useDragLayer((monitor) => ({
    dragItem: monitor.getItem(),
    differenceFromInitialOffset: monitor.getDifferenceFromInitialOffset(),
  }));
  
  // 当拖动过程中位置发生变化时，更新本地偏移量
  useEffect(() => {
    if (isDragging && dragItem?.id === element.id && differenceFromInitialOffset) {
      // 将屏幕坐标差值转换为画布坐标差值（考虑缩放）
      const canvasDeltaX = differenceFromInitialOffset.x / state.zoom;
      const canvasDeltaY = differenceFromInitialOffset.y / state.zoom;
      
      setDragOffset({ x: canvasDeltaX, y: canvasDeltaY });
    }
  }, [isDragging, dragItem, differenceFromInitialOffset, element.id, state.zoom]);

  // Use empty image as drag preview (we'll create custom preview later)
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  // Handle element selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(element.id, e.ctrlKey || e.metaKey);
    }
  }, [element.id, onSelect]);

  // Handle double click
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDoubleClick) {
      onDoubleClick(element);
    }
  }, [element, onDoubleClick]);

  // Render element content based on type
  const renderElementContent = () => {
    switch (element.type) {
      case 'text':
        const textElement = element as TextElement;
        return (
          <div
            className="w-full h-full flex items-center"
            style={{
              fontSize: `${textElement.fontSize}px`,
              fontFamily: textElement.fontFamily,
              fontWeight: textElement.fontWeight,
              fontStyle: textElement.fontStyle,
              color: textElement.color,
              textAlign: textElement.textAlign,
              lineHeight: textElement.lineHeight,
            }}
          >
            {textElement.content || 'Text'}
          </div>
        );

      case 'image':
        const imageElement = element as ImageElement;
        return (
          <img
            src={imageElement.src}
            alt={imageElement.alt || 'Image'}
            className="w-full h-full object-cover"
            style={{ opacity: imageElement.opacity }}
            draggable={false}
          />
        );

      case 'shape':
        const shapeElement = element as ShapeElement;
        if (shapeElement.shapeType === 'rectangle') {
          return (
            <div
              className="w-full h-full"
              style={{
                backgroundColor: shapeElement.fill,
                border: `${shapeElement.strokeWidth}px solid ${shapeElement.stroke}`,
                opacity: shapeElement.opacity,
              }}
            />
          );
        } else if (shapeElement.shapeType === 'circle') {
          return (
            <div
              className="w-full h-full rounded-full"
              style={{
                backgroundColor: shapeElement.fill,
                border: `${shapeElement.strokeWidth}px solid ${shapeElement.stroke}`,
                opacity: shapeElement.opacity,
              }}
            />
          );
        } else if (shapeElement.shapeType === 'line') {
          return (
            <div
              className="w-full"
              style={{
                height: `${shapeElement.strokeWidth}px`,
                backgroundColor: shapeElement.stroke,
                opacity: shapeElement.opacity,
                transform: 'translateY(50%)',
              }}
            />
          );
        }
        return null;

      default:
        return <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">Unknown Element</div>;
    }
  };

  // Apply transforms
  const transform = element.transform;
  
  // 在拖动过程中应用实时偏移量
  const currentX = isDragging ? transform.x + dragOffset.x : transform.x;
  const currentY = isDragging ? transform.y + dragOffset.y : transform.y;
  
  const style: React.CSSProperties = {
    position: 'absolute',
    left: currentX,
    top: currentY,
    width: transform.width,
    height: transform.height,
    transform: `rotate(${transform.rotation}deg) scale(${transform.scaleX}, ${transform.scaleY})`,
    transformOrigin: 'center center',
    zIndex: element.zIndex,
    // 拖动时保持元素可见，只是稍微透明，这样用户可以看到元素的实际位置
    opacity: isDragging ? 0.8 : (element.visible ? 1 : 0.3),
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
  };

  return (
    <div
      ref={(node) => {
        elementRef.current = node;
        drag(node);
      }}
      style={style}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className={`
        ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-75' : ''}
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
        hover:ring-1 hover:ring-gray-400 hover:ring-opacity-50
      `}
      data-element-id={element.id}
      data-element-type={element.type}
    >
      {/* Element content */}
      <div className="w-full h-full overflow-hidden">
        {children || renderElementContent()}
      </div>

      {/* Selection indicators */}
      {isSelected && !isDragging && (
        <>
          {/* Selection border */}
          <div className="absolute inset-0 border-2 border-blue-500 border-dashed pointer-events-none" />
          
          {/* Resize handles */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-nw-resize" />
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 border border-white cursor-n-resize" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-ne-resize" />
          <div className="absolute top-1/2 transform -translate-y-1/2 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-e-resize" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-se-resize" />
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 border border-white cursor-s-resize" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-sw-resize" />
          <div className="absolute top-1/2 transform -translate-y-1/2 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-w-resize" />
        </>
      )}
    </div>
  );
};

// 禁用自定义拖动预览层 - 直接使用原始元素进行拖动
// Custom drag layer for showing drag preview
export const CustomDragLayer: React.FC = () => {
  // 完全禁用自定义拖动预览
  return null;
};

export default DraggableElement;