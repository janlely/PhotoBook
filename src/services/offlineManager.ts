import { syncService } from './syncService';
import { errorHandler } from '../utils/errorHandler';

export interface OfflineState {
  isOnline: boolean;
  isReconnecting: boolean;
  lastOnlineTime: number;
  pendingSyncCount: number;
  canWorkOffline: boolean;
}

export class OfflineManager {
  private static instance: OfflineManager;
  private state: OfflineState;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(state: OfflineState) => void> = new Set();

  private constructor() {
    this.state = {
      isOnline: navigator.onLine,
      isReconnecting: false,
      lastOnlineTime: Date.now(),
      pendingSyncCount: 0,
      canWorkOffline: true
    };

    this.initialize();
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  private initialize(): void {
    // 监听网络状态变化
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // 定期检查连接状态
    setInterval(() => {
      this.checkConnection();
    }, 30000); // 每30秒检查一次

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.state.isOnline) {
        this.attemptReconnection();
      }
    });
  }

  private handleOnline(): void {
    console.log('Network connection restored');
    this.state.isOnline = true;
    this.state.lastOnlineTime = Date.now();
    this.state.isReconnecting = false;

    this.notifyListeners();
    this.attemptReconnection();
  }

  private handleOffline(): void {
    console.log('Network connection lost');
    this.state.isOnline = false;
    this.state.isReconnecting = false;

    this.notifyListeners();
  }

  private async checkConnection(): Promise<void> {
    if (!this.state.isOnline) return;

    try {
      // 简单的连接检查
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error('Health check failed');
      }
    } catch (error) {
      console.warn('Connection check failed:', error);
      this.handleOffline();
    }
  }

  private async attemptReconnection(): Promise<void> {
    if (this.state.isReconnecting) return;

    this.state.isReconnecting = true;
    this.notifyListeners();

    try {
      // 尝试同步待处理的数据
      await syncService.forceSync();

      // 更新待同步计数
      const queueStatus = syncService.getQueueStatus();
      this.state.pendingSyncCount = queueStatus.queueLength;

      console.log('Reconnection successful, synced pending changes');
    } catch (error) {
      console.error('Reconnection failed:', error);
      errorHandler.captureError({
        message: 'Reconnection failed',
        context: { error: error instanceof Error ? error.message : 'Unknown error' }
      });

      // 如果失败，安排下次重试
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      this.reconnectTimer = setTimeout(() => {
        this.attemptReconnection();
      }, 5000); // 5秒后重试
    } finally {
      this.state.isReconnecting = false;
      this.notifyListeners();
    }
  }

  // 获取当前离线状态
  getState(): OfflineState {
    // 更新待同步计数
    const queueStatus = syncService.getQueueStatus();
    this.state.pendingSyncCount = queueStatus.queueLength;

    return { ...this.state };
  }

  // 订阅状态变化
  subscribe(listener: (state: OfflineState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // 通知所有监听器
  private notifyListeners(): void {
    const currentState = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(currentState);
      } catch (error) {
        console.error('Error in offline state listener:', error);
      }
    });
  }

  // 手动触发同步
  async forceSync(): Promise<void> {
    if (!this.state.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    await syncService.forceSync();
    this.state.pendingSyncCount = syncService.getQueueStatus().queueLength;
    this.notifyListeners();
  }

  // 检查是否可以执行离线操作
  canPerformOfflineOperation(): boolean {
    return this.state.canWorkOffline;
  }

  // 设置离线工作能力
  setOfflineCapability(enabled: boolean): void {
    this.state.canWorkOffline = enabled;
    this.notifyListeners();
  }

  // 获取离线统计信息
  getOfflineStats() {
    const queueStatus = syncService.getQueueStatus();
    return {
      ...this.state,
      queueStatus,
      errorStats: errorHandler.getErrorStats()
    };
  }

  // 清理资源
  destroy(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    document.removeEventListener('visibilitychange', this.attemptReconnection.bind(this));

    this.listeners.clear();
  }
}

// 创建全局实例
export const offlineManager = OfflineManager.getInstance();

// 注意：React Hook应该在单独的文件中定义以避免循环依赖
// 可以使用以下代码在组件中：
// import { useOfflineState } from './hooks/useOfflineState';