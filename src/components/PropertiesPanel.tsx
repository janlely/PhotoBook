import React from 'react';
import { useCanvas } from '../contexts/CanvasContext';
import type { TextElement, ImageElement } from '../contexts/CanvasContext';
import ImageProperties from './properties/ImageProperties';
import TextProperties from './properties/TextProperties';
import MultiProperties from './properties/MultiProperties';

const PropertiesPanel: React.FC = () => {
  const { getSelectedElements } = useCanvas();
  const selectedElements = getSelectedElements();

  // 根据选中元素生成属性内容
  const renderPropertiesContent = () => {
    if (selectedElements.length === 0) {
      return (
        <div className="p-4">
          <p className="text-sm text-gray-500">选择一个元素以编辑其属性</p>
        </div>
      );
    }

    if (selectedElements.length === 1) {
      const element = selectedElements[0];
      switch (element.type) {
        case 'image':
          return <ImageProperties element={element as ImageElement} />;
        case 'text':
          return <TextProperties element={element as TextElement} />;
        default:
          return (
            <div className="p-4">
              <p className="text-sm text-gray-500">暂不支持该元素类型的属性编辑</p>
            </div>
          );
      }
    }

    return <MultiProperties elements={selectedElements} />;
  };

  return (
    <div className="w-64 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        {renderPropertiesContent()}
      </div>
    </div>
  );
};

export default PropertiesPanel;
