import { create } from 'zustand';
import type { Album } from '../api/albums';
import type { Page } from '../api/pages';
import type { CanvasElement, Size } from '../contexts/CanvasContext';
import type { BackgroundStyle } from '../types/backgroundStyle';
import { errorHandler, withErrorHandler } from '../utils/errorHandler';
import { performanceMonitor } from '../utils/performanceMonitor';

// 数据同步状态枚举
export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  SUCCESS = 'success',
  ERROR = 'error',
  OFFLINE = 'offline'
}

// 变更类型枚举
export enum ChangeType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}

// 变更记录接口
export interface ChangeRecord {
  id: string;
  type: ChangeType;
  entityType: 'album' | 'page' | 'image' | 'canvas';
  entityId: string | number;
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

// 缓存数据接口
export interface CachedData<T> {
  data: T;
  lastFetched: number;
  expiresAt: number;
  version: number;
}

// 同步配置接口
export interface SyncConfig {
  enabled: boolean;
  interval: number; // 毫秒
  retryAttempts: number;
  retryDelay: number; // 毫秒
  batchSize: number;
}

// 全局状态接口
export interface GlobalState {
  // 数据缓存
  albums: CachedData<Album[]>;
  pages: Record<number, CachedData<Page[]>>; // 按相册ID分组
  images: CachedData<any[]>;
  canvasData: Record<number, CachedData<{ elements: CanvasElement[]; background: BackgroundStyle; canvasSize: Size }>>; // 按页面ID分组
  pageBackgrounds: Record<number, CachedData<BackgroundStyle>>; // 页面背景缓存，按页面ID分组

  // 变更跟踪
  changes: ChangeRecord[];
  lastSyncTime: number;

  // 同步状态
  syncStatus: SyncStatus;
  syncConfig: SyncConfig;

  // UI状态
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  canvasLoading: Record<number, boolean>; // 按页面ID跟踪画布加载状态

  // 自动保存状态
  saveStatus: 'saved' | 'saving' | 'error' | 'pending';
  saveTimeoutId: NodeJS.Timeout | null;
  pendingCanvasData: { pageId: number; data: { elements: CanvasElement[]; background: BackgroundStyle; canvasSize?: Size } } | null;

  // 操作方法
  // 数据获取
  fetchAlbums: (force?: boolean) => Promise<void>;
  fetchPages: (albumId: number, force?: boolean) => Promise<void>;
  fetchImages: (force?: boolean) => Promise<void>;
  fetchCanvasData: (pageId: number, force?: boolean) => Promise<void>;
  fetchPageBackground: (pageId: number, force?: boolean) => Promise<BackgroundStyle | null>;

