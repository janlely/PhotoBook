import React, { useState, useRef, useEffect } from 'react';
import { CloudIcon } from '@heroicons/react/20/solid';
import DownloadTasksDropdown from './DownloadTasksDropdown';

interface DownloadTasksButtonProps {
  hasActiveTasks?: boolean;
  className?: string;
}

export const DownloadTasksButton: React.FC<DownloadTasksButtonProps> = ({
  hasActiveTasks = false,
  className
}) => {
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [hasActiveTasksState, setHasActiveTasksState] = useState(hasActiveTasks);
  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 检查是否有活跃任务
  const checkActiveTasks = async () => {
    try {
      const { albumsAPI } = await import('../api/albums');
      const tasks = await albumsAPI.getPdfExportTasks();
      const hasActive = tasks.some(task =>
        task.status === 'pending' || task.status === 'processing'
      );
      setHasActiveTasksState(hasActive);
    } catch (error) {
      console.error('检查活跃任务失败:', error);
    }
  };

  // 显示下拉框
  const showDropdown = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsDropdownVisible(true);
  };

  // 隐藏下拉框
  const hideDropdown = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsDropdownVisible(false);
    }, 150); // 短暂延迟，避免鼠标快速移动时的闪烁
  };

  // 处理鼠标进入
  const handleMouseEnter = () => {
    showDropdown();
  };

  // 处理鼠标离开
  const handleMouseLeave = () => {
    hideDropdown();
  };

  // 处理下拉框鼠标进入
  const handleDropdownMouseEnter = () => {
    showDropdown();
  };

  // 处理下拉框鼠标离开
  const handleDropdownMouseLeave = () => {
    hideDropdown();
  };

  // 组件挂载时检查活跃任务
  useEffect(() => {
    checkActiveTasks();
    // 定期检查活跃任务状态
    const interval = setInterval(checkActiveTasks, 5000); // 每5秒检查一次
    return () => clearInterval(interval);
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={buttonRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={`flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 transition-colors ${className || ''}`}
        title="下载任务"
      >
        <div className="relative">
          <CloudIcon className="w-5 h-5 text-gray-600 hover:text-blue-600" />
          {hasActiveTasksState && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          )}
        </div>
        <span className="text-sm text-gray-700 hidden sm:inline">下载任务</span>
      </button>

      <div ref={dropdownRef}>
        <DownloadTasksDropdown
          isVisible={isDropdownVisible}
          onMouseEnter={handleDropdownMouseEnter}
          onMouseLeave={handleDropdownMouseLeave}
        />
      </div>
    </div>
  );
};

export default DownloadTasksButton;