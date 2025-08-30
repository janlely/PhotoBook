import React from 'react';
import { useCanvas } from '../contexts/CanvasContext';
import type { CanvasElement, TextElement, ImageElement } from '../contexts/CanvasContext';
import ImageProperties from './properties/ImageProperties';
import TextProperties from './properties/TextProperties';
import MultiProperties from './properties/MultiProperties';

const PropertiesPanel: React.FC = () => {
  const { getSelectedElements } = useCanvas();
  const selectedElements = getSelectedElements();

  if (selectedElements.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">属性</h3>
        <p className="text-xs text-gray-500">选择一个元素以编辑其属性</p>
      </div>
    );
  }

  // 单个元素选中
  if (selectedElements.length === 1) {
    const element = selectedElements[0];
    
    switch (element.type) {
      case 'image':
        return <ImageProperties element={element as ImageElement} />;
      case 'text':
        return <TextProperties element={element as TextElement} />;
      default:
        return (
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">属性</h3>
            <p className="text-xs text-gray-500">暂不支持该元素类型的属性编辑</p>
          </div>
        );
    }
  }

  // 多个元素选中
  return <MultiProperties elements={selectedElements} />;
};

export default PropertiesPanel;