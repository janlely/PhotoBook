import React, { useRef } from 'react';
import { useCanvas } from '../contexts/CanvasContext';
import type { SolidStyle, GradientStyle, ImageStyle } from '../types/backgroundStyle';
import { pagesAPI } from '../api/pages';
import { albumsAPI } from '../api/albums';
import { uploadImage } from '../api/upload';
import BackgroundScopeSelector from './BackgroundScopeSelector';
import ToggleSelector from './ToggleSelector';

const BackgroundSettingsPanel: React.FC = () => {
  const { state, setBackground } = useCanvas();
  const bgImageInputRef = useRef<HTMLInputElement>(null);

  const handleColorChange = async (color: string) => {
    const newBackground: SolidStyle = {
      type: 'solid',
      color
    };
    setBackground(newBackground);

    // Save to backend based on scope and global background setting
    await saveBackgroundToBackend(newBackground);
  };

  const handleImageChange = async (url: string) => {
    const newBackground: ImageStyle = {
      type: 'image',
      url,
      size: 'cover'
    };
    setBackground(newBackground);

    // Save to backend based on scope and global background setting
    await saveBackgroundToBackend(newBackground);
  };

  const handleGradientChange = async (gradient: GradientStyle) => {
    setBackground(gradient);

    // Save to backend based on scope and global background setting
    await saveBackgroundToBackend(gradient);
  };

  const handleBackgroundImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    try {
      // Use backend API to upload image
      const result = await uploadImage(file);
      console.log('Background image uploaded successfully:', result);

      // Set background image URL
      await handleImageChange(result.image.url);
    } catch (error) {
      console.error('Background image upload failed:', error);
      alert('背景图片上传失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      // Reset file input
      if (event.target) event.target.value = '';
    }
  };

  const saveBackgroundToBackend = async (background: any) => {
    try {
      if (state.backgroundScope === 'page' && state.currentPageId) {
        // Save to page - affects only current page
        await pagesAPI.updateBackground(state.currentPageId, background);
        // Update album's global background setting to use page background
        if (state.currentAlbumId) {
          await albumsAPI.updateGlobalBackgroundSetting(state.currentAlbumId, true);
        }
      } else if (state.backgroundScope === 'album' && state.currentAlbumId) {
        // Save to album - affects all pages in the album (global background)
        await albumsAPI.updateBackground(state.currentAlbumId, background);
        // Update album's global background setting to use album background
        await albumsAPI.updateGlobalBackgroundSetting(state.currentAlbumId, false);
      }
    } catch (error) {
      console.error('Failed to save background:', error);
    }
  };

  const renderBackgroundEditor = () => {
    const background = state.background;

    if (background.type === 'solid') {
      // Solid color controls
      return (
        <div className="space-y-4">
          {/* Preset Colors */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              常用颜色
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                '#FFFFFF', '#FCE4EC', '#E3F2FD', '#E8F5E8',
                '#FFF8E1', '#F3E5F5', '#FFF3E0', '#F5F5F5'
              ].map(color => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded border transition-all ${
                    background.color === color
                      ? 'border-blue-500 ring-1 ring-blue-200'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => handleColorChange(color)}
                  title={color}
                >
                  <div
                    className="w-full h-full rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Custom Color Picker */}
          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-gray-700">
              自定义颜色
            </label>
            <input
              type="color"
              value={background.color}
              onChange={(e) => handleColorChange(e.target.value)}
              className="h-6 w-6 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={background.color}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-24 px-2 py-1 text-xs border border-gray-300 rounded"
              placeholder="#FFFFFF"
            />
          </div>
        </div>
      );
    } else if (background.type === 'gradient') {
      // Gradient controls
      return (
        <div className="space-y-4">
          {/* Gradient Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              渐变类型
            </label>
            <select
              value={background.gradientType}
              onChange={async (e) => {
                const newGradient: GradientStyle = {
                  type: 'gradient',
                  gradientType: e.target.value as 'linear' | 'radial',
                  direction: background.direction,
                  stops: background.stops
                };
                await handleGradientChange(newGradient);
              }}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            >
              <option value="linear">线性渐变</option>
              <option value="radial">径向渐变</option>
            </select>
          </div>

          {/* Direction - Only show for linear gradients */}
          {background.gradientType === 'linear' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                方向
              </label>
              <select
                value={background.direction}
                onChange={async (e) => {
                  const newGradient: GradientStyle = {
                    type: 'gradient',
                    gradientType: background.gradientType,
                    direction: e.target.value as GradientStyle['direction'],
                    stops: background.stops
                  };
                  await handleGradientChange(newGradient);
                }}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              >
                <option value="to bottom">向下</option>
                <option value="to top">向上</option>
                <option value="to right">向右</option>
                <option value="to left">向左</option>
                <option value="to bottom right">右下</option>
                <option value="to bottom left">左下</option>
                <option value="to top right">右上</option>
                <option value="to top left">左上</option>
              </select>
            </div>
          )}

          {/* Color Stops */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              颜色停止点
            </label>
            {background.stops.map((stop, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="color"
                  value={stop.color}
                  onChange={async (e) => {
                    const newStops = [...background.stops];
                    newStops[index] = { ...stop, color: e.target.value };
                    const newGradient: GradientStyle = {
                      type: 'gradient',
                      gradientType: background.gradientType,
                      direction: background.direction,
                      stops: newStops
                    };
                    await handleGradientChange(newGradient);
                  }}
                  className="h-6 w-6 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={stop.position}
                  onChange={async (e) => {
                    const newStops = [...background.stops];
                    newStops[index] = { ...stop, position: Number(e.target.value) };
                    const newGradient: GradientStyle = {
                      type: 'gradient',
                      gradientType: background.gradientType,
                      direction: background.direction,
                      stops: newStops
                    };
                    await handleGradientChange(newGradient);
                  }}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 w-8">{stop.position}%</span>
              </div>
            ))}
            <button
              onClick={async () => {
                const newStops = [...background.stops, {
                  color: '#000000',
                  position: 100
                }];
                const newGradient: GradientStyle = {
                  type: 'gradient',
                  gradientType: background.gradientType,
                  direction: background.direction,
                  stops: newStops
                };
                await handleGradientChange(newGradient);
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + 添加颜色停止点
            </button>
          </div>
        </div>
      );
    } else if (background.type === 'image') {
      // Image controls
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              背景图片
            </label>
            <button
              onClick={() => bgImageInputRef.current?.click()}
              className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded border border-gray-300 transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>{background.url ? '更换背景图片' : '上传背景图片'}</span>
            </button>
            {background.url && (
              <button
                onClick={() => handleColorChange('#FFFFFF')}
                className="mt-2 w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 text-sm rounded border border-red-200 transition-colors"
              >
                移除背景图片
              </button>
            )}
          </div>
        </div>
      );
    }

    return null;
  };


  const handleBackgroundTypeChange = async (type: 'solid' | 'gradient' | 'image') => {
    if (type === 'solid') {
      await handleColorChange('#FFFFFF');
    } else if (type === 'gradient') {
      const newGradient: GradientStyle = {
        type: 'gradient',
        gradientType: 'linear',
        direction: 'to bottom',
        stops: [
          { color: '#3B82F6', position: 0 },
          { color: '#8B5CF6', position: 100 }
        ]
      };
      await handleGradientChange(newGradient);
    } else if (type === 'image') {
      await handleImageChange('');
    }
  };


  return (
    <div className="space-y-3">
      {/* Header with title and scope selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">背景设置</h3>
        <BackgroundScopeSelector />
      </div>

      <div className="space-y-4">

        {/* Background Type Selection */}
        <ToggleSelector
          options={[
            { value: 'solid' as const, label: '纯色' },
            { value: 'gradient' as const, label: '渐变' },
            { value: 'image' as const, label: '图片' }
          ]}
          value={state.background.type}
          onChange={handleBackgroundTypeChange}
          fullWidth={true}
          size="sm"
          variant="filled"
          color="primary"
        />

        {/* Background Controls */}
        {renderBackgroundEditor()}
      </div>

      {/* Hidden file input for image upload */}
      <input
        type="file"
        accept="image/*"
        onChange={handleBackgroundImageUpload}
        className="hidden"
        ref={bgImageInputRef}
      />
    </div>
  );
};

export default BackgroundSettingsPanel;
