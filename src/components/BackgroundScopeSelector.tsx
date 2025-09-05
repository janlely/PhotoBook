import React from 'react';
import { useCanvas } from '../contexts/CanvasContext';
import ToggleSelector from './ToggleSelector';

const BackgroundScopeSelector: React.FC = () => {
  const { state, setBackgroundScope } = useCanvas();

  const options = [
    { value: 'page' as const, label: '页面' },
    { value: 'album' as const, label: '相册' }
  ];

  return (
    <div className="flex items-center space-x-2">
      <span className="text-xs text-gray-600">范围:</span>
      <ToggleSelector
        options={options}
        value={state.backgroundScope}
        onChange={setBackgroundScope}
        size="sm"
      />
    </div>
  );
};

export default BackgroundScopeSelector;
