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
    console.log('获取用户的所有相册:', response.data);
    return response.data;
  },

  // 获取单个相册详情
  getById: async (id: number): Promise<Album> => {
    const response = await api.get(`/albums/${id}`);
    return response.data;
  },

  // 创建新相册
  create: async (title: string, parentId?: number): Promise<Album> => {
    const response = await api.post('/albums', { title, parentId });
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

  // 导出相册为PDF
  exportToPDF: async (id: number): Promise<Blob> => {
    const response = await api.get(`/pdf/album/${id}`, {
      responseType: 'blob'
    });
    return response.data;
  },
};

export default albumsAPI;
