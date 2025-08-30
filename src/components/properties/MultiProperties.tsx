import React from 'react';
import { useCanvas } from '../../contexts/CanvasContext';
import type { CanvasElement } from '../../contexts/CanvasContext';

interface MultiPropertiesProps {
  elements: CanvasElement[];
}

const MultiProperties: React.FC<MultiPropertiesProps> = ({ elements }) => {
  const { updateElement, moveMultipleElements, deleteSelectedElements } = useCanvas();

  const elementIds = elements.map(el => el.id);

  // 批量移动
  const handleBatchMove = (deltaX: number, deltaY: number) => {
    moveMultipleElements(elementIds, { x: deltaX, y: deltaY });
  };

  // 获取元素类型统计
  const getElementTypes = () => {
    const types = elements.reduce((acc, el) => {
      acc[el.type] = (acc[el.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(types).map(([type, count]) => {
      const typeNames = {
        text: '文本',
        image: '图片',
        shape: '形状'
      };
      return `${typeNames[type as keyof typeof typeNames] || type} (${count})`;
    }).join(', ');
  };

  // 计算选中元素的边界框
  const getBoundingBox = () => {
    if (elements.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    elements.forEach(el => {
      const { x, y, width, height } = el.transform;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  };

  const boundingBox = getBoundingBox();

  return (
    <div className="p-4 bg-gray-50 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        多元素属性 ({elements.length} 个元素)
      </h3>
      
      <div className="space-y-3">
        {/* 选中元素信息 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            选中元素
          </label>
          <p className="text-xs text-gray-600">{getElementTypes()}</p>
        </div>

        {/* 整体边界框信息 */}
        {boundingBox && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              整体尺寸
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>宽度: {Math.round(boundingBox.width)}px</div>
              <div>高度: {Math.round(boundingBox.height)}px</div>
              <div>左上角 X: {Math.round(boundingBox.x)}px</div>
              <div>左上角 Y: {Math.round(boundingBox.y)}px</div>
            </div>
          </div>
        )}

        {/* 批量移动 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            批量移动
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleBatchMove(-10, 0)}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              ← 左移 10px
            </button>
            <button
              onClick={() => handleBatchMove(10, 0)}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              右移 10px →
            </button>
            <button
              onClick={() => handleBatchMove(0, -10)}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              ↑ 上移 10px
            </button>
            <button
              onClick={() => handleBatchMove(0, 10)}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              下移 10px ↓
            </button>
          </div>
        </div>

        {/* 对齐操作 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            对齐操作
          </label>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => {
                if (!boundingBox) return;
                const leftmostX = Math.min(...elements.map(el => el.transform.x));
                elements.forEach(el => {
                  if (el.transform.x !== leftmostX) {
                    updateElement(el.id, {
                      transform: { ...el.transform, x: leftmostX }
                    });
                  }
                });
              }}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              左对齐
            </button>
            <button
              onClick={() => {
                if (!boundingBox) return;
                const rightmostX = Math.max(...elements.map(el => el.transform.x + el.transform.width));
                elements.forEach(el => {
                  updateElement(el.id, {
                    transform: { ...el.transform, x: rightmostX - el.transform.width }
                  });
                });
              }}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              右对齐
            </button>
            <button
              onClick={() => {
                if (!boundingBox) return;
                const topmostY = Math.min(...elements.map(el => el.transform.y));
                elements.forEach(el => {
                  if (el.transform.y !== topmostY) {
                    updateElement(el.id, {
                      transform: { ...el.transform, y: topmostY }
                    });
                  }
                });
              }}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              顶端对齐
            </button>
            <button
              onClick={() => {
                if (!boundingBox) return;
                const bottommostY = Math.max(...elements.map(el => el.transform.y + el.transform.height));
                elements.forEach(el => {
                  updateElement(el.id, {
                    transform: { ...el.transform, y: bottommostY - el.transform.height }
                  });
                });
              }}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              底端对齐
            </button>
          </div>
        </div>

        {/* 批量删除 */}
        <div>
          <button
            onClick={deleteSelectedElements}
            className="w-full px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            删除所有选中元素
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiProperties;