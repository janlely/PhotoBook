import React, { useState, useEffect, useRef } from 'react';
import { CanvasProvider, useCanvas } from '../contexts/CanvasContext';
import { useDrag } from 'react-dnd';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import AlbumTree from '../components/AlbumTree';
import DragDropCanvas from '../components/DragDropCanvas';
import PropertiesPanel from '../components/PropertiesPanel';
import type { Album, Page } from '../api/albums';
import { albumsAPI } from '../api/albums';
import { pagesAPI } from '../api/pages';
import { uploadImage } from '../api/upload';
import { DocumentTextIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { ItemTypes } from '../types/dnd';
import type { ToolDragItem } from '../types/dnd';
import type { CanvasElement, ImageElement } from '../contexts/CanvasContext';

// 自定义缩放控件组件
const ZoomControl: React.FC<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(Math.round(value * 100).toString());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const zoomOptions = [25, 50, 75, 100, 125, 150, 200, 300];

  // 同步外部值变化到输入框
  useEffect(() => {
    setInputValue(Math.round(value * 100).toString());
  }, [value]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace('%', '');
    setInputValue(newValue);
  };

  const handleInputBlur = () => {
    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue) && numValue >= 10 && numValue <= 500) {
      onChange(numValue / 100);
    } else {
      // 恢复到当前值
      setInputValue(Math.round(value * 100).toString());
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      inputRef.current?.blur();
    }
  };

  const handleOptionSelect = (optionValue: number) => {
    onChange(optionValue / 100);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex border border-gray-300 rounded-md overflow-hidden">
        {/* 输入区域 */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue + '%'}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          className="w-16 px-2 py-1 text-sm text-center border-none bg-white"
          style={{ outline: 'none', boxShadow: 'none' }}
        />
        {/* 下拉箭头按钮 */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-1 bg-white hover:bg-gray-50 border-l border-gray-300 flex items-center justify-center"
        >
          <ChevronDownIcon className="h-3 w-3 text-gray-400" />
        </button>
      </div>
      
      {/* 下拉选项 */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="py-1">
            {zoomOptions.map((option) => (
              <button
                key={option}
                onClick={() => handleOptionSelect(option)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-600"
              >
                {option}%
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
const DraggableToolElement: React.FC<{
  type: string;
  toolType: 'image' | 'text';
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ type, toolType, icon, title, description }) => {
  const [{ isDragging }, drag] = useDrag({
    type,
    item: {
      type,
      toolType,
      defaultProps: {},
    } as ToolDragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag as any}
      className={`p-2.5 border-2 border-dashed rounded-lg cursor-grab transition-all ${
        isDragging
          ? 'opacity-50 bg-blue-50 border-blue-400 transform scale-95'
          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center space-x-2">
        {icon}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium truncate ${
            isDragging ? 'text-blue-600' : 'text-gray-900'
          }`}>{title}</div>
          <div className="text-xs text-gray-500 truncate">{description}</div>
        </div>
      </div>
    </div>
  );
};

// 画布内容组件 - 在CanvasProvider内部，可以访问canvas context
const CanvasContent: React.FC<{
  selectedPage: Page | null;
  selectedAlbum: Album | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  currentImageElementRef: React.RefObject<string | null>;
  onElementDoubleClick: (element: CanvasElement) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ 
  selectedPage, 
  selectedAlbum, 
  fileInputRef,
  currentImageElementRef,
  onElementDoubleClick,
  onImageUpload
}) => {
  const { updateElement, getElementById, state, calculateOptimalDisplayScale, setDisplayScale, setZoom, toggleGrid } = useCanvas();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  // 监控容器尺寸变化
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        console.log('📄 画布容器尺寸变化:', {
          新尺寸: { width, height },
          当前状态: {
            canvasSize: state.canvasSize,
            displayScale: state.displayScale,
            zoom: state.zoom
          }
        });
      }
    });
    
    resizeObserver.observe(container);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [state.canvasSize, state.displayScale, state.zoom]);
  
  // 处理图片上传
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    // 先调用父组件的处理函数来重置文件输入
    onImageUpload(event);
    
    // 检查是否有文件和当前元素ID
    if (!file || !file.type.startsWith('image/') || !currentImageElementRef.current) {
      console.log('上传被取消：', { file: !!file, isImage: file?.type.startsWith('image/'), elementId: currentImageElementRef.current });
      return;
    }
    
    // 保存当前元素ID
    const targetElementId = currentImageElementRef.current;
    
    try {
      console.log('开始上传图片:', file.name, '用于元素:', targetElementId);
      
      // 调用后台图片上传 API
      const result = await uploadImage(file);
      console.log('图片上传成功:', result);
      
      // 使用返回的图片URL更新元素
      const imageUrl = result.image.url; // 使用短链接URL
      updateElement(targetElementId, { 
        src: imageUrl,
        alt: result.image.originalName 
      });
      console.log('图片元素已更新:', targetElementId, imageUrl);
      
    } catch (error) {
      console.error('图片上传失败:', error);
      alert('图片上传失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      // 清理引用
      currentImageElementRef.current = null;
    }
  };
  

  
  return (
    <>
      {/* 画布头部 - 包含缩放控件 */}
      <div className="border-b border-gray-200 px-6 py-3 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedPage ? selectedPage.title : '画布编辑器'}
            </h2>
            <p className="text-sm text-gray-600">
              {selectedPage ? `相册: ${selectedAlbum?.title}` : '请选择页面开始编辑'}
            </p>
          </div>
          
          {/* 缩放控件 */}
          <div className="flex items-center space-x-4">
            {/* 缩放比例选择器 - 使用自定义组件 */}
            <ZoomControl
              value={state.zoom}
              onChange={setZoom}
            />
            
            {/* 网格显隐开关 */}
            <button
              onClick={toggleGrid}
              className={`flex items-center px-3 py-1 rounded-md border transition-colors ${
                state.isGridVisible
                  ? 'bg-blue-50 border-blue-300 text-blue-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
              title={state.isGridVisible ? '隐藏网格' : '显示网格'}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span className="text-sm">
                网格
              </span>
            </button>
          </div>
        </div>
      </div>
      
      {/* 画布区域 - 固定大小，支持滚动 */}
      <div 
        ref={canvasContainerRef}
        className="flex-1 bg-gray-200 relative"
        style={{
          minHeight: '400px',
          overflow: 'hidden', // 隐藏原生滚动条，使用自定义滚动
        }}
      >
        {/* 内部滚动容器 */}
        <div 
          className="absolute inset-0 overflow-auto"
          style={{
            // 使用transform来创建独立的滚动环境
            transform: 'translate3d(0, 0, 0)',
          }}
          onScroll={(e) => {
            console.log('🔄 画布容器滚动事件:', {
              scrollLeft: e.currentTarget.scrollLeft,
              scrollTop: e.currentTarget.scrollTop,
              scrollWidth: e.currentTarget.scrollWidth,
              scrollHeight: e.currentTarget.scrollHeight,
              clientWidth: e.currentTarget.clientWidth,
              clientHeight: e.currentTarget.clientHeight
            });
          }}
        >
          {/* 滚动内容区域 - 动态计算尺寸以容纳缩放后的画布 */}
          <div 
            className="relative"
            style={{
              // 计算所需的滚动区域大小，确保缩放后的画布能完全显示
              width: Math.max(
                800, // 最小宽度
                (state.canvasSize.width * state.displayScale * state.zoom) + 200 // 画布实际显示尺寸 + 边距
              ),
              height: Math.max(
                600, // 最小高度
                (state.canvasSize.height * state.displayScale * state.zoom) + 200 // 画布实际显示尺寸 + 边距
              ),
            }}
          >
            {/* 画布居中容器 */}
            <div 
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* 画布 - 固定原始尺寸，通过CSS transform处理缩放 */}
              <DragDropCanvas 
                className="shadow-lg"
                onElementDoubleClick={onElementDoubleClick}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </>
  );
};

// 主页面内容组件 - 在CanvasProvider内部，可以访问canvas context
const HomePageContent: React.FC = () => {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  
  // 用于图片上传的文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 当前正在处理上传的图片元素ID
  const currentImageElementRef = useRef<string | null>(null);
  
  // 获取画布状态和操作函数
  const { toggleGrid, toggleSnapToGrid, setGridSize, state, setCurrentPageId, loadCanvasData, saveStatus, forceSave, clearSaveError, setCanvasSize } = useCanvas();

  // 加载相册数据
  const loadAlbums = async () => {
    try {
      const data = await albumsAPI.getAll();
      setAlbums(data);
    } catch (error) {
      console.error('加载相册失败:', error);
    }
  };

  useEffect(() => {
    loadAlbums();
  }, []);

  const handleAlbumSelect = (album: Album) => {
    setSelectedAlbum(album);
    setSelectedPage(null); // 切换相册时清空页面选择
    setCurrentPageId(null); // 清空当前页面ID
  };

  const handlePageSelect = async (page: Page) => {
    setSelectedPage(page);
    
    // 设置当前页面ID
    setCurrentPageId(page.id);
    
    try {
      // 加载页面的画布数据
      console.log('加载页面画布数据:', page.id);
      const canvasData = await pagesAPI.getCanvas(page.id);
      loadCanvasData(canvasData);
      console.log('画布数据加载成功:', canvasData);
    } catch (error) {
      console.error('加载画布数据失败:', error);
      // 如果加载失败，初始化为空画布
      loadCanvasData({
        canvasSize: { width: 800, height: 600 },
        elements: [],
        version: 1,
        lastModified: new Date().toISOString()
      });
    }
  };

  const handleCreatePage = async (albumId: number) => {
    try {
      // 找到当前相册
      const currentAlbum = albums.find(album => album.id === albumId);
      if (!currentAlbum) return;
      
      // 计算下一个页面数字编号
      const pageCount = currentAlbum.pages?.length || 0;
      const nextPageNumber = pageCount + 1;
      const pageName = nextPageNumber.toString();
      
      // 创建新页面
      const newPage = await pagesAPI.create(pageName, albumId, '');
      
      // 立即更新本地状态，将新页面添加到相册中
      setAlbums(prevAlbums => 
        prevAlbums.map(album => 
          album.id === albumId 
            ? { ...album, pages: [...(album.pages || []), newPage] }
            : album
        )
      );
      
      // 自动选中新创建的页面
      setSelectedPage(newPage);
    } catch (error) {
      console.error('创建页面失败:', error);
    }
  };

  const handleDeletePage = async (pageId: number, albumId: number) => {
    try {
      // 更新本地状态，从相册中移除页面
      setAlbums(prevAlbums => 
        prevAlbums.map(album => 
          album.id === albumId 
            ? { ...album, pages: album.pages?.filter(page => page.id !== pageId) || [] }
            : album
        )
      );
      
      // 如果删除的是当前选中的页面，清空选中状态
      if (selectedPage?.id === pageId) {
        setSelectedPage(null);
      }
      
      // 重新编号剩余页面（保持顺序编号）
      const updatedAlbum = albums.find(album => album.id === albumId);
      if (updatedAlbum?.pages) {
        const remainingPages = updatedAlbum.pages.filter(page => page.id !== pageId);
        
        // 批量更新页面编号
        for (let i = 0; i < remainingPages.length; i++) {
          const page = remainingPages[i];
          const newTitle = (i + 1).toString();
          if (page.title !== newTitle) {
            try {
              await pagesAPI.update(page.id, newTitle, page.content);
              // 更新本地状态中的页面标题
              setAlbums(prevAlbums => 
                prevAlbums.map(album => 
                  album.id === albumId 
                    ? { 
                        ...album, 
                        pages: album.pages?.map(p => 
                          p.id === page.id ? { ...p, title: newTitle } : p
                        ) || [] 
                      }
                    : album
                )
              );
            } catch (error) {
              console.error(`更新页面 ${page.id} 编号失败:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('删除页面失败:', error);
    }
  };
  
  // 元素双击编辑处理函数（只处理图片上传）
  const handleElementDoubleClick = (element: CanvasElement) => {
    if (element.type === 'image') {
      // 图片元素：记录当前元素ID并触发文件选择
      currentImageElementRef.current = element.id;
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
    // 文本元素的编辑现在由 DraggableElement 组件直接处理
  };
  
  // 图片上传处理函数  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // 清空文件输入，为下一次选择做准备
    if (event.target) {
      event.target.value = '';
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] w-screen bg-gray-100 flex gap-6 p-6 overflow-hidden">
      {/* 左侧相册树 - 1/5 比例 */}
      <div className="flex-shrink-0" style={{ width: '20%' }}>
        <div className="h-full bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">相册管理</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <AlbumTree 
              onAlbumSelect={handleAlbumSelect}
              selectedAlbumId={selectedAlbum?.id}
              onPageSelect={handlePageSelect}
              selectedPageId={selectedPage?.id}
              onCreatePage={handleCreatePage}
              onDeletePage={handleDeletePage}
              onAlbumsChange={setAlbums}
              albums={albums}
            />
          </div>
        </div>
      </div>

      {/* 中间画布区域 - 3/5 比例，主要工作区域 */}
      <div className="flex-1" style={{ minWidth: 0 }}>
        <div className="h-full bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
          <CanvasContent
            selectedPage={selectedPage}
            selectedAlbum={selectedAlbum}
            fileInputRef={fileInputRef}
            currentImageElementRef={currentImageElementRef}
            onElementDoubleClick={handleElementDoubleClick}
            onImageUpload={handleImageUpload}
          />
        </div>
      </div>

      {/* 右侧工具栏 - 1/5 比例 */}
      <div className="flex-shrink-0" style={{ width: '20%' }}>
        <div className="h-full bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
          {/* 画布尺寸选择 */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-3">画布设置</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  尺寸选择
                </label>
                <select
                  value={`${state.canvasSize.width}x${state.canvasSize.height}`}
                  onChange={(e) => {
                    const [width, height] = e.target.value.split('x').map(Number);
                    setCanvasSize({ width, height });
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="1240x1754">A4竖版 (1240 × 1754)</option>
                  <option value="1754x1240">A4横版 (1754 × 1240)</option>
                  <option value="1169x1654">A5竖版 (1169 × 1654)</option>
                  <option value="1654x1169">A5横版 (1654 × 1169)</option>
                  <option value="2480x3508">A4高分辨率竖版 (2480 × 3508)</option>
                  <option value="3508x2480">A4高分辨率横版 (3508 × 2480)</option>
                  <option value="1200x1200">正方形中 (1200 × 1200)</option>
                  <option value="1500x1500">正方形大 (1500 × 1500)</option>
                  <option value="800x800">正方形小 (800 × 800)</option>
                  <option value="1920x1080">横屏16:9 (1920 × 1080)</option>
                  <option value="1080x1920">竖屏9:16 (1080 × 1920)</option>
                  <option value="1500x2100">传统相册竖版 (1500 × 2100)</option>
                  <option value="2100x1500">传统相册横版 (2100 × 1500)</option>
                  <option value="800x600">自定义小尺寸 (800 × 600)</option>
                </select>
              </div>
              
              {/* 网格设置 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  网格设置
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">网格大小: {state.gridSize}px</span>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={state.gridSize}
                      onChange={(e) => setGridSize(Number(e.target.value))}
                      className="w-20"
                    />
                  </div>
                  <label className="flex items-center text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={state.isSnapToGrid}
                      onChange={toggleSnapToGrid}
                      className="mr-2"
                    />
                    吸附到网格
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 工具元素 */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-3">工具元素</h3>
            <div className="space-y-3">
              {/* 矩形图片框 */}
              <DraggableToolElement
                type={ItemTypes.TOOL_IMAGE}
                toolType="image"
                icon={<PhotoIcon className="w-5 h-5 text-gray-600" />}
                title="图片框"
                description="拖拽添加图片"
              />

              {/* 文本框 */}
              <DraggableToolElement
                type={ItemTypes.TOOL_TEXT}
                toolType="text"
                icon={<DocumentTextIcon className="w-5 h-5 text-gray-600" />}
                title="文本框"
                description="拖拽添加文本"
              />
            </div>
          </div>

          {/* 属性面板 */}
          <div className="flex-1 overflow-y-auto">
            <PropertiesPanel />
          </div>

          {/* 使用说明 */}
          {/* <div className="p-4 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-800 mb-1">
                使用说明
              </h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• 选择相册页面</li>
                <li>• 拖拽工具到画布</li>
                <li>• 双击文本框编辑内容</li>
                <li>• 双击图片框上传图片</li>
                <li>• 开启网格辅助对齐</li>
                <li>• 调整画布尺寸</li>
              </ul>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
};

// 主页面组件 - 包装CanvasProvider
const HomePage: React.FC = () => {
  return (
    <CanvasProvider>
      <HomePageContent />
    </CanvasProvider>
  );
};

export default HomePage