import React from 'react';
import { useCanvas } from '../contexts/CanvasContext';

const CanvasSettingsPanel: React.FC = () => {
  const { 
    state, 
    toggleGrid, 
    toggleSnapToGrid, 
    setGridSize,
    setZoom
  } = useCanvas();

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">画布设置</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700">显示网格</label>
          <button
            onClick={toggleGrid}
            className={`relative inline-flex h-6 w-11 items-center rounded-full ${
              state.isGridVisible ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                state.isGridVisible ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700">吸附到网格</label>
          <button
            onClick={toggleSnapToGrid}
            className={`relative inline-flex h-6 w-11 items-center rounded-full ${
              state.isSnapToGrid ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                state.isSnapToGrid ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-700">
            网格大小: {state.gridSize}px
          </label>
          <input
            type="range"
            min="5"
            max="50"
            value={state.gridSize}
            onChange={(e) => setGridSize(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-700">
            缩放: {Math.round(state.zoom * 100)}%
          </label>
          <input
            type="range"
            min="10"
            max="200"
            value={state.zoom * 100}
            onChange={(e) => setZoom(Number(e.target.value) / 100)}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

export default CanvasSettingsPanel;
