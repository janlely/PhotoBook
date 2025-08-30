import React, { useState } from 'react';
import { CanvasProvider } from '../contexts/CanvasContext';
import DragDropCanvas from '../components/DragDropCanvas';
import Toolbox from '../components/Toolbox';
import LayersPanel from '../components/LayersPanel';
import { 
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  Square3Stack3DIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

const CanvasEditorPage: React.FC = () => {
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  return (
    <CanvasProvider>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Canvas Editor</h1>
              <p className="text-gray-600 mt-1">Create and edit your designs with drag & drop</p>
            </div>
            
            {/* Controls */}
            <div className="flex items-center space-x-4">
              {/* Grid Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`p-2 rounded-lg border ${
                    showGrid 
                      ? 'bg-blue-50 border-blue-300 text-blue-600' 
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Toggle Grid"
                >
                  <Square3Stack3DIcon className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  className={`p-2 rounded-lg border ${
                    snapToGrid 
                      ? 'bg-green-50 border-green-300 text-green-600' 
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Snap to Grid"
                >
                  <AdjustmentsHorizontalIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center space-x-1 border border-gray-300 rounded-lg">
                <button
                  onClick={handleZoomOut}
                  className="p-2 hover:bg-gray-50 text-gray-600"
                  title="Zoom Out"
                >
                  <ArrowsPointingInIcon className="w-4 h-4" />
                </button>
                
                <button
                  onClick={handleResetZoom}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 min-w-16"
                  title="Reset Zoom"
                >
                  {Math.round(zoom * 100)}%
                </button>
                
                <button
                  onClick={handleZoomIn}
                  className="p-2 hover:bg-gray-50 text-gray-600"
                  title="Zoom In"
                >
                  <ArrowsPointingOutIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex h-[calc(100vh-80px)]">
          {/* Left Sidebar - Toolbox */}
          <div className="w-80 p-4 bg-gray-50 border-r border-gray-200 overflow-y-auto">
            <Toolbox />
          </div>

          {/* Canvas Area */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="flex justify-center">
              <div className="bg-white p-8 rounded-lg shadow-lg">
                <DragDropCanvas 
                  className="border-2 border-gray-300"
                />
              </div>
            </div>
          </div>

          {/* Right Sidebar - Properties (Placeholder) */}
          <div className="w-80 p-4 bg-gray-50 border-l border-gray-200">
            <div className="bg-white rounded-lg shadow border">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Properties</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Select an element to edit properties
                </p>
              </div>
              <div className="p-4">
                <div className="text-center py-12 text-gray-500">
                  <EyeSlashIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">No element selected</p>
                  <p className="text-xs mt-1">Click on an element to view its properties</p>
                </div>
              </div>
            </div>

            {/* Layers Panel */}
            <LayersPanel className="mt-4" />
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-white border-t border-gray-200 px-6 py-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>Ready</span>
              {showGrid && <span className="text-blue-600">• Grid Visible</span>}
              {snapToGrid && <span className="text-green-600">• Snap to Grid</span>}
            </div>
            <div className="flex items-center space-x-4">
              <span>Zoom: {Math.round(zoom * 100)}%</span>
              <span>Canvas: 800 × 600</span>
            </div>
          </div>
        </div>
      </div>
    </CanvasProvider>
  );
};

export default CanvasEditorPage;