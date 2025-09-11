import api from './auth';
import type { Page } from './pages';

export interface Album {
  id: number;
  title: string;
  parentId?: number;
  userId: number;
  children: Album[];
  pages: Page[];
  createdAt: string;
  updatedAt: string;
  background?: any; // 统一背景配置
  isUseGlobalBackground?: boolean; // 是否使用全局背景设置
}

export const albumsAPI = {
  // 获取用户的所有相册
  getAll: async (): Promise<Album[]> => {
    const response = await api.get('/albums');
    // console.log('获取用户的所有相册:', response.data);
    return response.data;
  },

  // 获取单个相册详情
  getById: async (id: number): Promise<Album> => {
    const response = await api.get(`/albums/${id}`);
    return response.data;
  },

  // 创建新相册
  create: async (title: string, parentId?: number): Promise<Album> => {
    console.log('🔄 API: 创建相册开始', { title, parentId, timestamp: Date.now() });
    const response = await api.post('/albums', { title, parentId });
    console.log('✅ API: 创建相册成功', { albumId: response.data.id, timestamp: Date.now() });
    return response.data;
  },

  // 更新相册
  update: async (id: number, title: string, parentId?: number): Promise<Album> => {
    const response = await api.put(`/albums/${id}`, { title, parentId });
    return response.data;
  },

  // 删除相册
  delete: async (id: number): Promise<void> => {
    await api.delete(`/albums/${id}`);
  },

  // 获取相册背景
  getBackground: async (id: number): Promise<{ background: any; isUseGlobalBackground: boolean }> => {
    const response = await api.get(`/albums/${id}/background`);
    return response.data;
  },

  // 更新相册背景
  updateBackground: async (id: number, background: any): Promise<{ message: string; background: any }> => {
    const response = await api.put(`/albums/${id}/background`, { background });
    return response.data;
  },

  // 更新相册全局背景设置
  updateGlobalBackgroundSetting: async (id: number, isUseGlobalBackground: boolean): Promise<{ message: string; isUseGlobalBackground: boolean }> => {
    const response = await api.put(`/albums/${id}/global-background`, { isUseGlobalBackground });
    return response.data;
  },

  // 创建PDF导出任务
  createPdfExportTask: async (id: number): Promise<{ taskId: number; message: string }> => {
    const response = await api.post('/pdf/tasks', { albumId: id });
    return response.data;
  },

  // 获取PDF导出任务进度
  getPdfExportProgress: async (taskId: number): Promise<{
    taskId: number;
    status: string;
    progress: number;
    createdAt: string;
    updatedAt: string;
    errorMessage?: string;
  }> => {
    const response = await api.get(`/pdf/tasks/${taskId}/progress`);
    return response.data;
  },

  // 下载完成的PDF
  downloadPdfExport: async (taskId: number): Promise<Blob> => {
    const response = await api.get(`/pdf/tasks/${taskId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // 获取用户的所有PDF导出任务
  getPdfExportTasks: async (): Promise<Array<{
    id: number;
    status: string;
    progress: number;
    filePath?: string;
    fileSize?: number;
    errorMessage?: string;
    createdAt: string;
    updatedAt: string;
    album: { id: number; title: string };
  }>> => {
    const response = await api.get('/pdf/tasks');
    return response.data;
  },

  // 保留原有方法用于向后兼容（已废弃）
  exportToPDF: async (_id: number): Promise<Blob> => {
    throw new Error('此方法已废弃，请使用 createPdfExportTask 创建异步导出任务');
  },
};

export default albumsAPI;
