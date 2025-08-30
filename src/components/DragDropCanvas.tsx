import React, { useRef, useEffect, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { useCanvas } from '../contexts/CanvasContext';
import { uploadImage } from '../api/upload';
import { ItemTypes } from '../types/dnd';
import type { DragItem, DropResult, CanvasElementDragItem, ToolDragItem, FileDragItem } from '../types/dnd';
import type { Point, CanvasElement } from '../contexts/CanvasContext';
import CanvasRenderer from './CanvasRenderer';

interface DragDropCanvasProps {
  className?: string;
  children?: React.ReactNode;
  onElementDoubleClick?: (element: CanvasElement) => void;
}

const DragDropCanvas: React.FC<DragDropCanvasProps> = ({ 
  className, 
  children,
  onElementDoubleClick 
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const {
    state,
    addElement,
    moveElement,
    moveMultipleElements,
    clearSelection,
    setActiveTool,
  } = useCanvas();

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number): Point => {
    const container = canvasRef.current;
    if (!container) return { x: 0, y: 0 };

    const rect = container.getBoundingClientRect();
    const x = (screenX - rect.left - state.panOffset.x) / state.zoom;
    const y = (screenY - rect.top - state.panOffset.y) / state.zoom;
    
    return { x, y };
  }, [state.zoom, state.panOffset]);

  // Convert canvas coordinates to screen coordinates
  const canvasToScreen = useCallback((canvasX: number, canvasY: number): Point => {
    const x = canvasX * state.zoom + state.panOffset.x;
    const y = canvasY * state.zoom + state.panOffset.y;
    return { x, y };
  }, [state.zoom, state.panOffset]);

  // Handle tool drop (creating new elements)
  const handleToolDrop = useCallback((item: ToolDragItem, clientOffset: Point) => {
    const canvasPosition = screenToCanvas(clientOffset.x, clientOffset.y);
    
    // Snap to grid if enabled
    let finalPosition = canvasPosition;
    if (state.isSnapToGrid) {
      finalPosition = {
        x: Math.round(canvasPosition.x / state.gridSize) * state.gridSize,
        y: Math.round(canvasPosition.y / state.gridSize) * state.gridSize,
      };
    }

    // Create element based on tool type
    let newElement: any; // Will be properly typed as specific element type
    
    switch (item.toolType) {
      case 'text':
        newElement = {
          type: 'text',
          transform: {
            x: finalPosition.x,
            y: finalPosition.y,
            width: 150,
            height: 30,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
          visible: true,
          locked: false,
          zIndex: state.elements.length,
          content: 'New Text',
          fontSize: 16,
          fontFamily: 'Arial',
          fontWeight: 'normal' as const,
          fontStyle: 'normal' as const,
          color: '#000000',
          textAlign: 'left' as const,
          lineHeight: 1.2,
        };
        break;
        
      case 'image':
        newElement = {
          type: 'image',
          transform: {
            x: finalPosition.x,
            y: finalPosition.y,
            width: 200,
            height: 150,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
          visible: true,
          locked: false,
          zIndex: state.elements.length,
          src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNGNEY0RjQiLz48dGV4dCB4PSIxMDAiIHk9Ijc1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9InN5c3RlbS11aSIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSI+SW1hZ2UgUGxhY2Vob2xkZXI8L3RleHQ+PC9zdmc+',
          alt: 'New Image',
          opacity: 1,
        };
        break;
        
      case 'rectangle':
        newElement = {
          type: 'shape',
          transform: {
            x: finalPosition.x,
            y: finalPosition.y,
            width: 100,
            height: 60,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
          visible: true,
          locked: false,
          zIndex: state.elements.length,
          shapeType: 'rectangle' as const,
          fill: '#007acc',
          stroke: '#005a99',
          strokeWidth: 2,
          opacity: 1,
        };
        break;
        
      case 'circle':
        newElement = {
          type: 'shape',
          transform: {
            x: finalPosition.x,
            y: finalPosition.y,
            width: 80,
            height: 80,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
          visible: true,
          locked: false,
          zIndex: state.elements.length,
          shapeType: 'circle' as const,
          fill: '#28a745',
          stroke: '#1e7e34',
          strokeWidth: 2,
          opacity: 1,
        };
        break;
        
      case 'line':
        newElement = {
          type: 'shape',
          transform: {
            x: finalPosition.x,
            y: finalPosition.y,
            width: 100,
            height: 2,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
          visible: true,
          locked: false,
          zIndex: state.elements.length,
          shapeType: 'line' as const,
          fill: 'transparent',
          stroke: '#dc3545',
          strokeWidth: 2,
          opacity: 1,
        };
        break;
        
      default:
        console.warn('Unknown tool type:', item.toolType);
        return;
    }

    const elementId = addElement(newElement);
    console.log(`Created new ${item.toolType} element:`, elementId);
  }, [screenToCanvas, state.isSnapToGrid, state.gridSize, state.elements.length, addElement]);

  // Handle canvas element drop (moving existing elements)
  const handleElementDrop = useCallback((item: CanvasElementDragItem, monitor: any) => {
    const differenceFromInitialOffset = monitor.getDifferenceFromInitialOffset();
    
    if (!differenceFromInitialOffset) return;

    // 计算元素在屏幕上的移动距离
    const screenDeltaX = differenceFromInitialOffset.x;
    const screenDeltaY = differenceFromInitialOffset.y;
    
    // 转换为画布坐标系下的移动距离（考虑缩放）
    const canvasDeltaX = screenDeltaX / state.zoom;
    const canvasDeltaY = screenDeltaY / state.zoom;
    
    console.log('Element drag offset:', { 
      screen: { x: screenDeltaX, y: screenDeltaY }, 
      canvas: { x: canvasDeltaX, y: canvasDeltaY },
      zoom: state.zoom 
    });
    
    // Check if this is a copy operation (Ctrl+drag)
    if (item.isCopyOperation) {
      // Create a copy of the element at the new position
      const element = item.element;
      if (!element) return;

      const finalX = element.transform.x + canvasDeltaX;
      const finalY = element.transform.y + canvasDeltaY;
      
      let finalPosition = { x: finalX, y: finalY };
      
      // Snap to grid if enabled
      if (state.isSnapToGrid) {
        finalPosition = {
          x: Math.round(finalX / state.gridSize) * state.gridSize,
          y: Math.round(finalY / state.gridSize) * state.gridSize,
        };
      }

      // Create a copy with the new position
      const newElement: any = {
        ...element,
        transform: {
          ...element.transform,
          x: finalPosition.x,
          y: finalPosition.y,
        },
        zIndex: state.elements.length,
      };

      const newElementId = addElement(newElement);
      console.log(`Copied element ${item.id} to new element ${newElementId} at position:`, finalPosition);
      return;
    }
    
    // Regular move operation
    const element = state.elements.find(el => el.id === item.id);
    if (!element) return;

    let deltaX = canvasDeltaX;
    let deltaY = canvasDeltaY;

    // Snap to grid if enabled
    if (state.isSnapToGrid) {
      const snappedX = Math.round((element.transform.x + deltaX) / state.gridSize) * state.gridSize;
      const snappedY = Math.round((element.transform.y + deltaY) / state.gridSize) * state.gridSize;
      deltaX = snappedX - element.transform.x;
      deltaY = snappedY - element.transform.y;
    }

    // Check if dragged element is part of selection
    const isSelectedElement = state.selectedElementIds.includes(item.id);
    
    if (isSelectedElement && state.selectedElementIds.length > 1) {
      // Move all selected elements
      moveMultipleElements(state.selectedElementIds, { x: deltaX, y: deltaY });
      console.log(`Moved ${state.selectedElementIds.length} selected elements by delta:`, { x: deltaX, y: deltaY });
    } else {
      // Move single element
      moveElement(item.id, { x: deltaX, y: deltaY });
      console.log(`Moved element ${item.id} by delta:`, { x: deltaX, y: deltaY });
    }
  }, [state.elements, state.selectedElementIds, state.isSnapToGrid, state.gridSize, state.zoom, moveElement, moveMultipleElements, addElement]);

  // Handle file drop (image upload)
  const handleFileDrop = useCallback((item: FileDragItem, clientOffset: Point) => {
    const canvasPosition = screenToCanvas(clientOffset.x, clientOffset.y);
    
    // Process uploaded files
    item.files.forEach(async (file, index) => {
      if (file.type.startsWith('image/')) {
        try {
          // 使用后台 API 上传图片
          const result = await uploadImage(file);
          console.log('图片上传成功:', result);
          
          let finalPosition = {
            x: canvasPosition.x + (index * 20), // Offset multiple files
            y: canvasPosition.y + (index * 20),
          };

          // Snap to grid if enabled
          if (state.isSnapToGrid) {
            finalPosition = {
              x: Math.round(finalPosition.x / state.gridSize) * state.gridSize,
              y: Math.round(finalPosition.y / state.gridSize) * state.gridSize,
            };
          }

          const newImageElement: any = {
            type: 'image',
            transform: {
              x: finalPosition.x,
              y: finalPosition.y,
              width: 200,
              height: 150,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
            },
            visible: true,
            locked: false,
            zIndex: state.elements.length + index,
            src: result.image.url, // 使用短链接URL
            alt: result.image.originalName,
            opacity: 1,
          };

          const elementId = addElement(newImageElement);
          console.log(`Created image element from file ${file.name}:`, elementId);
          
        } catch (error) {
          console.error('图片上传失败:', error);
          // 如果上传失败，使用 base64 作为备用方案
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            if (result) {
              let finalPosition = {
                x: canvasPosition.x + (index * 20),
                y: canvasPosition.y + (index * 20),
              };

              if (state.isSnapToGrid) {
                finalPosition = {
                  x: Math.round(finalPosition.x / state.gridSize) * state.gridSize,
                  y: Math.round(finalPosition.y / state.gridSize) * state.gridSize,
                };
              }

              const newImageElement: any = {
                type: 'image',
                transform: {
                  x: finalPosition.x,
                  y: finalPosition.y,
                  width: 200,
                  height: 150,
                  rotation: 0,
                  scaleX: 1,
                  scaleY: 1,
                },
                visible: true,
                locked: false,
                zIndex: state.elements.length + index,
                src: result, // 备用的 base64
                alt: file.name,
                opacity: 1,
              };

              const elementId = addElement(newImageElement);
              console.log(`Fallback: Created image element from file ${file.name}:`, elementId);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    });
  }, [screenToCanvas, state.isSnapToGrid, state.gridSize, state.elements.length, addElement]);

  // React DnD Drop configuration
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [
      ItemTypes.TOOL_TEXT,
      ItemTypes.TOOL_IMAGE,
      ItemTypes.TOOL_RECTANGLE,
      ItemTypes.TOOL_CIRCLE,
      ItemTypes.TOOL_LINE,
      ItemTypes.CANVAS_ELEMENT,
      ItemTypes.FILE,
    ],
    drop: (item: DragItem, monitor) => {
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      console.log('Drop detected:', { type: item.type, clientOffset });

      switch (item.type) {
        case ItemTypes.TOOL_TEXT:
        case ItemTypes.TOOL_IMAGE:
        case ItemTypes.TOOL_RECTANGLE:
        case ItemTypes.TOOL_CIRCLE:
        case ItemTypes.TOOL_LINE:
          handleToolDrop(item as ToolDragItem, clientOffset);
          break;
          
        case ItemTypes.CANVAS_ELEMENT:
          handleElementDrop(item as CanvasElementDragItem, monitor);
          break;
          
        case ItemTypes.FILE:
          handleFileDrop(item as FileDragItem, clientOffset);
          break;
          
        default:
          console.warn('Unknown drag item type:', item.type);
      }

      return { 
        position: screenToCanvas(clientOffset.x, clientOffset.y),
        dropEffect: 'move'
      } as DropResult;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
      dragItem: monitor.getItem(),
    }),
  });

  // Handle click events
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    console.log('📍 DragDropCanvas 点击事件:', {
      target: e.target,
      currentTarget: e.currentTarget,
      canvasRef: canvasRef.current,
      targetClassName: (e.target as HTMLElement).className,
      targetTagName: (e.target as HTMLElement).tagName
    });
    
    // 检查是否点击的是画布元素或其子元素
    const target = e.target as HTMLElement;
    const isElementOrChild = target.closest('[data-is-canvas-element="true"]') !== null ||
                           target.dataset.isCanvasElement === 'true' ||
                           target.dataset.elementId !== undefined;
    
    // 如果没有点击到画布元素，则清除选择
    if (!isElementOrChild) {
      console.log('🎨 点击了画布空白区域，清除所有选择');
      clearSelection();
      setActiveTool('select');
    } else {
      console.log('🎯 点击了画布元素，保持选择状态');
    }
  }, [clearSelection, setActiveTool]);

  // Attach drop ref to the canvas container
  useEffect(() => {
    if (canvasRef.current) {
      drop(canvasRef.current);
    }
  }, [drop]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 按 Escape 键清除选择
      if (e.key === 'Escape') {
        console.log('⌨️ 按了 Escape 键，清除所有选择');
        clearSelection();
        setActiveTool('select');
        e.preventDefault();
      }
    };

    // 添加全局键盘事件监听
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [clearSelection, setActiveTool]);

  return (
    <div
      ref={canvasRef}
      className={`relative bg-white ${
        isOver && canDrop 
          ? 'bg-blue-50' 
          : ''
      } ${className || ''} focus:outline-none`}
      style={{
        width: state.canvasSize.width * state.zoom,
        height: state.canvasSize.height * state.zoom,
        transform: `translate(${state.panOffset.x}px, ${state.panOffset.y}px)`,
        transformOrigin: '0 0',
        cursor: state.activeTool === 'select' ? 'default' : 'crosshair',
      }}
      tabIndex={0}
      onClick={handleClick}
      onMouseDown={(e) => {
        console.log('📍 画布鼠标按下:', {
          target: e.target,
          currentTarget: e.currentTarget,
          tagName: (e.target as HTMLElement).tagName,
          className: (e.target as HTMLElement).className
        });
        // 点击后立即获取焦点，这样键盘事件能正常工作
        if (canvasRef.current) {
          canvasRef.current.focus();
        }
      }}
    >
      {/* Canvas grid overlay */}
      {state.isGridVisible && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, #ddd 1px, transparent 1px),
              linear-gradient(to bottom, #ddd 1px, transparent 1px)
            `,
            backgroundSize: `${state.gridSize * state.zoom}px ${state.gridSize * state.zoom}px`,
          }}
        />
      )}

      {/* Canvas content */}
      <div className="relative w-full h-full">
        <CanvasRenderer onElementDoubleClick={onElementDoubleClick} />
        {children}
      </div>
    </div>
  );
};

export default DragDropCanvas;