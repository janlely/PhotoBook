export interface PerformanceMetrics {
  memoryUsage: number;
  cacheSize: number;
  renderTime: number;
  apiCallCount: number;
  errorCount: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 100;
  private apiCallCount = 0;
  private errorCount = 0;
  private observers: Set<(metrics: PerformanceMetrics) => void> = new Set();

  private constructor() {
    this.startMonitoring();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private startMonitoring(): void {
    // 延迟5秒开始监控，避免页面加载时的误报
    setTimeout(() => {
      // 每30秒收集一次性能指标
      setInterval(() => {
        this.collectMetrics();
      }, 30000);

      // 监听内存警告
      if ('memory' in performance) {
        // 内存使用过高警告
        this.checkMemoryUsage();
      }
    }, 5000);
  }

  private collectMetrics(): void {
    const metrics: PerformanceMetrics = {
      memoryUsage: this.getMemoryUsage(),
      cacheSize: this.getCacheSize(),
      renderTime: this.getAverageRenderTime(),
      apiCallCount: this.apiCallCount,
      errorCount: this.errorCount,
      timestamp: Date.now()
    };

    this.metrics.push(metrics);

    // 限制指标数量
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // 重置计数器
    this.apiCallCount = 0;
    this.errorCount = 0;

    // 通知观察者
    this.notifyObservers(metrics);

    // 性能警告
    this.checkPerformanceThresholds(metrics);
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private getCacheSize(): number {
    let totalSize = 0;

    // 计算localStorage使用量
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length;
      }
    }

    return totalSize;
  }

  private getAverageRenderTime(): number {
    // 这里可以集成React DevTools Profiler的数据
    // 暂时返回0
    return 0;
  }

  private checkMemoryUsage(): void {
    const memoryUsage = this.getMemoryUsage();
    const memoryLimit = 100 * 1024 * 1024; // 100MB - 提高阈值

    if (memoryUsage > memoryLimit) {
      console.warn('High memory usage detected:', this.formatBytes(memoryUsage));
      this.triggerMemoryCleanup();
    }
  }

  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    const warnings: string[] = [];

    if (metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      warnings.push('High memory usage');
    }

    if (metrics.cacheSize > 5 * 1024 * 1024) { // 5MB
      warnings.push('Large cache size');
    }

    if (metrics.apiCallCount > 50) { // 30秒内超过50次API调用
      warnings.push('High API call frequency');
    }

    if (warnings.length > 0) {
      console.warn('Performance warnings:', warnings);
    }
  }

  private triggerMemoryCleanup(): void {
    // 清理旧的性能指标
    if (this.metrics.length > 10) {
      this.metrics = this.metrics.slice(-10);
    }

    // 触发垃圾回收（如果可用）
    if (window.gc) {
      window.gc();
    }

    // 清理localStorage中的旧数据
    this.cleanupOldCache();
  }

  private cleanupOldCache(): void {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天

    // 清理旧的同步队列
    try {
      const syncQueue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
      const filteredQueue = syncQueue.filter((item: any) => {
        return (now - item.timestamp) < maxAge;
      });

      if (filteredQueue.length !== syncQueue.length) {
        localStorage.setItem('sync_queue', JSON.stringify(filteredQueue));
      }
    } catch (error) {
      console.error('Failed to cleanup sync queue:', error);
    }

    // 清理旧的错误日志
    try {
      const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      const filteredErrors = errors.filter((error: any) => {
        return (now - error.timestamp) < maxAge;
      });

      if (filteredErrors.length !== errors.length) {
        localStorage.setItem('app_errors', JSON.stringify(filteredErrors));
      }
    } catch (error) {
      console.error('Failed to cleanup error logs:', error);
    }
  }

  // API调用计数
  recordApiCall(): void {
    this.apiCallCount++;
  }

  // 错误计数
  recordError(): void {
    this.errorCount++;
  }

  // 订阅性能指标
  subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.observers.add(callback);
    return () => {
      this.observers.delete(callback);
    };
  }

  private notifyObservers(metrics: PerformanceMetrics): void {
    this.observers.forEach(observer => {
      try {
        observer(metrics);
      } catch (error) {
        console.error('Error in performance observer:', error);
      }
    });
  }

  // 获取当前指标
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  // 获取历史指标
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  // 格式化字节数
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 强制清理
  forceCleanup(): void {
    this.triggerMemoryCleanup();
  }
}

// 创建全局实例
export const performanceMonitor = PerformanceMonitor.getInstance();

// 便捷函数
export const recordApiCall = () => performanceMonitor.recordApiCall();
export const recordError = () => performanceMonitor.recordError();