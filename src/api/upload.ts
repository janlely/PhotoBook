const API_URL = import.meta.env.VITE_API_URL || '/api';

// 获取认证headers
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// 上传图片
export const uploadImage = async (file: File): Promise<{
  message: string;
  image: {
    id: number;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    sha256: string;
    url: string; // 短链接URL
    shortCode: string; // 短代码
    createdAt: string;
  };
}> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_URL}/upload/image`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || '上传失败');
  }

  return response.json();
};

// 获取用户上传的图片列表
export const getUserImages = async (): Promise<{
  images: Array<{
    id: number;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    sha256: string;
    filePath: string;
    createdAt: string;
  }>;
}> => {
  const response = await fetch(`${API_URL}/upload/images`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '获取图片列表失败');
  }

  return response.json();
};

// 删除图片
export const deleteImage = async (imageId: number): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/upload/image/${imageId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '删除图片失败');
  }

  return response.json();
};

// 获取图片URL（用于显示图片）
export const getImageUrl = (filename: string): string => {
  return `${API_URL}/upload/image/${filename}`;
};