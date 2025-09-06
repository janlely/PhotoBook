export interface ErrorInfo {
  id: string;
  message: string;
  stack?: string;
  timestamp: number;
  context?: Record<string, any>;
  userId?: string;
  userAgent: string;
  url: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errors: ErrorInfo[] = [];
  private maxErrors = 100; // 最多保存100个错误记录

  private constructor() {
    // 监听全局错误
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // 处理全局错误
  private handleGlobalError(event: ErrorEvent): void {
    this.captureError({
      message: event.message,
      stack: event.error?.stack,
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    });
  }

  // 处理未处理的Promise拒绝
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const message = event.reason?.message || 'Unhandled Promise Rejection';
    this.captureError({
      message,
      stack: event.reason?.stack,
      context: {
        reason: event.reason
      }
    });
  }

  // 捕获错误
  captureError(error: Partial<ErrorInfo> & { message: string }): void {
    const errorInfo: ErrorInfo = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      context: error.context || {},
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...error
    };

    this.errors.push(errorInfo);

    // 限制错误数量
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // 在开发环境下打印错误
    if (process.env.NODE_ENV === 'development') {
      console.error('Captured error:', errorInfo);
    }

    // 可以在这里添加错误上报逻辑
    this.reportError(errorInfo);
  }

  // 上报错误（可以发送到监控服务）
  private reportError(error: ErrorInfo): void {
    // 这里可以集成错误监控服务，如Sentry、LogRocket等
    // 暂时只存储在本地
    try {
      const existingErrors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      existingErrors.push(error);
      // 只保留最近的50个错误
      const recentErrors = existingErrors.slice(-50);
      localStorage.setItem('app_errors', JSON.stringify(recentErrors));
    } catch (e) {
      console.error('Failed to save error to localStorage:', e);
    }
  }

  // 获取错误列表
  getErrors(): ErrorInfo[] {
    return [...this.errors];
  }

  // 清空错误列表
  clearErrors(): void {
    this.errors = [];
  }

  // 获取错误统计
  getErrorStats(): {
    total: number;
    recent: number; // 最近1小时的错误
    byType: Record<string, number>;
  } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const recentErrors = this.errors.filter(e => e.timestamp > oneHourAgo);
    const byType: Record<string, number> = {};

    this.errors.forEach(error => {
      const type = error.context?.type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });

    return {
      total: this.errors.length,
      recent: recentErrors.length,
      byType
    };
  }
}

// 创建全局错误处理实例
export const errorHandler = ErrorHandler.getInstance();

// 便捷的错误捕获函数
export const captureError = (error: Partial<ErrorInfo> & { message: string }) => {
  errorHandler.captureError(error);
};

// 异步函数错误包装器
export const withErrorHandler = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: Record<string, any>
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError({
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        context: {
          function: fn.name,
          args: args.length,
          ...context
        }
      });
      throw error;
    }
  };
};