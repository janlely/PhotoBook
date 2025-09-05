import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAutoSave } from '../hooks/useAutoSave';
import type { SaveStatus } from '../hooks/useAutoSave';
import type { PageCanvasData } from '../api/pages';
import type { BackgroundStyle } from '../types/backgroundStyle';

// Base types for canvas elements
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface BaseElement {
  id: string;
  type: 'image' | 'text' | 'shape';
  transform: Transform;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  alt?: string;
  opacity: number;
  aspectRatioLocked?: boolean; // 添加宽高比锁定属性
  border?: {
    width: number;
    color: string;
    radius: number; // 圆角半径，像素值
  };
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold' | 'lighter' | 'bolder';
  fontStyle: 'normal' | 'italic';
  color: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number;
  textStroke?: {
    enabled: boolean;
    width: number;
    color: string;
  };
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'line' | 'polygon';
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export type CanvasElement = ImageElement | TextElement | ShapeElement;

export type Tool = 'select' | 'text' | 'image' | 'rectangle' | 'circle' | 'line';

export interface CanvasState {
  elements: CanvasElement[];
  selectedElementIds: string[];
  activeTool: Tool;
  canvasSize: Size; // 实际尺寸，用于导出和保存
  displayScale: number; // 显示缩放比例，用于编辑时的适配显示
  isPreviewMode: boolean; // 预览模式，用于导出和预览
  zoom: number;
  panOffset: Point;
  history: CanvasElement[][];
  historyIndex: number;
  isGridVisible: boolean;
  isSnapToGrid: boolean;
  gridSize: number;
  currentPageId: number | null; // 添加当前页面ID
  background: BackgroundStyle; // 统一背景配置
  backgroundScope: 'page' | 'album'; // 背景应用范围
}

interface CanvasContextType {
  // State
  state: CanvasState;
  
  // Element operations
  addElement: (element: Omit<CanvasElement, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  deleteSelectedElements: () => void;
  duplicateElement: (id: string) => string;
  
  // Selection operations
  selectElement: (id: string, addToSelection?: boolean) => void;
  selectMultipleElements: (ids: string[]) => void;
  clearSelection: () => void;
  selectAll: () => void;
  
  // Transform operations
  moveElement: (id: string, delta: Point) => void;
  moveMultipleElements: (elementIds: string[], delta: Point) => void;
  resizeElement: (id: string, newTransform: Partial<Transform>) => void;
  rotateElement: (id: string, angle: number) => void;
  
  // Layer operations
  moveElementToFront: (id: string) => void;
  moveElementToBack: (id: string) => void;
  moveElementForward: (id: string) => void;
  moveElementBackward: (id: string) => void;
  
  // Tool operations
  setActiveTool: (tool: Tool) => void;
  
  // Canvas operations
  setCanvasSize: (size: Size) => void;
  setDisplayScale: (scale: number) => void;
  calculateOptimalDisplayScale: (containerWidth: number, containerHeight: number) => number;
  getDisplaySize: () => Size; // 获取显示尺寸
  getActualSize: () => Size; // 获取实际尺寸
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: Point) => void;
  
  // History operations
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // Grid operations
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;
  
  // Page operations
  setCurrentPageId: (pageId: number | null) => void;
  loadCanvasData: (data: PageCanvasData, pageId?: number) => Promise<void>;
  
  // Auto-save operations
  saveStatus: SaveStatus;
  forceSave: () => void;
  clearSaveError: () => void;
  
  // Preview and export utilities
  setBackground: (background: BackgroundStyle) => void;
  setBackgroundScope: (scope: 'page' | 'album') => void;
  setPreviewMode: (enabled: boolean) => void;
  exportCanvasAsImage: (format: 'png' | 'jpeg', quality?: number) => Promise<Blob>;
  exportCanvasToPDF: () => Promise<Blob>;
  
  // Utility functions
  getElementById: (id: string) => CanvasElement | undefined;
  getSelectedElements: () => CanvasElement[];
  exportCanvasData: () => string;
  importCanvasData: (data: string) => void;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export const useCanvas = () => {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
};

const initialState: CanvasState = {
  elements: [],
  selectedElementIds: [],
  activeTool: 'select',
  canvasSize: { width: 800, height: 600 },
  displayScale: 1, // 初始显示缩放比例
  isPreviewMode: false, // 初始为编辑模式
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  history: [[]],
  historyIndex: 0,
  isGridVisible: false,
  isSnapToGrid: false,
  gridSize: 20,
  currentPageId: null,
  background: {
    type: 'solid',
    color: '#FFFFFF'
  }, // 默认白色背景
  backgroundScope: 'page', // 默认页面级作用域
};

interface CanvasProviderProps {
  children: ReactNode;
}

export const CanvasProvider: React.FC<CanvasProviderProps> = ({ children }) => {
  const [state, setState] = useState<CanvasState>(initialState);
  
  // 自动保存集成
  const { triggerSave, saveStatus, forceSave, clearError } = useAutoSave(state.currentPageId, 1000);

  const generateId = useCallback(() => {
    return `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const addToHistory = useCallback((elements: CanvasElement[]) => {
    setState(prev => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push([...elements]);
      return {
        ...prev,
        history: newHistory.slice(-50), // Keep last 50 states
        historyIndex: newHistory.length - 1,
      };
    });
  }, []);

  // 监听状态变化并触发保存
  useEffect(() => {
    // 只有在有页面ID时才触发保存
    if (state.currentPageId && state.elements.length >= 0) {
      const canvasData: Omit<PageCanvasData, 'lastModified'> = {
        canvasSize: state.canvasSize,
        elements: state.elements,
        version: 1
      };
      
      console.log('自动保存触发，元素数量:', state.elements.length, '页面ID:', state.currentPageId);
      triggerSave(canvasData);
    }
  }, [state.elements, state.canvasSize, state.currentPageId, triggerSave]);

  const addElement = useCallback((elementData: Omit<CanvasElement, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = generateId();
    const now = new Date();
    const newElement: CanvasElement = {
      ...elementData,
      id,
      createdAt: now,
      updatedAt: now,
    } as CanvasElement;

    setState(prev => {
      const newElements = [...prev.elements, newElement];
      addToHistory(newElements);
      return {
        ...prev,
        elements: newElements,
        selectedElementIds: [id],
      };
    });

    return id;
  }, [generateId, addToHistory]);

  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    console.log('updateElement 被调用:', { id, updates });
    setState(prev => {
      const newElements = prev.elements.map(element => {
        if (element.id === id) {
          return { ...element, ...updates, updatedAt: new Date() } as CanvasElement;
        }
        return element;
      });
      addToHistory(newElements);
      console.log('元素更新后，元素数量:', newElements.length);
      return {
        ...prev,
        elements: newElements,
      };
    });
  }, [addToHistory]);

  const deleteElement = useCallback((id: string) => {
    setState(prev => {
      const newElements = prev.elements.filter(element => element.id !== id);
      const newSelectedIds = prev.selectedElementIds.filter(selectedId => selectedId !== id);
      addToHistory(newElements);
      return {
        ...prev,
        elements: newElements,
        selectedElementIds: newSelectedIds,
      };
    });
  }, [addToHistory]);

  const deleteSelectedElements = useCallback(() => {
    setState(prev => {
      const newElements = prev.elements.filter(element => 
        !prev.selectedElementIds.includes(element.id)
      );
      addToHistory(newElements);
      return {
        ...prev,
        elements: newElements,
        selectedElementIds: [],
      };
    });
  }, [addToHistory]);

  const duplicateElement = useCallback((id: string) => {
    const element = state.elements.find(el => el.id === id);
    if (!element) return '';

    const newId = generateId();
    const now = new Date();
    const duplicatedElement: CanvasElement = {
      ...element,
      id: newId,
      transform: {
        ...element.transform,
        x: element.transform.x + 20,
        y: element.transform.y + 20,
      },
      createdAt: now,
      updatedAt: now,
    };

    setState(prev => {
      const newElements = [...prev.elements, duplicatedElement];
      addToHistory(newElements);
      return {
        ...prev,
        elements: newElements,
        selectedElementIds: [newId],
      };
    });

    return newId;
  }, [state.elements, generateId, addToHistory]);

  const selectElement = useCallback((id: string, addToSelection = false) => {
    setState(prev => ({
      ...prev,
      selectedElementIds: addToSelection 
        ? prev.selectedElementIds.includes(id)
          ? prev.selectedElementIds.filter(selectedId => selectedId !== id)
          : [...prev.selectedElementIds, id]
        : [id],
    }));
  }, []);

  const selectMultipleElements = useCallback((ids: string[]) => {
    setState(prev => ({
      ...prev,
      selectedElementIds: ids,
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedElementIds: [],
    }));
  }, []);

  const selectAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedElementIds: prev.elements.map(element => element.id),
    }));
  }, []);

  const moveElement = useCallback((id: string, delta: Point) => {
    setState(prev => {
      const newElements = prev.elements.map(element => {
        if (element.id === id) {
          return {
            ...element,
            transform: {
              ...element.transform,
              x: element.transform.x + delta.x,
              y: element.transform.y + delta.y,
            },
            updatedAt: new Date(),
          };
        }
        return element;
      });
      
      // 只在拖动结束时才添加到历史记录，减少频繁更新
      addToHistory(newElements);
      
      return {
        ...prev,
        elements: newElements,
      };
    });
  }, [addToHistory]);

  const moveMultipleElements = useCallback((elementIds: string[], delta: Point) => {
    // Move multiple elements simultaneously
    setState(prev => {
      const newElements = prev.elements.map(element => {
        if (elementIds.includes(element.id)) {
          return {
            ...element,
            transform: {
              ...element.transform,
              x: element.transform.x + delta.x,
              y: element.transform.y + delta.y,
            },
            updatedAt: new Date(),
          };
        }
        return element;
      });
      addToHistory(newElements);
      return {
        ...prev,
        elements: newElements,
      };
    });
  }, [addToHistory]);

  const resizeElement = useCallback((id: string, newTransform: Partial<Transform>) => {
    console.log('📝 CanvasContext.resizeElement 被调用:', {
      elementId: id,
      newTransform,
      currentElement: state.elements.find(el => el.id === id)
    });
    
    const element = state.elements.find(el => el.id === id);
    if (!element) {
      console.error('❌ 找不到元素:', id);
      return;
    }
    
    const updatedTransform = {
      ...element.transform,
      ...newTransform,
    };
    
    console.log('🔄 更新元素变换:', {
      elementId: id,
      oldTransform: element.transform,
      newTransform: updatedTransform
    });
    
    updateElement(id, {
      transform: updatedTransform,
    });
  }, [state.elements, updateElement]);

  const rotateElement = useCallback((id: string, angle: number) => {
    updateElement(id, {
      transform: {
        ...state.elements.find(el => el.id === id)?.transform!,
        rotation: angle,
      },
    });
  }, [state.elements, updateElement]);

  const moveElementToFront = useCallback((id: string) => {
    const maxZIndex = Math.max(...state.elements.map(el => el.zIndex), 0);
    updateElement(id, { zIndex: maxZIndex + 1 });
  }, [state.elements, updateElement]);

  const moveElementToBack = useCallback((id: string) => {
    const minZIndex = Math.min(...state.elements.map(el => el.zIndex), 0);
    updateElement(id, { zIndex: minZIndex - 1 });
  }, [state.elements, updateElement]);

  const moveElementForward = useCallback((id: string) => {
    const element = state.elements.find(el => el.id === id);
    if (element) {
      updateElement(id, { zIndex: element.zIndex + 1 });
    }
  }, [state.elements, updateElement]);

  const moveElementBackward = useCallback((id: string) => {
    const element = state.elements.find(el => el.id === id);
    if (element) {
      updateElement(id, { zIndex: element.zIndex - 1 });
    }
  }, [state.elements, updateElement]);

  const setActiveTool = useCallback((tool: Tool) => {
    setState(prev => ({
      ...prev,
      activeTool: tool,
      selectedElementIds: tool === 'select' ? prev.selectedElementIds : [],
    }));
  }, []);

  const setCanvasSize = useCallback((size: Size) => {
    setState(prev => ({
      ...prev,
      canvasSize: size,
      // 重置显示缩放比例为1，等待容器调用calculateOptimalDisplayScale
      displayScale: 1,
    }));
  }, []);

  const setDisplayScale = useCallback((scale: number) => {
    setState(prev => ({
      ...prev,
      displayScale: Math.max(0.1, Math.min(2, scale)), // 限制在 0.1 到 2 之间
    }));
  }, []);

  // 计算最优显示缩放比例，让画布适合在容器中显示
  const calculateOptimalDisplayScale = useCallback((containerWidth: number, containerHeight: number) => {
    const canvasWidth = state.canvasSize.width;
    const canvasHeight = state.canvasSize.height;
    
    // 留出一些边距空间，避免画布紧贴边缘
    const padding = 80;
    const availableWidth = containerWidth - padding;
    const availableHeight = containerHeight - padding;
    
    // 计算按宽度和高度缩放的比例
    const scaleByWidth = availableWidth / canvasWidth;
    const scaleByHeight = availableHeight / canvasHeight;
    
    // 取较小的缩放比例，确保画布完全显示在容器内
    const optimalScale = Math.min(scaleByWidth, scaleByHeight);
    
    // 限制最小和最大缩放比例
    return Math.max(0.1, Math.min(1.5, optimalScale));
  }, [state.canvasSize]);

  // 获取显示尺寸（缩放后的尺寸）
  const getDisplaySize = useCallback(() => ({
    width: state.canvasSize.width * state.displayScale,
    height: state.canvasSize.height * state.displayScale,
  }), [state.canvasSize, state.displayScale]);

  // 获取实际尺寸（用于导出和PDF生成）
  const getActualSize = useCallback(() => state.canvasSize, [state.canvasSize]);

  // 预览和导出相关函数
  const setPreviewMode = useCallback((enabled: boolean) => {
    setState(prev => ({
      ...prev,
      isPreviewMode: enabled,
      displayScale: enabled ? 1 : prev.displayScale, // 预览模式使用实际尺寸
    }));
  }, []);

  const exportCanvasAsImage = useCallback(async (format: 'png' | 'jpeg', quality = 0.9): Promise<Blob> => {
    // 这里将来实现导出为图片的逻辑
    // 目前返回一个空的 Blob 作为占位符
    return new Blob([], { type: `image/${format}` });
  }, []);

  const exportCanvasToPDF = useCallback(async (): Promise<Blob> => {
    // 这里将来实现导出为PDF的逻辑
    // 目前返回一个空的 Blob 作为占位符
    return new Blob([], { type: 'application/pdf' });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(5, zoom)),
    }));
  }, []);

  const setPanOffset = useCallback((offset: Point) => {
    setState(prev => ({
      ...prev,
      panOffset: offset,
    }));
  }, []);

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex > 0) {
        const newIndex = prev.historyIndex - 1;
        return {
          ...prev,
          elements: [...prev.history[newIndex]],
          historyIndex: newIndex,
          selectedElementIds: [],
        };
      }
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex < prev.history.length - 1) {
        const newIndex = prev.historyIndex + 1;
        return {
          ...prev,
          elements: [...prev.history[newIndex]],
          historyIndex: newIndex,
          selectedElementIds: [],
        };
      }
      return prev;
    });
  }, []);

  const toggleGrid = useCallback(() => {
    setState(prev => ({
      ...prev,
      isGridVisible: !prev.isGridVisible,
    }));
  }, []);

  const toggleSnapToGrid = useCallback(() => {
    setState(prev => ({
      ...prev,
      isSnapToGrid: !prev.isSnapToGrid,
    }));
  }, []);

  const setGridSize = useCallback((size: number) => {
    setState(prev => ({
      ...prev,
      gridSize: Math.max(5, Math.min(100, size)),
    }));
  }, []);

  const getElementById = useCallback((id: string): CanvasElement | undefined => {
    return state.elements.find(element => element.id === id);
  }, [state.elements]);

  const getSelectedElements = useCallback((): CanvasElement[] => {
    return state.elements.filter(element => 
      state.selectedElementIds.includes(element.id)
    );
  }, [state.elements, state.selectedElementIds]);

  const exportCanvasData = useCallback((): string => {
    return JSON.stringify({
      elements: state.elements,
      canvasSize: state.canvasSize,
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }, [state.elements, state.canvasSize]);

  const importCanvasData = useCallback((data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.elements && Array.isArray(parsed.elements)) {
        setState(prev => {
          addToHistory(parsed.elements);
          return {
            ...prev,
            elements: parsed.elements,
            canvasSize: parsed.canvasSize || prev.canvasSize,
            selectedElementIds: [],
          };
        });
      }
    } catch (error) {
      console.error('Failed to import canvas data:', error);
    }
  }, [addToHistory]);

  // 页面操作方法
  const setCurrentPageId = useCallback((pageId: number | null) => {
    setState(prev => ({
      ...prev,
      currentPageId: pageId,
      // 切换页面时清空选中状态
      selectedElementIds: [],
    }));
  }, []);

  const loadCanvasData = useCallback(async (data: PageCanvasData, pageId?: number) => {
    // Load background data if pageId is provided
    let background = initialState.background;
    if (pageId) {
      try {
        const { pagesAPI } = await import('../api/pages');
        const backgroundData = await pagesAPI.getBackground(pageId);
        background = backgroundData.background;
      } catch (error) {
        console.error('Failed to load background data:', error);
        // Keep default background if loading fails
      }
    }

    setState(prev => {
      // 加载数据时不添加到历史记录，因为这是初始化操作
      return {
        ...prev,
        elements: data.elements || [],
        canvasSize: data.canvasSize || prev.canvasSize,
        background,
        selectedElementIds: [],
        // 重置历史记录
        history: [data.elements || []],
        historyIndex: 0,
      };
    });
  }, []);

  const contextValue: CanvasContextType = {
    state,
    addElement,
    updateElement,
    deleteElement,
    deleteSelectedElements,
    duplicateElement,
    selectElement,
    selectMultipleElements,
    clearSelection,
    selectAll,
    moveElement,
    moveMultipleElements,
    resizeElement,
    rotateElement,
    moveElementToFront,
    moveElementToBack,
    moveElementForward,
    moveElementBackward,
    setActiveTool,
    setCanvasSize,
    setDisplayScale,
    calculateOptimalDisplayScale,
    getDisplaySize,
    getActualSize,
    setZoom,
    setPanOffset,
    undo,
    redo,
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.history.length - 1,
    toggleGrid,
    toggleSnapToGrid,
    setGridSize,
    setCurrentPageId,
    loadCanvasData,
    saveStatus,
    forceSave,
    clearSaveError: clearError,
  setBackground: (background: BackgroundStyle) => {
    setState(prev => ({
      ...prev,
      background
    }));
  },
  setBackgroundScope: (scope: 'page' | 'album') => {
    setState(prev => ({
      ...prev,
      backgroundScope: scope
    }));
  },
  setPreviewMode,
  exportCanvasAsImage,
  exportCanvasToPDF,
    getElementById,
    getSelectedElements,
    exportCanvasData,
    importCanvasData,
  };

  return (
    <CanvasContext.Provider value={contextValue}>
      {children}
    </CanvasContext.Provider>
  );
};

export default CanvasContext;
