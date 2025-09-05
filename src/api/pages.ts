import api from './auth';
import type { CanvasElement, Size } from '../contexts/CanvasContext';

export interface Page {
  id: number;
  title: string;
  content: string;
  albumId: number;
  createdAt: string;
  updatedAt: string;
  background?: any; // 页面背景配置
}

export interface PageCanvasData {
  canvasSize: Size;
  elements: CanvasElement[];
  version: number;
  lastModified: string;
}

export const pagesAPI = {
  // 获取相册中的所有页面
  getByAlbum: async (albumId: number): Promise<Page[]> => {
    const response = await api.get(`/pages/album/${albumId}`);
    return response.data;
  },

  // 获取单个页面详情
  getById: async (id: number): Promise<Page> => {
    const response = await api.get(`/pages/${id}`);
    return response.data;
  },

  // 创建新页面
  create: async (title: string, albumId: number, content?: string): Promise<Page> => {
    const response = await api.post('/pages', { title, albumId, content });
    return response.data;
  },

  // 更新页面
  update: async (id: number, title: string, content: string): Promise<Page> => {
    const response = await api.put(`/pages/${id}`, { title, content });
    return response.data;
  },

  // 删除页面
  delete: async (id: number): Promise<void> => {
    await api.delete(`/pages/${id}`);
  },

  // 更新页面画布数据
  updateCanvas: async (pageId: number, canvasData: Omit<PageCanvasData, 'lastModified'>): Promise<{ message: string; lastModified: string }> => {
    const response = await api.put(`/pages/${pageId}/canvas`, canvasData);
    return response.data;
  },

  // 获取页面画布数据
  getCanvas: async (pageId: number): Promise<PageCanvasData> => {
    const response = await api.get(`/pages/${pageId}/canvas`);
    return response.data;
  },

  // 更新页面背景
  updateBackground: async (pageId: number, background: any): Promise<{ message: string }> => {
    const response = await api.put(`/pages/${pageId}/background`, { background });
    return response.data;
  },

  // 获取页面背景
  getBackground: async (pageId: number): Promise<{ background: any }> => {
    const response = await api.get(`/pages/${pageId}/background`);
    return response.data;
  },
};

export default pagesAPI;
