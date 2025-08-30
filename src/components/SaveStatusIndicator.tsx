import React from 'react';
import type { SaveStatus } from '../hooks/useAutoSave';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  onRetry?: () => void;
}

const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({ status, onRetry }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'saved':
        return { 
          text: '已保存', 
          color: 'text-green-600', 
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: '✓' 
        };
      case 'saving':
        return { 
          text: '保存中...', 
          color: 'text-blue-600', 
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          icon: '⟳' 
        };
      case 'pending':
        return { 
          text: '待保存', 
          color: 'text-yellow-600', 
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: '●' 
        };
      case 'error':
        return { 
          text: '保存失败', 
          color: 'text-red-600', 
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: '⚠' 
        };
      default:
        return { text: '', color: '', bgColor: '', borderColor: '', icon: '' };
    }
  };

  const { text, color, bgColor, borderColor, icon } = getStatusInfo();

  if (!text) return null;

  return (
    <div className={`flex items-center px-2 py-1 rounded-md border text-xs ${color} ${bgColor} ${borderColor}`}>
      <span className={`mr-1 ${status === 'saving' ? 'animate-spin' : ''}`}>
        {icon}
      </span>
      <span>{text}</span>
      {status === 'error' && onRetry && (
        <button
          onClick={onRetry}
          className="ml-2 text-xs underline hover:no-underline"
        >
          重试
        </button>
      )}
    </div>
  );
};

export default SaveStatusIndicator;