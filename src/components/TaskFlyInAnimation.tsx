import React, { useEffect, useState } from 'react';
import { DocumentIcon } from '@heroicons/react/20/solid';

interface TaskFlyInAnimationProps {
  isVisible: boolean;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  onAnimationComplete: () => void;
  albumTitle: string;
}

export const TaskFlyInAnimation: React.FC<TaskFlyInAnimationProps> = ({
  isVisible,
  startPosition,
  endPosition,
  onAnimationComplete,
  albumTitle
}) => {
  const [currentPosition, setCurrentPosition] = useState(startPosition);
  const [opacity, setOpacity] = useState(0);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    if (!isVisible) {
      setOpacity(0);
      setScale(0.5);
      return;
    }

    // 动画开始
    setCurrentPosition(startPosition);
    setOpacity(1);
    setScale(1);

    // 计算动画路径
    const deltaX = endPosition.x - startPosition.x;
    const deltaY = endPosition.y - startPosition.y;

    // 使用贝塞尔曲线创建更自然的动画路径
    const duration = 800; // 800ms 动画时长
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 使用 ease-out 缓动函数
      const easeOutProgress = 1 - Math.pow(1 - progress, 3);

      // 计算当前位置
      const currentX = startPosition.x + deltaX * easeOutProgress;
      const currentY = startPosition.y + deltaY * easeOutProgress;

      // 添加轻微的弧形路径（抛物线效果）
      const arcOffset = Math.sin(progress * Math.PI) * 20;
      const finalY = currentY - arcOffset;

      setCurrentPosition({ x: currentX, y: finalY });

      // 缩放动画
      const currentScale = 1 + Math.sin(progress * Math.PI) * 0.2;
      setScale(currentScale);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 动画完成
        setTimeout(() => {
          setOpacity(0);
          setScale(0.8);
          onAnimationComplete();
        }, 200);
      }
    };

    // 延迟开始动画，让用户看到初始状态
    setTimeout(() => {
      requestAnimationFrame(animate);
    }, 100);

  }, [isVisible, startPosition, endPosition, onAnimationComplete]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: currentPosition.x,
        top: currentPosition.y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity: opacity,
        transition: 'none'
      }}
    >
      <div className="bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 min-w-max">
        <DocumentIcon className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium truncate max-w-32" title={albumTitle}>
          {albumTitle}
        </span>
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
      </div>
    </div>
  );
};

export default TaskFlyInAnimation;