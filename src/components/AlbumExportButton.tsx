import React, { useState } from 'react';
import { albumsAPI } from '../api/albums';

interface AlbumExportButtonProps {
  albumId: number;
  albumTitle: string;
  className?: string;
  iconOnly?: boolean;
  onTaskCreated?: (taskId: number) => void;
}

export const AlbumExportButton: React.FC<AlbumExportButtonProps> = ({
  albumId,
  albumTitle: _albumTitle,
  className,
  iconOnly,
  onTaskCreated
}) => {
  const [isCreating, setIsCreating] = useState(false);

  const handleExport = async () => {
    if (!albumId) return;

    setIsCreating(true);

    try {
      // 创建PDF导出任务
      const result = await albumsAPI.createPdfExportTask(albumId);

      // 通知父组件任务已创建
      if (onTaskCreated) {
        onTaskCreated(result.taskId);
      }

      // 显示成功消息
      alert(`PDF导出任务已创建！任务ID: ${result.taskId}\n请查看下载任务列表获取进度和下载链接。`);

    } catch (error) {
      console.error('创建导出任务失败:', error);
      alert('创建导出任务失败，请重试');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      {iconOnly ? (
        <button
          onClick={handleExport}
          disabled={isCreating || !albumId}
          className={`p-1 rounded hover:bg-gray-200 transition-colors ${className || ''}`}
          title="导出相册为PDF"
        >
          {isCreating ? (
            <svg className="animate-spin h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="h-4 w-4 text-gray-600 hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
        </button>
      ) : (
        <button
          onClick={handleExport}
          disabled={isCreating || !albumId}
          className={`flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className || ''}`}
          title="将相册导出为PDF文件"
        >
          {isCreating ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              创建任务中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              导出PDF
            </>
          )}
        </button>
      )}
    </>
  );
};

export default AlbumExportButton;
