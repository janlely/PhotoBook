import React, { useState } from 'react';
import { FaAlignLeft, FaAlignCenter, FaAlignRight, FaAlignJustify } from 'react-icons/fa';
import { Listbox } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';
import { useCanvas } from '../../contexts/CanvasContext';
import type { TextElement } from '../../contexts/CanvasContext';
import { FONT_CONFIG, TEXT_ALIGN_OPTIONS } from '../../config/fonts';
import ToggleSelector from '../ToggleSelector';

interface TextPropertiesProps {
  element: TextElement;
}

const TextProperties: React.FC<TextPropertiesProps> = ({ element }) => {
  const { updateElement } = useCanvas();
  
  // 中英文字体切换状态
  const [isChineseFont, setIsChineseFont] = useState(false);
  
  // 根据切换状态获取当前字体列表
  const currentFonts = isChineseFont ? FONT_CONFIG.chineseFonts : FONT_CONFIG.englishFonts;

  // 图标映射
  const iconMap = {
    FaAlignLeft: FaAlignLeft,
    FaAlignCenter: FaAlignCenter,
    FaAlignRight: FaAlignRight,
    FaAlignJustify: FaAlignJustify,
  };

  const fontWeights = [
    { value: 'normal', label: '正常' },
    { value: 'bold', label: '粗体' },
    { value: 'lighter', label: '细体' },
    { value: 'bolder', label: '超粗' },
  ];

  return (
    <div className="p-4 bg-gray-50 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">文本属性</h3>
      
      <div className="space-y-3">
        {/* 文本对齐 - 第一行显示图标按钮组 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            文本对齐
          </label>
          <div className="flex space-x-1">
            {TEXT_ALIGN_OPTIONS.map((align) => {
              const IconComponent = iconMap[align.iconName];
              return (
                <button
                  key={align.value}
                  onClick={() => updateElement(element.id, { textAlign: align.value })}
                  className={`
                    flex-1 px-2 py-1 text-xs rounded border transition-colors flex items-center justify-center
                    ${
                      element.textAlign === align.value
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }
                  `}
                  title={align.label}
                >
                  <IconComponent className="w-3 h-3" />
                </button>
              );
            })}
          </div>
        </div>
        {/* 字体设置 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-gray-700">
              字体
            </label>
            {/* 中英文切换按钮 */}
            <ToggleSelector
              options={[
                { value: false as const, label: 'En' },
                { value: true as const, label: '中' }
              ]}
              value={isChineseFont}
              onChange={setIsChineseFont}
              size='sm'
            />
          </div>
          
          <Listbox
            value={element.fontFamily}
            onChange={(value) => updateElement(element.id, { fontFamily: value })}
          >
            <div className="relative">
              <Listbox.Button className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-left cursor-pointer">
                <span 
                  className="block truncate" 
                  style={{ fontFamily: element.fontFamily }}
                >
                  {element.fontFamily}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon className="h-3 w-3 text-gray-400" aria-hidden="true" />
                </span>
              </Listbox.Button>
              
              <Listbox.Options className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md bg-white py-1 text-xs shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                {currentFonts.map((font) => (
                  <Listbox.Option
                    key={font.name}
                    value={font.name}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-1 px-2 ${
                        active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                      }`
                    }
                  >
                    {() => (
                      <>
                        <span
                          className={`block truncate font-normal`}
                          style={{ fontFamily: font.name }}
                        >
                          {font.displayName}
                        </span>
                        {element.fontFamily === font.name && (
                          <span className="absolute inset-y-0 right-0 flex items-center pr-2 text-blue-600">
                            <CheckIcon className="h-3 w-3" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
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

        {/* 颜色和边框 */}
        <div className="grid grid-cols-1 gap-2">
          {/* 文字颜色 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              文字颜色
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
          
          {/* 文字边框 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              文字边框
            </label>
            <div className="space-y-2">
              {/* 边框开关和粗细 */}
              <div className="flex items-center space-x-2">
                <label className="flex items-center text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={!!(element as any).textStroke?.enabled}
                    onChange={(e) => {
                      const currentStroke = (element as any).textStroke || { enabled: false, width: 1, color: '#000000' };
                      updateElement(element.id, { 
                        textStroke: { 
                          ...currentStroke, 
                          enabled: e.target.checked 
                        } 
                      });
                    }}
                    className="mr-1"
                  />
                  启用边框
                </label>
                {(element as any).textStroke?.enabled && (
                  <>
                    <span className="text-xs text-gray-600">粗细:</span>
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={(element as any).textStroke?.width || 1}
                      onChange={(e) => {
                        const currentStroke = (element as any).textStroke || { enabled: true, width: 1, color: '#000000' };
                        updateElement(element.id, { 
                          textStroke: { 
                            ...currentStroke, 
                            width: Number(e.target.value) 
                          } 
                        });
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-500 w-8">
                      {(element as any).textStroke?.width || 1}px
                    </span>
                  </>
                )}
              </div>
              
              {/* 边框颜色 */}
              {(element as any).textStroke?.enabled && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-600">颜色:</span>
                  <input
                    type="color"
                    value={(element as any).textStroke?.color || '#000000'}
                    onChange={(e) => {
                      const currentStroke = (element as any).textStroke || { enabled: true, width: 1, color: '#000000' };
                      updateElement(element.id, { 
                        textStroke: { 
                          ...currentStroke, 
                          color: e.target.value 
                        } 
                      });
                    }}
                    className="w-6 h-5 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={(element as any).textStroke?.color || '#000000'}
                    onChange={(e) => {
                      const currentStroke = (element as any).textStroke || { enabled: true, width: 1, color: '#000000' };
                      updateElement(element.id, { 
                        textStroke: { 
                          ...currentStroke, 
                          color: e.target.value 
                        } 
                      });
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="#000000"
                  />
                </div>
              )}
            </div>
          </div>
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