import React from 'react';
import { useCanvas } from '../contexts/CanvasContext';

const BackgroundScopeSelector: React.FC = () => {
  const { state, setBackgroundScope } = useCanvas();
  
  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        背景应用范围
      </label>
      <div className="flex space-x-2">
        <button
          className={`px-3 py-1 text-sm rounded ${
            state.backgroundScope === 'page' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700'
          }`}
          onClick={() => setBackgroundScope('page')}
        >
          仅当前页面
        </button>
        <button
          className={`px-3 py-1 text-sm rounded ${
            state.backgroundScope === 'album' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700'
          }`}
          onClick={() => setBackgroundScope('album')}
        >
          整个相册
        </button>
      </div>
    </div>
  );
};

export default BackgroundScopeSelector;
