import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useDrag, useDragLayer } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { Textarea } from '@headlessui/react';
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

type ResizeDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const DraggableElement: React.FC<DraggableElementProps> = ({
  element,
  isSelected = false,
  onSelect,
  onDoubleClick,
  children,
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLTextAreaElement>(null);
  const { state, resizeElement, updateElement } = useCanvas();
  
  // 计算元素在显示尺度下的缩放比例
  const displayScale = state.displayScale;
  
  // 用于在拖动过程中实时更新元素位置的状态
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // 调整大小状态
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [originalTransform, setOriginalTransform] = useState(element.transform);
  
  // 文本编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState('');
  
  // 当元素内容变化时，同步编辑文本（但不覆盖正在编辑的内容）
  useEffect(() => {
    if (element.type === 'text' && !isEditing) {
      const textElement = element as TextElement;
      setEditingText(textElement.content || 'Text');
    }
  }, [element, isEditing]);

  // Create drag source
  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.CANVAS_ELEMENT,
    canDrag: () => !isEditing && !isResizing, // 编辑时和调整大小时禁止拖拽
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
      // 将屏幕坐标差值转换为画布坐标差值（考虑缩放和显示缩放）
      const canvasDeltaX = differenceFromInitialOffset.x / (state.zoom * displayScale);
      const canvasDeltaY = differenceFromInitialOffset.y / (state.zoom * displayScale);
      
      setDragOffset({ x: canvasDeltaX, y: canvasDeltaY });
    }
  }, [isDragging, dragItem, differenceFromInitialOffset, element.id, state.zoom, displayScale]);

  // Use empty image as drag preview (we'll create custom preview later)
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  // Handle element selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    console.log('📍 元素鼠标按下:', {
      elementId: element.id,
      elementType: element.type,
      isSelected,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey
    });
    
    if (onSelect) {
      onSelect(element.id, e.ctrlKey || e.metaKey);
    }
  }, [element.id, element.type, isSelected, onSelect]);

  // Handle double click
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 如果是文本元素，直接进入编辑模式
    if (element.type === 'text') {
      console.log('📝 双击文本元素，进入编辑模式');
      const textElement = element as TextElement;
      
      // 使用最新的元素内容初始化编辑状态
      const currentContent = textElement.content || 'Text';
      setEditingText(currentContent);
      setIsEditing(true);
      
      console.log('📝 初始化编辑内容:', currentContent);
      
      // 延迟聚焦到编辑器
      setTimeout(() => {
        if (editableRef.current) {
          editableRef.current.focus();
          // 选中所有文本
          editableRef.current.select();
        }
      }, 50);
    } else if (onDoubleClick) {
      // 非文本元素使用原有逻辑
      onDoubleClick(element);
    }
  }, [element, onDoubleClick]);

  // 调整大小相关函数
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: ResizeDirection) => {
    e.stopPropagation();
    e.preventDefault();
    
    // 如果正在编辑文本，先保存当前编辑的内容
    if (isEditing && element.type === 'text') {
      console.log('💾 调整大小前保存文本:', editingText);
      updateElement(element.id, { content: editingText });
    }
    
    console.log('🎯 开始调整大小:', {
      direction,
      elementId: element.id,
      currentTransform: element.transform,
      mousePos: { x: e.clientX, y: e.clientY },
      zoom: state.zoom
    });
    
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStartPos({ x: e.clientX, y: e.clientY });
    setOriginalTransform({ ...element.transform });
    
    const startPos = { x: e.clientX, y: e.clientY };
    const startTransform = { ...element.transform };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!direction) return;
      
      const deltaX = (e.clientX - startPos.x) / (state.zoom * displayScale);
      const deltaY = (e.clientY - startPos.y) / (state.zoom * displayScale);
      
      console.log('📐 调整大小中:', {
        direction,
        deltaX,
        deltaY,
        mousePos: { x: e.clientX, y: e.clientY },
        zoom: state.zoom
      });
      
      let newTransform = { ...startTransform };
      
      // 检查是否是图片元素且锁定了宽高比
      const isImageWithLockedRatio = element.type === 'image' && 
        (element as ImageElement).aspectRatioLocked;
      const aspectRatio = isImageWithLockedRatio ? 
        startTransform.height / startTransform.width : null;
      
      // 根据拖拽方向计算新的大小和位置
      switch (direction) {
        case 'se': // 右下角
          newTransform.width = Math.max(20, startTransform.width + deltaX);
          if (isImageWithLockedRatio && aspectRatio) {
            newTransform.height = newTransform.width * aspectRatio;
          } else {
            newTransform.height = Math.max(20, startTransform.height + deltaY);
          }
          break;
        case 'sw': // 左下角
          newTransform.width = Math.max(20, startTransform.width - deltaX);
          if (isImageWithLockedRatio && aspectRatio) {
            newTransform.height = newTransform.width * aspectRatio;
          } else {
            newTransform.height = Math.max(20, startTransform.height + deltaY);
          }
          newTransform.x = startTransform.x + (startTransform.width - newTransform.width);
          break;
        case 'ne': // 右上角
          newTransform.width = Math.max(20, startTransform.width + deltaX);
          if (isImageWithLockedRatio && aspectRatio) {
            newTransform.height = newTransform.width * aspectRatio;
            newTransform.y = startTransform.y + (startTransform.height - newTransform.height);
          } else {
            newTransform.height = Math.max(20, startTransform.height - deltaY);
            newTransform.y = startTransform.y + (startTransform.height - newTransform.height);
          }
          break;
        case 'nw': // 左上角
          newTransform.width = Math.max(20, startTransform.width - deltaX);
          if (isImageWithLockedRatio && aspectRatio) {
            newTransform.height = newTransform.width * aspectRatio;
            newTransform.x = startTransform.x + (startTransform.width - newTransform.width);
            newTransform.y = startTransform.y + (startTransform.height - newTransform.height);
          } else {
            newTransform.height = Math.max(20, startTransform.height - deltaY);
            newTransform.x = startTransform.x + (startTransform.width - newTransform.width);
            newTransform.y = startTransform.y + (startTransform.height - newTransform.height);
          }
          break;
        case 'e': // 右侧
          newTransform.width = Math.max(20, startTransform.width + deltaX);
          if (isImageWithLockedRatio && aspectRatio) {
            newTransform.height = newTransform.width * aspectRatio;
            newTransform.y = startTransform.y + (startTransform.height - newTransform.height) / 2;
          }
          break;
        case 'w': // 左侧
          newTransform.width = Math.max(20, startTransform.width - deltaX);
          if (isImageWithLockedRatio && aspectRatio) {
            newTransform.height = newTransform.width * aspectRatio;
            newTransform.x = startTransform.x + (startTransform.width - newTransform.width);
            newTransform.y = startTransform.y + (startTransform.height - newTransform.height) / 2;
          } else {
            newTransform.x = startTransform.x + (startTransform.width - newTransform.width);
          }
          break;
        case 's': // 下侧
          if (isImageWithLockedRatio && aspectRatio) {
            newTransform.height = Math.max(20, startTransform.height + deltaY);
            newTransform.width = newTransform.height / aspectRatio;
            newTransform.x = startTransform.x + (startTransform.width - newTransform.width) / 2;
          } else {
            newTransform.height = Math.max(20, startTransform.height + deltaY);
          }
          break;
        case 'n': // 上侧
          if (isImageWithLockedRatio && aspectRatio) {
            newTransform.height = Math.max(20, startTransform.height - deltaY);
            newTransform.width = newTransform.height / aspectRatio;
            newTransform.x = startTransform.x + (startTransform.width - newTransform.width) / 2;
            newTransform.y = startTransform.y + (startTransform.height - newTransform.height);
          } else {
            newTransform.height = Math.max(20, startTransform.height - deltaY);
            newTransform.y = startTransform.y + (startTransform.height - newTransform.height);
          }
          break;
      }
      
      // 对所有尺寸进行取整处理
      newTransform.width = Math.round(newTransform.width);
      newTransform.height = Math.round(newTransform.height);
      newTransform.x = Math.round(newTransform.x);
      newTransform.y = Math.round(newTransform.y);
      
      console.log('📏 新的变换属性:', {
        direction,
        oldTransform: startTransform,
        newTransform,
        changes: {
          width: newTransform.width - startTransform.width,
          height: newTransform.height - startTransform.height,
          x: newTransform.x - startTransform.x,
          y: newTransform.y - startTransform.y
        }
      });
      
      // 实时更新元素大小
      console.log('🔄 调用 resizeElement:', { elementId: element.id, newTransform });
      resizeElement(element.id, newTransform);
    };
    
    const handleMouseUp = () => {
      console.log('✅ 调整大小结束:', {
        direction,
        elementId: element.id,
        finalTransform: element.transform,
        isEditing
      });
      
      setIsResizing(false);
      setResizeDirection(null);
      
      // 如果正在编辑文本，调整大小结束后重新聚焦到编辑器
      if (isEditing && editableRef.current) {
        setTimeout(() => {
          if (editableRef.current) {
            editableRef.current.focus();
            console.log('🎯 调整大小结束后重新聚焦编辑器');
          }
        }, 50);
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [element.id, element.transform, state.zoom, resizeElement, isEditing, element.type, editingText, updateElement]);

  // 文本编辑相关函数 - 先定义基础函数
  const finishEditing = useCallback(() => {
    if (isEditing && element.type === 'text') {
      console.log('✅ 保存文本编辑:', editingText);
      updateElement(element.id, { content: editingText });
      setIsEditing(false);
    }
  }, [isEditing, element.type, element.id, editingText, updateElement]);

  const cancelEditing = useCallback(() => {
    console.log('❌ 取消文本编辑');
    if (element.type === 'text') {
      const textElement = element as TextElement;
      setEditingText(textElement.content || 'Text');
    }
    setIsEditing(false);
  }, [element]);

  const handleTextKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    console.log('⌨️ 按键:', e.key);
    
    if (e.key === 'Enter' && !e.shiftKey) {
      // Enter 键保存并退出编辑
      e.preventDefault();
      finishEditing();
    } else if (e.key === 'Escape') {
      // Escape 键取消编辑
      e.preventDefault();
      cancelEditing();
    }
    
    // 阻止事件冒泡，避免触发其他键盘快捷键
    e.stopPropagation();
  }, [finishEditing, cancelEditing]);

  const handleTextBlur = useCallback(() => {
    console.log('📝 文本失去焦点，保存编辑');
    finishEditing();
  }, [finishEditing]);

  // Render element content based on type
  const renderElementContent = () => {
    switch (element.type) {
      case 'text':
        const textElement = element as TextElement;
        const baseTextStyle = {
          fontSize: `${textElement.fontSize}px`,
          fontFamily: textElement.fontFamily,
          fontWeight: textElement.fontWeight,
          fontStyle: textElement.fontStyle,
          color: textElement.color,
          textAlign: textElement.textAlign,
          lineHeight: textElement.lineHeight,
        };
        
        // 添加文字描边效果
        const textStyle = textElement.textStroke?.enabled ? {
          ...baseTextStyle,
          WebkitTextStroke: `${textElement.textStroke.width}px ${textElement.textStroke.color}`,
          textShadow: `0 0 0 ${textElement.textStroke.color}`, // 备用方案
        } : baseTextStyle;
        
        return (
          <div className="w-full h-full flex items-center relative">
            {isEditing ? (
              // 编辑模式：使用 Headless UI Textarea，禁用拖动
              <Textarea
                ref={editableRef}
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onKeyDown={handleTextKeyDown}
                onBlur={handleTextBlur}
                className="w-full h-full resize-none outline-none bg-white bg-opacity-90 rounded p-2 border-2 border-blue-500"
                style={{
                  ...textStyle,
                  minHeight: '100%',
                  boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
                placeholder="输入文本..."
                autoFocus
              />
            ) : (
              // 显示模式：正常显示文本，可拖动 - 与编辑模式保持一致的对齐方式
              <div
                className="w-full h-full cursor-pointer p-2"
                style={{
                  ...textStyle,
                  whiteSpace: 'pre-wrap', // 保持空格和换行
                  wordBreak: 'break-word', // 允许长单词换行
                  display: 'block', // 使用块级显示，避免flex居中
                }}
                title="双击编辑文本"
              >
                {textElement.content || 'Text'}
              </div>
            )}
          </div>
        );

      case 'image':
        const imageElement = element as ImageElement;
        const borderStyle = imageElement.border ? {
          border: `${imageElement.border.width}px solid ${imageElement.border.color}`,
          borderRadius: `${imageElement.border.radius}px`,
        } : {};
        
        return (
          <img
            src={imageElement.src}
            alt={imageElement.alt || 'Image'}
            className="w-full h-full object-cover"
            style={{ 
              opacity: imageElement.opacity,
              ...borderStyle
            }}
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
    cursor: isEditing ? 'text' : (isDragging ? 'grabbing' : 'grab'), // 编辑时显示文本光标
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
        ${isEditing ? 'cursor-text' : (isDragging ? 'cursor-grabbing' : 'cursor-grab')}
        ${!isEditing ? 'hover:ring-1 hover:ring-gray-400 hover:ring-opacity-50' : ''}
      `}
      data-element-id={element.id}
      data-element-type={element.type}
      data-is-canvas-element="true"
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
          <div 
            className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white cursor-nw-resize hover:bg-blue-600 hover:scale-110 transition-all"
            onMouseDown={(e) => {
              console.log('📍 点击了 NW 调整大小控制点');
              handleResizeStart(e, 'nw');
            }}
          />
          <div 
            className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 border border-white cursor-n-resize hover:bg-blue-600 hover:scale-110 transition-all"
            onMouseDown={(e) => {
              console.log('📍 点击了 N 调整大小控制点');
              handleResizeStart(e, 'n');
            }}
          />
          <div 
            className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white cursor-ne-resize hover:bg-blue-600 hover:scale-110 transition-all"
            onMouseDown={(e) => {
              console.log('📍 点击了 NE 调整大小控制点');
              handleResizeStart(e, 'ne');
            }}
          />
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 -right-1 w-3 h-3 bg-blue-500 border border-white cursor-e-resize hover:bg-blue-600 hover:scale-110 transition-all"
            onMouseDown={(e) => {
              console.log('📍 点击了 E 调整大小控制点');
              handleResizeStart(e, 'e');
            }}
          />
          <div 
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white cursor-se-resize hover:bg-blue-600 hover:scale-110 transition-all"
            onMouseDown={(e) => {
              console.log('📍 点击了 SE 调整大小控制点');
              handleResizeStart(e, 'se');
            }}
          />
          <div 
            className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 border border-white cursor-s-resize hover:bg-blue-600 hover:scale-110 transition-all"
            onMouseDown={(e) => {
              console.log('📍 点击了 S 调整大小控制点');
              handleResizeStart(e, 's');
            }}
          />
          <div 
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white cursor-sw-resize hover:bg-blue-600 hover:scale-110 transition-all"
            onMouseDown={(e) => {
              console.log('📍 点击了 SW 调整大小控制点');
              handleResizeStart(e, 'sw');
            }}
          />
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 -left-1 w-3 h-3 bg-blue-500 border border-white cursor-w-resize hover:bg-blue-600 hover:scale-110 transition-all"
            onMouseDown={(e) => {
              console.log('📍 点击了 W 调整大小控制点');
              handleResizeStart(e, 'w');
            }}
          />
          
          {/* 调整大小状态指示 */}
          {isResizing && (
            <div className="absolute -top-8 left-0 bg-black text-white px-2 py-1 rounded text-xs z-50">
              调整中: {resizeDirection}
            </div>
          )}
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