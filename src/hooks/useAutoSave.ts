import { useState, useRef, useCallback, useEffect } from 'react';
import { pagesAPI } from '../api/pages';
import type { PageCanvasData } from '../api/pages';

export type SaveStatus = 'saved' | 'saving' | 'error' | 'pending';

interface UseAutoSaveReturn {
  triggerSave: (data: Omit<PageCanvasData, 'lastModified'>) => void;
  saveStatus: SaveStatus;
  forceSave: () => void;
  clearError: () => void;
}

export function useAutoSave(pageId: number | null, debounceMs = 1000): UseAutoSaveReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<Omit<PageCanvasData, 'lastModified'> | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const saveToServer = useCallback(async (data: Omit<PageCanvasData, 'lastModified'>) => {
    if (!pageId) {
      console.warn('无法保存：缺少页面ID');
      return;
    }

    try {
      setSaveStatus('saving');
      console.log('开始保存画布数据...', { pageId, elementsCount: data.elements.length });
      
      const result = await pagesAPI.updateCanvas(pageId, data);
      
      setSaveStatus('saved');
      retryCountRef.current = 0;
      console.log('画布数据保存成功:', result.lastModified);
      
    } catch (error) {
      console.error('自动保存失败:', error);
      setSaveStatus('error');
      
      // 重试机制：最多重试3次
      if (retryCountRef.current < 3) {
        retryCountRef.current += 1;
        const retryDelay = Math.min(3000 * retryCountRef.current, 10000); // 3s, 6s, 9s
        
        console.log(`将在 ${retryDelay}ms 后重试保存 (第${retryCountRef.current}次重试)`);
        
        retryTimeoutRef.current = setTimeout(() => {
          console.log('重试保存画布数据...');
          saveToServer(data);
        }, retryDelay);
      } else {
        console.error('已达到最大重试次数，保存失败');
      }
    }
  }, [pageId]);

  const triggerSave = useCallback((data: Omit<PageCanvasData, 'lastModified'>) => {
    if (!pageId) {
      console.warn('无法触发保存：缺少页面ID');
      return;
    }

    // 保存待处理的数据
    pendingSaveRef.current = data;
    setSaveStatus('pending');

    // 清除之前的定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 防抖：指定时间后执行保存
    saveTimeoutRef.current = setTimeout(() => {
      if (pendingSaveRef.current) {
        saveToServer(pendingSaveRef.current);
        pendingSaveRef.current = null;
      }
    }, debounceMs);
  }, [pageId, debounceMs, saveToServer]);

  const forceSave = useCallback(() => {
    if (pendingSaveRef.current && pageId) {
      // 立即保存，清除防抖定时器
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      saveToServer(pendingSaveRef.current);
      pendingSaveRef.current = null;
    }
  }, [pageId, saveToServer]);

  const clearError = useCallback(() => {
    if (saveStatus === 'error') {
      setSaveStatus('saved');
      retryCountRef.current = 0;
    }
  }, [saveStatus]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // 页面ID变化时重置状态
  useEffect(() => {
    setSaveStatus('saved');
    retryCountRef.current = 0;
    pendingSaveRef.current = null;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [pageId]);

  return {
    triggerSave,
    saveStatus,
    forceSave,
    clearError
  };
}