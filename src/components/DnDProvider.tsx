import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import type { TouchBackendOptions } from '../types/dnd';

interface DnDProviderProps {
  children: ReactNode;
  forceTouch?: boolean;
  touchBackendOptions?: TouchBackendOptions;
}

// Detect if touch device
const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0
  );
};

// Detect if mobile device
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

const DnDProvider: React.FC<DnDProviderProps> = ({ 
  children, 
  forceTouch = false,
  touchBackendOptions = {}
}) => {
  const backend = useMemo(() => {
    // Force touch backend if specified
    if (forceTouch) {
      return TouchBackend;
    }
    
    // Auto-detect based on device capabilities
    if (isTouchDevice() || isMobileDevice()) {
      return TouchBackend;
    }
    
    return HTML5Backend;
  }, [forceTouch]);

  const backendOptions = useMemo(() => {
    if (backend === TouchBackend) {
      return {
        enableMouseEvents: true,
        enableTouchEvents: true,
        enableKeyboardEvents: true,
        delay: 200,
        delayTouchStart: 200,
        delayMouseStart: 0,
        touchSlop: 5,
        ignoreContextMenu: true,
        ...touchBackendOptions
      };
    }
    
    // HTML5Backend doesn't need special options for our use case
    return {};
  }, [backend, touchBackendOptions]);

  return (
    <DndProvider backend={backend} options={backendOptions}>
      {children}
    </DndProvider>
  );
};

export default DnDProvider;

// Export utility functions for use in other components
export { isTouchDevice, isMobileDevice };