import React, { useState, useEffect } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/20/solid';
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

interface DownloadTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadTasksModal: React.FC<DownloadTasksModalProps> = ({ isOpen, onClose }) => {
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
    if (isOpen) {
      loadTasks();
    }
  }, [isOpen]);

  useEffect(() => {
    // 为进行中的任务启动轮询
    tasks.forEach(task => {
      if ((task.status === 'pending' || task.status === 'processing') && !pollingTasks.has(task.id)) {
        startPolling(task.id);
      }
    });
  }, [tasks, pollingTasks]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">下载任务</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">加载中...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ClockIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>暂无下载任务</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map(task => {
                const statusInfo = getStatusInfo(task.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                        <div>
                          <h3 className="font-medium text-gray-900">{task.album.title}</h3>
                          <p className="text-sm text-gray-500">任务 #{task.id}</p>
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
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                          <span>进度</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>创建时间: {formatTime(task.createdAt)}</span>
                      {task.fileSize && (
                        <span>文件大小: {formatFileSize(task.fileSize)}</span>
                      )}
                    </div>

                    {task.errorMessage && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-700">{task.errorMessage}</p>
                      </div>
                    )}

                    {task.status === 'completed' && (
                      <div className="mt-3">
                        <button
                          onClick={() => handleDownload(task)}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
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
    </div>
  );
};

export default DownloadTasksModal;