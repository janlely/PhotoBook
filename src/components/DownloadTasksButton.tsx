import React from 'react';
import { CloudIcon } from '@heroicons/react/20/solid';

interface DownloadTasksButtonProps {
  onClick: () => void;
  hasActiveTasks?: boolean;
  className?: string;
}

export const DownloadTasksButton: React.FC<DownloadTasksButtonProps> = ({
  onClick,
  hasActiveTasks = false,
  className
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 transition-colors relative ${className || ''}`}
      title="下载任务"
    >
      <div className="relative">
        <CloudIcon className="w-5 h-5 text-gray-600 hover:text-blue-600" />
        {hasActiveTasks && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        )}
      </div>
      <span className="text-sm text-gray-700 hidden sm:inline">下载任务</span>
    </button>
  );
};

export default DownloadTasksButton;