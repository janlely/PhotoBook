import type { ChangeRecord } from '../store/useStore';
import { ChangeType } from '../store/useStore';
import { albumsAPI } from '../api/albums';
import { pagesAPI } from '../api/pages';
import { deleteImage } from '../api/upload';

export class SyncService {
  private static instance: SyncService;
  private isOnline: boolean = navigator.onLine;
  private syncQueue: ChangeRecord[] = [];
  private isProcessing: boolean = false;

  private constructor() {
    // 监听网络状态变化
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  // 添加变更到同步队列
  addChange(change: Omit<ChangeRecord, 'id' | 'timestamp' | 'retryCount'>): void {
    const changeRecord: ChangeRecord = {
      ...change,
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.syncQueue.push(changeRecord);

    // 如果在线，立即处理同步
    if (this.isOnline && !this.isProcessing) {
      this.processSyncQueue();
    }

    // 持久化到本地存储
    this.persistQueue();
  }

  // 处理同步队列
  private async processSyncQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // 按时间排序处理变更
      const sortedQueue = [...this.syncQueue].sort((a, b) => a.timestamp - b.timestamp);

      for (const change of sortedQueue) {
        try {
          await this.processChange(change);
          // 成功后从队列中移除
          this.syncQueue = this.syncQueue.filter(c => c.id !== change.id);
        } catch (error) {
          console.error(`Failed to sync change ${change.id}:`, error);

          // 增加重试次数
          change.retryCount++;
          change.lastError = error instanceof Error ? error.message : 'Unknown error';

          // 如果重试次数超过限制，从队列中移除
          if (change.retryCount >= 3) {
            console.warn(`Removing change ${change.id} after ${change.retryCount} retries`);
            this.syncQueue = this.syncQueue.filter(c => c.id !== change.id);
          }
        }
      }
    } finally {
      this.isProcessing = false;
      this.persistQueue();
    }
  }

  // 处理单个变更
  private async processChange(change: ChangeRecord): Promise<void> {
    switch (change.entityType) {
      case 'album':
        await this.processAlbumChange(change);
        break;
      case 'page':
        await this.processPageChange(change);
        break;
      case 'image':
        await this.processImageChange(change);
        break;
      case 'canvas':
        await this.processCanvasChange(change);
        break;
      default:
        throw new Error(`Unknown entity type: ${change.entityType}`);
    }
  }

  // 处理相册变更
  private async processAlbumChange(change: ChangeRecord): Promise<void> {
    switch (change.type) {
      case ChangeType.CREATE:
        await albumsAPI.create(change.data.title, change.data.parentId);
        break;
      case ChangeType.UPDATE:
        await albumsAPI.update(change.entityId as number, change.data.title, change.data.parentId);
        break;
      case ChangeType.DELETE:
        await albumsAPI.delete(change.entityId as number);
        break;
    }
  }

  // 处理页面变更
  private async processPageChange(change: ChangeRecord): Promise<void> {
    switch (change.type) {
      case ChangeType.CREATE:
        await pagesAPI.create(change.data.title, change.data.albumId, change.data.content);
        break;
      case ChangeType.UPDATE:
        await pagesAPI.update(change.entityId as number, change.data.title, change.data.content);
        break;
      case ChangeType.DELETE:
        await pagesAPI.delete(change.entityId as number);
        break;
    }
  }

  // 处理图片变更
  private async processImageChange(change: ChangeRecord): Promise<void> {
    switch (change.type) {
      case ChangeType.DELETE:
        await deleteImage(change.entityId as number);
        break;
      default:
        // 图片上传通常是立即同步的，这里主要处理删除
        break;
    }
  }

  // 处理画布变更
  private async processCanvasChange(change: ChangeRecord): Promise<void> {
    switch (change.type) {
      case ChangeType.UPDATE:
        const { elements, background, canvasSize } = change.data;
        await pagesAPI.updateCanvas(change.entityId as number, {
          canvasSize: canvasSize || { width: 800, height: 600 },
          elements,
          version: 1
        });

        if (background) {
          await pagesAPI.updateBackground(change.entityId as number, background);
        }
        break;
    }
  }

  // 持久化同步队列到本地存储
  private persistQueue(): void {
    try {
      localStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to persist sync queue:', error);
    }
  }

  // 从本地存储恢复同步队列
  loadPersistedQueue(): void {
    try {
      const persisted = localStorage.getItem('sync_queue');
      if (persisted) {
        this.syncQueue = JSON.parse(persisted);
      }
    } catch (error) {
      console.error('Failed to load persisted sync queue:', error);
    }
  }

  // 获取同步队列状态
  getQueueStatus() {
    return {
      isOnline: this.isOnline,
      isProcessing: this.isProcessing,
      queueLength: this.syncQueue.length,
      pendingChanges: this.syncQueue.map(change => ({
        id: change.id,
        type: change.type,
        entityType: change.entityType,
        retryCount: change.retryCount,
        lastError: change.lastError
      }))
    };
  }

  // 强制同步所有变更
  async forceSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    await this.processSyncQueue();
  }

  // 清空同步队列（用于重置）
  clearQueue(): void {
    this.syncQueue = [];
    this.persistQueue();
  }
}

// 创建单例实例
export const syncService = SyncService.getInstance();

// 初始化时加载持久化的队列
syncService.loadPersistedQueue();