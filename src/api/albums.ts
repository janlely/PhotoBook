import api from './auth';

export interface Album {
  id: number;
  title: string;
  parentId?: number;
  userId: number;
  children: Album[];
  pages: Page[];
  createdAt: string;
  updatedAt: string;
  backgroundColor?: string; // 相册背景色
  backgroundImage?: string; // 相册背景图片URL
}

export interface Page {
  id: number;
  title: string;
  content: string;
  albumId: number;
  createdAt: string;
  updatedAt: string;
  backgroundColor?: string; // 页面背景色
  backgroundImage?: string; // 页面背景图片URL
}

export const albumsAPI = {
  // 获取用户的所有相册
  getAll: async (): Promise<Album[]> => {
    const response = await api.get('/albums');
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
};

export default albumsAPI;
