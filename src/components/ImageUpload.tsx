import React, { useState, useRef } from 'react';
import { uploadImage } from '../api/upload';
import useStore from '../store/useStore';

// 图片接口定义（如果需要可以保留用于类型定义）

const ImageUpload: React.FC<{}> = () => {
  // 使用Zustand store
  const {
    images: storeImages,
    fetchImages
  } = useStore();

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 从store获取图片数据
  const uploadedImages = storeImages.data;

  // 处理文件选择和上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过10MB');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await uploadImage(file);
      setSuccess(`图片上传成功: ${result.image.originalName}`);

      // 刷新图片列表 - 使用store方法
      await fetchImages(true);

      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('上传失败:', err);
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 加载图片列表 - 现在使用store方法
  const loadImages = async (force = false) => {
    await fetchImages(force);
  };

  // 删除图片 - 暂时保留原有逻辑，因为store中还没有实现图片删除
  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('确定要删除这张图片吗？')) return;

    try {
      const { deleteImage } = await import('../api/upload');
      await deleteImage(imageId);
      setSuccess('图片删除成功');
      await loadImages(true); // 强制刷新
    } catch (err) {
      console.error('删除失败:', err);
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 组件挂载时加载图片列表
  React.useEffect(() => {
    loadImages();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">图片上传管理</h2>
      
      {/* 上传区域 */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mb-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="mt-2 block text-sm font-medium text-gray-900">
                点击选择图片文件
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                支持 PNG, JPG, GIF 等格式，最大 10MB
              </span>
            </label>
            <input
              id="file-upload"
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </div>
          {uploading && (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">上传中...</span>
            </div>
          )}
        </div>
      </div>

      {/* 错误和成功消息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* 图片列表 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">已上传的图片</h3>
          <button
            onClick={() => loadImages(true)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            刷新列表
          </button>
        </div>
        
        {uploadedImages.length === 0 ? (
          <p className="text-gray-500 text-center py-8">还没有上传任何图片</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {uploadedImages.map((image) => (
              <div
                key={image.id}
                className="bg-white border rounded-lg p-4 shadow-sm"
              >
                <div className="aspect-w-16 aspect-h-9 mb-3">
                  <img
                    src={image.filePath}
                    alt={image.originalName}
                    className="w-full h-48 object-cover rounded"
                  />
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm truncate">
                    {image.originalName}
                  </h4>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>大小: {formatFileSize(image.size)}</p>
                    <p>SHA256: {image.sha256.substring(0, 16)}...</p>
                    <p>上传时间: {new Date(image.createdAt).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="w-full px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;