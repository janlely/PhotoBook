// Drag and Drop Types for React DnD
export const ItemTypes = {
  CANVAS_ELEMENT: 'canvas_element',
  TOOL_IMAGE: 'tool_image',
  TOOL_TEXT: 'tool_text',
  TOOL_SHAPE: 'tool_shape',
  TOOL_RECTANGLE: 'tool_rectangle',
  TOOL_CIRCLE: 'tool_circle',
  TOOL_LINE: 'tool_line',
  FILE: 'file',
  LAYER: 'layer',
} as const;

export type ItemType = typeof ItemTypes[keyof typeof ItemTypes];

// Drag Item Interfaces
export interface CanvasElementDragItem {
  type: typeof ItemTypes.CANVAS_ELEMENT;
  id: string;
  elementType: 'image' | 'text' | 'shape';
  element: any; // Will be properly typed with CanvasElement later
  isCopyOperation?: boolean;
  originalPosition?: {
    x: number;
    y: number;
  };
}

export interface ToolDragItem {
  type: typeof ItemTypes.TOOL_IMAGE | typeof ItemTypes.TOOL_TEXT | typeof ItemTypes.TOOL_SHAPE 
       | typeof ItemTypes.TOOL_RECTANGLE | typeof ItemTypes.TOOL_CIRCLE | typeof ItemTypes.TOOL_LINE;
  toolType: 'image' | 'text' | 'rectangle' | 'circle' | 'line';
  defaultProps?: Record<string, any>;
}

export interface FileDragItem {
  type: typeof ItemTypes.FILE;
  files: File[];
}

export interface LayerDragItem {
  type: typeof ItemTypes.LAYER;
  layerId: string;
  elementId: string;
  index: number;
}

export type DragItem = CanvasElementDragItem | ToolDragItem | FileDragItem | LayerDragItem;

// Drop Result Interface
export interface DropResult {
  position: {
    x: number;
    y: number;
  };
  dropEffect?: string;
}

// Drag Preview Configuration
export interface DragPreviewOptions {
  offsetX?: number;
  offsetY?: number;
  anchorPoint?: 'topLeft' | 'center' | 'bottomRight';
  captureDraggingState?: boolean;
}

// Touch Support Configuration
export interface TouchBackendOptions {
  enableTouchEvents?: boolean;
  enableMouseEvents?: boolean;
  enableKeyboardEvents?: boolean;
  delay?: number;
  delayTouchStart?: number;
  delayMouseStart?: number;
}

// Multi-touch Configuration
export interface MultiTouchGesture {
  enablePinchZoom?: boolean;
  enableRotation?: boolean;
  maxTouches?: number;
}

export default ItemTypes;