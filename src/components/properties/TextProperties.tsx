import React from 'react';
import { useCanvas } from '../../contexts/CanvasContext';
import type { TextElement } from '../../contexts/CanvasContext';

interface TextPropertiesProps {
  element: TextElement;
}

const TextProperties: React.FC<TextPropertiesProps> = ({ element }) => {
  const { updateElement } = useCanvas();

  const fontFamilies = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Verdana',
    'Tahoma',
    'Courier New',
    'Monaco',
  ];

  const fontWeights = [
    { value: 'normal', label: '正常' },
    { value: 'bold', label: '粗体' },
    { value: 'lighter', label: '细体' },
    { value: 'bolder', label: '超粗' },
  ];

  const textAligns = [
    { value: 'left', label: '左对齐' },
    { value: 'center', label: '居中' },
    { value: 'right', label: '右对齐' },
    { value: 'justify', label: '两端对齐' },
  ];

  return (
    <div className="p-4 bg-gray-50 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">文本属性</h3>
      
      <div className="space-y-3">
        {/* 字体设置 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            字体
          </label>
          <select
            value={element.fontFamily}
            onChange={(e) => updateElement(element.id, { fontFamily: e.target.value })}
            onKeyDown={(e) => e.stopPropagation()} // 阻止事件冒泡
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {fontFamilies.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </div>

        {/* 字号和字重 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              字号
            </label>
            <input
              type="number"
              value={element.fontSize}
              onChange={(e) => updateElement(element.id, { fontSize: Number(e.target.value) })}
              onKeyDown={(e) => e.stopPropagation()} // 阻止事件冒泡
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              min="8"
              max="100"
              step="1"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              字重
            </label>
            <select
              value={element.fontWeight}
              onChange={(e) => updateElement(element.id, { fontWeight: e.target.value as any })}
              onKeyDown={(e) => e.stopPropagation()} // 阻止事件冒泡
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              {fontWeights.map((weight) => (
                <option key={weight.value} value={weight.value}>
                  {weight.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 颜色 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            颜色
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={element.color}
              onChange={(e) => updateElement(element.id, { color: e.target.value })}
              className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={element.color}
              onChange={(e) => updateElement(element.id, { color: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()} // 阻止事件冒泡
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="#000000"
            />
          </div>
        </div>

        {/* 对齐方式 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            对齐方式
          </label>
          <select
            value={element.textAlign}
            onChange={(e) => updateElement(element.id, { textAlign: e.target.value as any })}
            onKeyDown={(e) => e.stopPropagation()} // 阻止事件冒泡
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {textAligns.map((align) => (
              <option key={align.value} value={align.value}>
                {align.label}
              </option>
            ))}
          </select>
        </div>

        {/* 行高 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            行高
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0.8"
              max="3"
              step="0.1"
              value={element.lineHeight}
              onChange={(e) => updateElement(element.id, { lineHeight: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="text-xs text-gray-500 w-8">
              {element.lineHeight.toFixed(1)}
            </span>
          </div>
        </div>

        {/* 尺寸设置 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            文本框尺寸
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">宽度</label>
              <input
                type="text"
                value={Math.round(element.transform.width).toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  // 只允许数字和空字符串
                  if (value === '' || /^\d+$/.test(value)) {
                    const numValue = value === '' ? 10 : parseInt(value, 10);
                    if (numValue >= 10) {
                      updateElement(element.id, {
                        transform: { ...element.transform, width: numValue }
                      });
                    }
                  }
                }}
                onKeyDown={(e) => {
                  e.stopPropagation(); // 阻止事件冒泡
                  // Enter 键也触发 blur 事件
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                min="10"
                placeholder="宽度"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">高度</label>
              <input
                type="text"
                value={Math.round(element.transform.height).toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  // 只允许数字和空字符串
                  if (value === '' || /^\d+$/.test(value)) {
                    const numValue = value === '' ? 10 : parseInt(value, 10);
                    if (numValue >= 10) {
                      updateElement(element.id, {
                        transform: { ...element.transform, height: numValue }
                      });
                    }
                  }
                }}
                onKeyDown={(e) => {
                  e.stopPropagation(); // 阻止事件冒泡
                  // Enter 键也触发 blur 事件
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                min="10"
                placeholder="高度"
              />
            </div>
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

export default TextProperties;