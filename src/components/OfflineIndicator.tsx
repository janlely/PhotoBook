import React from 'react';
import { useOfflineState } from '../hooks/useOfflineState';
import { WifiIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const OfflineIndicator: React.FC = () => {
  const { isOnline, isReconnecting, pendingSyncCount } = useOfflineState();

  if (isOnline && pendingSyncCount === 0) {
    return null; // 完全在线且无待同步数据，不显示指示器
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg transition-all duration-300 ${
      isOnline
        ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
        : 'bg-red-50 border border-red-200 text-red-800'
    }`}>
      <div className="flex items-center space-x-2">
        {isReconnecting ? (
          <ArrowPathIcon className="w-4 h-4 animate-spin" />
        ) : isOnline ? (
          <WifiIcon className="w-4 h-4" />
        ) : (
          <ExclamationTriangleIcon className="w-4 h-4" />
        )}

        <span className="text-sm font-medium">
          {isReconnecting
            ? '重新连接中...'
            : isOnline
              ? `有 ${pendingSyncCount} 个变更待同步`
              : '离线模式'
          }
        </span>
      </div>

      {pendingSyncCount > 0 && (
        <div className="flex items-center space-x-1 text-xs">
          <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded">
            {pendingSyncCount}
          </span>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;