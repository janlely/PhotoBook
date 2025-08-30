import api from './auth';

export interface Page {
  id: number;
  title: string;
  content: string;
  albumId: number;
  createdAt: string;
  updatedAt: string;
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
};

export default pagesAPI;