  // 数据操作
  createAlbum: (album: Omit<Album, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Album>;
  updateAlbum: (id: number, updates: Partial<Album>) => Promise<void>;
  deleteAlbum: (id: number) => Promise<void>;

  createPage: (page: Omit<Page, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Page>;
  updatePage: (id: number, updates: Partial<Page>) => Promise<void>;
  deletePage: (id: number) => Promise<void>;

  updateCanvasData: (pageId: number, data: { elements: CanvasElement[]; background: BackgroundStyle; canvasSize?: Size }) => Promise<void>;

  // 相册背景管理
  updateAlbumBackgroundSetting: (albumId: number, isUseGlobalBackground: boolean) => Promise<void>;

  // 同步管理
  syncChanges: () => Promise<void>;
  clearChanges: () => void;
  setSyncStatus: (status: SyncStatus) => void;

  // 工具方法
  isDataStale: (cache: CachedData<any>) => boolean;
  invalidateCache: (type: string, id?: string | number) => void;
  getCacheKey: (type: string, id?: string | number) => string;
}

// 默认同步配置
const defaultSyncConfig: SyncConfig = {
  enabled: true,
  interval: 30000, // 30秒
  retryAttempts: 3,
  retryDelay: 1000, // 1秒
  batchSize: 10
};

// 缓存过期时间 (60分钟)
const CACHE_EXPIRY = 60 * 60 * 1000;

// 创建Store (暂时禁用persist来测试)
const useStore = create<GlobalState>()(
    (set, get) => ({
      // 初始状态
      albums: {
        data: [],
        lastFetched: 0,
        expiresAt: 0,
        version: 0
      },
      pages: {},
      images: {
        data: [],
        lastFetched: 0,
        expiresAt: 0,
        version: 0
      },
      canvasData: {},
      pageBackgrounds: {},

      changes: [],
      lastSyncTime: 0,

      syncStatus: SyncStatus.IDLE,
      syncConfig: defaultSyncConfig,

      loading: {},
      errors: {},
      canvasLoading: {},

      // 自动保存状态
      saveStatus: 'saved',
      saveTimeoutId: null,
      pendingCanvasData: null,

      // 数据获取方法
      fetchAlbums: withErrorHandler(async (force = false) => {
        const state = get();
        const cacheKey = 'albums';

        // 检查缓存是否有效
        if (!force && !state.isDataStale(state.albums)) {
          return;
        }

        set(state => ({
          loading: { ...state.loading, [cacheKey]: true },
          errors: { ...state.errors, [cacheKey]: null }
        }));

        try {
          const { albumsAPI } = await import('../api/albums');
          const data = await albumsAPI.getAll();

          // 记录API调用
          performanceMonitor.recordApiCall();

          set(state => ({
            albums: {
              data,
              lastFetched: Date.now(),
              expiresAt: Date.now() + CACHE_EXPIRY,
              version: state.albums.version + 1
            },
            loading: { ...state.loading, [cacheKey]: false }
          }));
        } catch (error) {
          console.error('Failed to fetch albums:', error);
          performanceMonitor.recordError();
          set(state => ({
            loading: { ...state.loading, [cacheKey]: false },
            errors: { ...state.errors, [cacheKey]: error instanceof Error ? error.message : 'Failed to fetch albums' }
          }));
          throw error; // 重新抛出错误，让withErrorHandler处理
        }
      }, { operation: 'fetchAlbums' }),

      fetchPages: async (albumId: number, force = false) => {
        const state = get();
        const cacheKey = `pages_${albumId}`;

        // 检查缓存是否有效
        if (!force && state.pages[albumId] && !state.isDataStale(state.pages[albumId])) {
          return;
        }

        set(state => ({
          loading: { ...state.loading, [cacheKey]: true },
          errors: { ...state.errors, [cacheKey]: null }
        }));

        try {
          const { pagesAPI } = await import('../api/pages');
          const data = await pagesAPI.getByAlbum(albumId);

          set(state => ({
            pages: {
              ...state.pages,
              [albumId]: {
                data,
                lastFetched: Date.now(),
                expiresAt: Date.now() + CACHE_EXPIRY,
                version: (state.pages[albumId]?.version || 0) + 1
              }
            },
            loading: { ...state.loading, [cacheKey]: false }
          }));
        } catch (error) {
          console.error('Failed to fetch pages:', error);
          set(state => ({
            loading: { ...state.loading, [cacheKey]: false },
            errors: { ...state.errors, [cacheKey]: error instanceof Error ? error.message : 'Failed to fetch pages' }
          }));
        }
      },

      fetchImages: async (force = false) => {
        const state = get();
        const cacheKey = 'images';

        // 检查缓存是否有效
        if (!force && !state.isDataStale(state.images)) {
          return;
        }

        set(state => ({
          loading: { ...state.loading, [cacheKey]: true },
          errors: { ...state.errors, [cacheKey]: null }
        }));

        try {
          const { getUserImages } = await import('../api/upload');
          const result = await getUserImages();

          set(state => ({
            images: {
              data: result.images,
              lastFetched: Date.now(),
              expiresAt: Date.now() + CACHE_EXPIRY,
              version: state.images.version + 1
            },
            loading: { ...state.loading, [cacheKey]: false }
          }));
        } catch (error) {
          console.error('Failed to fetch images:', error);
          set(state => ({
            loading: { ...state.loading, [cacheKey]: false },
            errors: { ...state.errors, [cacheKey]: error instanceof Error ? error.message : 'Failed to fetch images' }
          }));
        }
      },

      fetchCanvasData: async (pageId: number, force = false) => {
        const state = get();
        const cacheKey = `canvas_${pageId}`;

        console.log('🏪 Store: fetchCanvasData 开始', {
          pageId,
          force,
          hasCachedData: !!state.canvasData[pageId]?.data,
          isDataStale: state.canvasData[pageId] ? state.isDataStale(state.canvasData[pageId]) : 'no-cache'
        });

        // 检查缓存是否有效 - 确保缓存对象完整
        const cachedData = state.canvasData[pageId];
        if (!force && cachedData && cachedData.expiresAt && !state.isDataStale(cachedData)) {
          console.log('🏪 Store: 使用缓存数据，跳过API调用');
          return;
        }

        console.log('🏪 Store: 设置loading状态为true');
        // 设置画布加载状态
        set(state => ({
          loading: { ...state.loading, [cacheKey]: true },
          errors: { ...state.errors, [cacheKey]: null },
          canvasLoading: { ...state.canvasLoading, [pageId]: true }
        }));

        try {
          console.log('🏪 Store: 开始API调用');
          const { pagesAPI } = await import('../api/pages');
          const canvasData = await pagesAPI.getCanvas(pageId);
          const backgroundData = await pagesAPI.getBackground(pageId);

          console.log('🏪 Store: API调用成功，设置loading状态为false', {
            elementsCount: canvasData.elements?.length || 0,
            canvasSize: canvasData.canvasSize
          });

          set(state => {
            const newCanvasLoading = { ...state.canvasLoading, [pageId]: false };
            console.log('🏪 Store: 更新状态 - canvasLoading:', newCanvasLoading);
            return {
              canvasData: {
                ...state.canvasData,
                [pageId]: {
                  data: {
                    elements: canvasData.elements,
                    background: backgroundData.background,
                    canvasSize: canvasData.canvasSize
                  },
                  lastFetched: Date.now(),
                  expiresAt: Date.now() + CACHE_EXPIRY,
                  version: (state.canvasData[pageId]?.version || 0) + 1
                }
              },
              loading: { ...state.loading, [cacheKey]: false },
              canvasLoading: newCanvasLoading
            };
          });

          console.log('🏪 Store: 数据更新完成，loading状态已清除');
        } catch (error) {
          console.error('🏪 Store: API调用失败:', error);
          set(state => ({
            loading: { ...state.loading, [cacheKey]: false },
            errors: { ...state.errors, [cacheKey]: error instanceof Error ? error.message : 'Failed to fetch canvas data' },
            canvasLoading: { ...state.canvasLoading, [pageId]: false }
          }));
        }
      },

      // 数据操作方法
      createAlbum: async (albumData) => {
        const { albumsAPI } = await import('../api/albums');
        const newAlbum = await albumsAPI.create(albumData.title, albumData.parentId);

        // 更新本地缓存
        set(state => ({
          albums: {
            ...state.albums,
            data: [...state.albums.data, newAlbum],
            version: state.albums.version + 1
          }
        }));

        // 记录变更用于同步
        const { syncService } = await import('../services/syncService');
        syncService.addChange({
          type: ChangeType.CREATE,
          entityType: 'album',
          entityId: newAlbum.id,
          data: albumData
        });

        return newAlbum;
      },

      updateAlbum: async (id, updates) => {
        const { albumsAPI } = await import('../api/albums');
        await albumsAPI.update(id, updates.title || '', updates.parentId);

        // 更新本地缓存
        set(state => ({
          albums: {
            ...state.albums,
            data: state.albums.data.map(album =>
              album.id === id ? { ...album, ...updates, updatedAt: new Date().toISOString() } : album
            ),
            version: state.albums.version + 1
          }
        }));

        // 记录变更用于同步
        const { syncService } = await import('../services/syncService');
        syncService.addChange({
          type: ChangeType.UPDATE,
          entityType: 'album',
          entityId: id,
          data: updates
        });
      },

      deleteAlbum: async (id) => {
        const { albumsAPI } = await import('../api/albums');
        await albumsAPI.delete(id);

        // 更新本地缓存
        set(state => ({
          albums: {
            ...state.albums,
            data: state.albums.data.filter(album => album.id !== id),
            version: state.albums.version + 1
          }
        }));

        // 记录变更用于同步
        const { syncService } = await import('../services/syncService');
        syncService.addChange({
          type: ChangeType.DELETE,
          entityType: 'album',
          entityId: id,
          data: {}
        });
      },

      createPage: async (pageData) => {
        const { pagesAPI } = await import('../api/pages');
        const newPage = await pagesAPI.create(pageData.title, pageData.albumId, pageData.content);

        // 更新本地缓存
        set(state => ({
          pages: {
            ...state.pages,
            [pageData.albumId]: {
              ...state.pages[pageData.albumId],
              data: [...(state.pages[pageData.albumId]?.data || []), newPage],
              version: (state.pages[pageData.albumId]?.version || 0) + 1
            }
          }
        }));

        return newPage;
      },

      updatePage: async (id, updates) => {
        const { pagesAPI } = await import('../api/pages');
        await pagesAPI.update(id, updates.title || '', updates.content || '');

        // 更新本地缓存
        set(state => {
          const updatedPages = { ...state.pages };
          Object.keys(updatedPages).forEach(albumId => {
            if (updatedPages[parseInt(albumId)]?.data) {
              updatedPages[parseInt(albumId)] = {
                ...updatedPages[parseInt(albumId)],
                data: updatedPages[parseInt(albumId)].data.map(page =>
                  page.id === id ? { ...page, ...updates, updatedAt: new Date().toISOString() } : page
                ),
                version: updatedPages[parseInt(albumId)].version + 1
              };
            }
          });
          return { pages: updatedPages };
        });
      },

      deletePage: async (id) => {
        const { pagesAPI } = await import('../api/pages');
        await pagesAPI.delete(id);

        // 更新本地缓存
        set(state => {
          const updatedPages = { ...state.pages };
          Object.keys(updatedPages).forEach(albumId => {
            if (updatedPages[parseInt(albumId)]?.data) {
              updatedPages[parseInt(albumId)] = {
                ...updatedPages[parseInt(albumId)],
                data: updatedPages[parseInt(albumId)].data.filter(page => page.id !== id),
                version: updatedPages[parseInt(albumId)].version + 1
              };
            }
          });
          return { pages: updatedPages };
        });
      },

      updateCanvasData: async (pageId, data: { elements: CanvasElement[]; background: BackgroundStyle; canvasSize?: Size }) => {
        const state = get();

        // 清除之前的定时器
        if (state.saveTimeoutId) {
          clearTimeout(state.saveTimeoutId);
        }

        // 保存待处理的数据
        set({ pendingCanvasData: { pageId, data }, saveStatus: 'pending' });

        // 设置防抖定时器
        const timeoutId = setTimeout(async () => {
          const currentState = get();
          if (!currentState.pendingCanvasData) return;

          const { pageId: savePageId, data: saveData } = currentState.pendingCanvasData as { pageId: number; data: { elements: CanvasElement[]; background: BackgroundStyle; canvasSize?: Size } };

          try {
            set({ saveStatus: 'saving' });

            const { pagesAPI } = await import('../api/pages');

            // 更新画布数据
            await pagesAPI.updateCanvas(savePageId, {
              canvasSize: saveData.canvasSize || { width: 800, height: 600 }, // 使用传入的尺寸或默认尺寸
              elements: saveData.elements,
              version: 1
            });

            // 更新背景
            await pagesAPI.updateBackground(savePageId, saveData.background);

            // 更新本地缓存
            set(state => ({
              canvasData: {
                ...state.canvasData,
                [savePageId]: {
                  ...state.canvasData[savePageId],
                  data: {
                    elements: saveData.elements,
                    background: saveData.background,
                    canvasSize: saveData.canvasSize || { width: 800, height: 600 }
                  },
                  lastFetched: Date.now(),
                  expiresAt: Date.now() + CACHE_EXPIRY,
                  version: (state.canvasData[savePageId]?.version || 0) + 1
                }
              },
              saveStatus: 'saved',
              saveTimeoutId: null,
              pendingCanvasData: null
            }));

            // 记录变更用于同步
            const { syncService } = await import('../services/syncService');
            syncService.addChange({
              type: ChangeType.UPDATE,
              entityType: 'canvas',
              entityId: savePageId,
              data: {
                elements: saveData.elements,
                background: saveData.background,
                canvasSize: saveData.canvasSize || { width: 800, height: 600 }
              }
            });

          } catch (error) {
            console.error('自动保存失败:', error);
            set({ saveStatus: 'error' });
          }
        }, 1000); // 1秒防抖

        set({ saveTimeoutId: timeoutId });
      },

      fetchPageBackground: async (pageId: number, force = false) => {
        const state = get();
        const cacheKey = `page_bg_${pageId}`;

        // 检查缓存是否有效
        if (!force && state.pageBackgrounds[pageId] && !state.isDataStale(state.pageBackgrounds[pageId])) {
          return state.pageBackgrounds[pageId].data;
        }

        try {
          const { pagesAPI } = await import('../api/pages');
          const backgroundData = await pagesAPI.getBackground(pageId);

          // 更新缓存
          set(state => ({
            pageBackgrounds: {
              ...state.pageBackgrounds,
              [pageId]: {
                data: backgroundData.background,
                lastFetched: Date.now(),
                expiresAt: Date.now() + CACHE_EXPIRY,
                version: (state.pageBackgrounds[pageId]?.version || 0) + 1
              }
            }
          }));

          return backgroundData.background;
        } catch (error) {
          console.error('Failed to fetch page background:', error);
          return null;
        }
      },

      // 相册背景管理方法
      updateAlbumBackgroundSetting: async (albumId, isUseGlobalBackground) => {
        const { albumsAPI } = await import('../api/albums');

        // 调用API更新相册的全局背景设置
        await albumsAPI.updateGlobalBackgroundSetting(albumId, isUseGlobalBackground);

        // 更新store中的相册缓存
        set(state => ({
          albums: {
            ...state.albums,
            data: state.albums.data.map(album =>
              album.id === albumId
                ? { ...album, isUseGlobalBackground }
                : album
            ),
            version: state.albums.version + 1
          }
        }));

        // 记录变更用于同步
        const { syncService } = await import('../services/syncService');
        syncService.addChange({
          type: ChangeType.UPDATE,
          entityType: 'album',
          entityId: albumId,
          data: { isUseGlobalBackground }
        });
      },

      // 同步管理方法
      syncChanges: async () => {
        const state = get();
        if (state.changes.length === 0) return;

        set({ syncStatus: SyncStatus.SYNCING });

        try {
          const { syncService } = await import('../services/syncService');

          // 将所有变更添加到同步服务
          for (const change of state.changes) {
            syncService.addChange({
              type: change.type,
              entityType: change.entityType,
              entityId: change.entityId,
              data: change.data
            });
          }

          // 强制同步
          await syncService.forceSync();

          set({
            syncStatus: SyncStatus.SUCCESS,
            lastSyncTime: Date.now(),
            changes: []
          });
        } catch (error) {
          console.error('Sync failed:', error);
          set({ syncStatus: SyncStatus.ERROR });
        }
      },

      clearChanges: () => {
        set({ changes: [] });
      },

      setSyncStatus: (status) => {
        set({ syncStatus: status });
      },

      // 工具方法
      isDataStale: (cache) => {
        // 确保缓存对象存在且完整
        if (!cache || !cache.expiresAt) {
          return true; // 如果缓存不完整，认为是过期的
        }
        return Date.now() > cache.expiresAt;
      },

      invalidateCache: (type, id) => {
        switch (type) {
          case 'albums':
            set(state => ({
              albums: { ...state.albums, expiresAt: 0 }
            }));
            break;
          case 'pages':
            if (id) {
              set(state => ({
                pages: {
                  ...state.pages,
                  [id as number]: {
                    ...state.pages[id as number],
                    expiresAt: 0
                  }
                }
              }));
            }
            break;
          case 'images':
            set(state => ({
              images: { ...state.images, expiresAt: 0 }
            }));
            break;
          case 'canvas':
            if (id) {
              set(state => ({
                canvasData: {
                  ...state.canvasData,
                  [id as number]: {
                    ...state.canvasData[id as number],
                    expiresAt: 0
                  }
                }
              }));
            }
            break;
        }
      },

      getCacheKey: (type, id) => {
        return id ? `${type}_${id}` : type;
      }
    })
);

export default useStore;
