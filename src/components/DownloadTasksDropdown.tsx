import React, { useState, useEffect } from 'react';
import { ArrowDownTrayIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/20/solid';
import { albumsAPI } from '../api/albums';

interface PdfExportTask {
  id: number;
  status: string;
  progress: number;
  filePath?: string;
  fileSize?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  album: { id: number; title: string };
}

interface DownloadTasksDropdownProps {
  isVisible: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const DownloadTasksDropdown: React.FC<DownloadTasksDropdownProps> = ({
  isVisible,
  onMouseEnter,
  onMouseLeave
}) => {
  const [tasks, setTasks] = useState<PdfExportTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [pollingTasks, setPollingTasks] = useState<Set<number>>(new Set());

  // 加载任务列表
  const loadTasks = async () => {
    try {
      setLoading(true);
      const taskList = await albumsAPI.getPdfExportTasks();
      setTasks(taskList);
    } catch (error) {
      console.error('加载任务列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 轮询任务进度
  const pollTaskProgress = async (taskId: number) => {
    try {
      const progress = await albumsAPI.getPdfExportProgress(taskId);
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, ...progress } : task
        )
      );

      // 如果任务完成或失败，停止轮询
      if (progress.status === 'completed' || progress.status === 'failed') {
        setPollingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
      }
    } catch (error) {
      console.error(`获取任务 ${taskId} 进度失败:`, error);
      setPollingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  // 开始轮询任务
  const startPolling = (taskId: number) => {
    if (pollingTasks.has(taskId)) return;

    setPollingTasks(prev => new Set(prev).add(taskId));

    const poll = () => {
      if (!pollingTasks.has(taskId)) return;
      pollTaskProgress(taskId);
    };

    // 立即执行一次
    poll();

    // 每秒轮询
    const interval = setInterval(poll, 1000);

    // 清理函数
    return () => clearInterval(interval);
  };

  // 下载PDF
  const handleDownload = async (task: PdfExportTask) => {
    try {
      const pdfBlob = await albumsAPI.downloadPdfExport(task.id);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${task.album.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载PDF失败:', error);
      alert('下载失败，请重试');
    }
  };

  // 获取状态图标和颜色
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: ClockIcon, color: 'text-yellow-500', text: '等待中' };
      case 'processing':
        return { icon: ClockIcon, color: 'text-blue-500 animate-spin', text: '处理中' };
      case 'completed':
        return { icon: CheckCircleIcon, color: 'text-green-500', text: '已完成' };
      case 'failed':
        return { icon: ExclamationTriangleIcon, color: 'text-red-500', text: '失败' };
      default:
        return { icon: ClockIcon, color: 'text-gray-500', text: '未知' };
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  useEffect(() => {
    if (isVisible) {
      loadTasks();
    }
  }, [isVisible]);

  useEffect(() => {
    // 为进行中的任务启动轮询
    tasks.forEach(task => {
      if ((task.status === 'pending' || task.status === 'processing') && !pollingTasks.has(task.id)) {
        startPolling(task.id);
      }
    });
  }, [tasks, pollingTasks]);

  if (!isVisible) return null;

  return (
    <div
      className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 transition-all duration-200 ease-out"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">下载任务</h3>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">加载中...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ClockIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">暂无下载任务</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {tasks.map(task => {
              const statusInfo = getStatusInfo(task.status);
              const StatusIcon = statusInfo.icon;

              return (
                <div key={task.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{task.album.title}</h4>
                        <p className="text-xs text-gray-500">任务 #{task.id}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      task.status === 'completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'failed' ? 'bg-red-100 text-red-800' :
                      task.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {statusInfo.text}
                    </span>
                  </div>

                  {task.status === 'processing' && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>进度</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatTime(task.createdAt)}</span>
                    {task.fileSize && (
                      <span>{formatFileSize(task.fileSize)}</span>
                    )}
                  </div>

                  {task.errorMessage && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      {task.errorMessage}
                    </div>
                  )}

                  {task.status === 'completed' && (
                    <div className="mt-2">
                      <button
                        onClick={() => handleDownload(task)}
                        className="w-full flex items-center justify-center px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                      >
                        <ArrowDownTrayIcon className="w-3 h-3 mr-1" />
                        下载PDF
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadTasksDropdown;