import React, { useState, useEffect } from 'react';
import { useCanvas } from '../../contexts/CanvasContext';
import type { ImageElement } from '../../contexts/CanvasContext';

interface ImagePropertiesProps {
  element: ImageElement;
}

const ImageProperties: React.FC<ImagePropertiesProps> = ({ element }) => {
  const { updateElement } = useCanvas();
  const [width, setWidth] = useState(element.transform.width.toString());
  const [height, setHeight] = useState(element.transform.height.toString());
  const isLocked = element.aspectRatioLocked || false; // 使用元素本身的锁定状态

  // 当元素变化时同步状态
  useEffect(() => {
    setWidth(element.transform.width.toString());
    setHeight(element.transform.height.toString());
  }, [element.transform.width, element.transform.height]);

  // 宽度更新函数（仅更新本地状态）
  const handleWidthChange = (value: string) => {
    // 只允许数字和空字符串
    if (value === '' || /^\d+$/.test(value)) {
      setWidth(value);
    }
  };

  // 高度更新函数（仅更新本地状态）
  const handleHeightChange = (value: string) => {
    // 只允许数字和空字符串
    if (value === '' || /^\d+$/.test(value)) {
      setHeight(value);
    }
  };

  // 宽度失去焦点时更新元素
  const handleWidthBlur = () => {
    const numValue = parseInt(width, 10); // 使用parseInt确保整数
    if (isNaN(numValue) || numValue < 10) {
      // 如果输入无效，恢复原值
      setWidth(Math.round(element.transform.width).toString());
      return;
    }

    const newWidth = numValue;
    
    if (isLocked) {
      // 锁定宽高比时，同时更新高度
      const aspectRatio = element.transform.height / element.transform.width;
      const newHeight = Math.round(newWidth * aspectRatio); // 确保高度也是整数
      setHeight(newHeight.toString());
      
      updateElement(element.id, {
        transform: {
          ...element.transform,
          width: newWidth,
          height: newHeight,
        },
      });
    } else {
      updateElement(element.id, {
        transform: {
          ...element.transform,
          width: newWidth,
        },
      });
    }
  };

  // 高度失去焦点时更新元素
  const handleHeightBlur = () => {
    const numValue = parseInt(height, 10); // 使用parseInt确保整数
    if (isNaN(numValue) || numValue < 10) {
      // 如果输入无效，恢复原值
      setHeight(Math.round(element.transform.height).toString());
      return;
    }

    const newHeight = numValue;
    
    if (isLocked) {
      // 锁定宽高比时，同时更新宽度
      const aspectRatio = element.transform.width / element.transform.height;
      const newWidth = Math.round(newHeight * aspectRatio); // 确保宽度也是整数
      setWidth(newWidth.toString());
      
      updateElement(element.id, {
        transform: {
          ...element.transform,
          width: newWidth,
          height: newHeight,
        },
      });
    } else {
      updateElement(element.id, {
        transform: {
          ...element.transform,
          height: newHeight,
        },
      });
    }
  };

  return (
    <div className="p-4 bg-gray-50 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">图片属性</h3>
      
      {/* 尺寸设置 */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            尺寸
          </label>
          
          {/* 宽度 */}
          <div className="flex items-center space-x-2 mb-2">
            <label className="text-xs text-gray-600 w-8">宽:</label>
            <input
              type="text"
              value={width}
              onChange={(e) => handleWidthChange(e.target.value)}
              onBlur={handleWidthBlur}
              onKeyDown={(e) => {
                e.stopPropagation(); // 阻止事件冒泡，避免触发全局键盘快捷键
                // Enter 键也触发 blur 事件
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="宽度"
            />
            <span className="text-xs text-gray-500">px</span>
          </div>
          
          {/* 高度 */}
          <div className="flex items-center space-x-2">
            <label className="text-xs text-gray-600 w-8">高:</label>
            <input
              type="text"
              value={height}
              onChange={(e) => handleHeightChange(e.target.value)}
              onBlur={handleHeightBlur}
              onKeyDown={(e) => {
                e.stopPropagation(); // 阻止事件冒泡
                // Enter 键也触发 blur 事件
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="高度"
            />
            <span className="text-xs text-gray-500">px</span>
          </div>
          
          {/* 锁定宽高比 */}
          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id="aspect-ratio-lock"
              checked={isLocked}
              onChange={(e) => updateElement(element.id, { aspectRatioLocked: e.target.checked })}
              className="mr-2 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="aspect-ratio-lock" className="text-xs text-gray-700">
              锁定宽高比
            </label>
          </div>
        </div>

        {/* 透明度 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            透明度
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={element.opacity}
              onChange={(e) => updateElement(element.id, { opacity: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="text-xs text-gray-500 w-8">
              {Math.round(element.opacity * 100)}%
            </span>
          </div>
        </div>

        {/* 位置信息（只读） */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            位置
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center space-x-1">
              <label className="text-xs text-gray-600">X:</label>
              <span className="text-xs text-gray-900">
                {Math.round(element.transform.x)}px
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <label className="text-xs text-gray-600">Y:</label>
              <span className="text-xs text-gray-900">
                {Math.round(element.transform.y)}px
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageProperties;