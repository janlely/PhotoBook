import React, { useState, useEffect, useRef } from 'react';
import { CanvasProvider, useCanvas } from '../contexts/CanvasContext';
import { useDrag } from 'react-dnd';
import AlbumTree from '../components/AlbumTree';
import DragDropCanvas from '../components/DragDropCanvas';
import PropertiesPanel from '../components/PropertiesPanel';
import type { Album, Page } from '../api/albums';
import { albumsAPI } from '../api/albums';
import { pagesAPI } from '../api/pages';
import { uploadImage } from '../api/upload';
import { DocumentTextIcon, PhotoIcon, Square3Stack3DIcon } from '@heroicons/react/24/outline';
import { ItemTypes } from '../types/dnd';
import type { ToolDragItem } from '../types/dnd';
import type { CanvasElement, ImageElement } from '../contexts/CanvasContext';

// 可拖拽工具元素组件
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
  canvasSize: { width: number; height: number };
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  currentImageElementRef: React.RefObject<string | null>;
  onElementDoubleClick: (element: CanvasElement) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ 
  selectedPage, 
  selectedAlbum, 
  canvasSize, 
  fileInputRef,
  currentImageElementRef,
  onElementDoubleClick,
  onImageUpload
}) => {
  const { updateElement, getElementById } = useCanvas();
  
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
      <div className="flex-1 p-6 overflow-auto bg-gray-200 rounded-b-lg">
        <div className="flex justify-center">
          <DragDropCanvas 
            className=""
            onElementDoubleClick={onElementDoubleClick}
          />
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
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [albums, setAlbums] = useState<Album[]>([]);
  
  // 用于图片上传的文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 当前正在处理上传的图片元素ID
  const currentImageElementRef = useRef<string | null>(null);
  
  // 获取画布状态和操作函数
  const { toggleGrid, toggleSnapToGrid, setGridSize, state, setCurrentPageId, loadCanvasData, saveStatus, forceSave, clearSaveError } = useCanvas();

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
        <div className="flex-1 h-full bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
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

        {/* 中间画布区域 - 3/5 比例，主要工作区域 */}
        <div className="flex-[3] h-full bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {selectedPage ? selectedPage.title : '画布编辑器'}
                </h1>
                <p className="text-sm text-gray-600">
                  {selectedPage ? `相册: ${selectedAlbum?.title}` : '请选择页面开始编辑'}
                  {/* {selectedPage && state.selectedElementIds.length === 0 && (
                    <span className="block mt-1 text-xs text-gray-500">
                      💡 点击画布空白处可隐藏元素边框 | 按 Esc 键快速取消选择
                    </span>
                  )} */}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                {/* 网格显隐开关 */}
                <button
                  onClick={toggleGrid}
                  className={`flex items-center px-3 py-2 rounded-lg border transition-colors ${
                    state.isGridVisible
                      ? 'bg-blue-50 border-blue-300 text-blue-600'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                  title={state.isGridVisible ? '隐藏网格' : '显示网格'}
                >
                  <Square3Stack3DIcon className="w-4 h-4 mr-2" />
                  <span className="text-sm">
                    {state.isGridVisible ? '隐藏网格' : '显示网格'}
                  </span>
                </button>
                
                <div className="text-sm text-gray-500">
                  画布尺寸: {canvasSize.width} × {canvasSize.height}
                </div>
              </div>
            </div>
          </div>
          
          <CanvasContent
            selectedPage={selectedPage}
            selectedAlbum={selectedAlbum}
            canvasSize={canvasSize}
            fileInputRef={fileInputRef}
            currentImageElementRef={currentImageElementRef}
            onElementDoubleClick={handleElementDoubleClick}
            onImageUpload={handleImageUpload}
          />
        </div>

        {/* 右侧工具栏 - 1/5 比例 */}
        <div className="flex-1 h-full bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
          {/* 画布尺寸选择 */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-3">画布设置</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  尺寸选择
                </label>
                <select
                  value={`${canvasSize.width}x${canvasSize.height}`}
                  onChange={(e) => {
                    const [width, height] = e.target.value.split('x').map(Number);
                    setCanvasSize({ width, height });
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="800x600">800 × 600</option>
                  <option value="1024x768">1024 × 768</option>
                  <option value="1200x900">1200 × 900</option>
                  <option value="1600x1200">1600 × 1200</option>
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

export default HomePage;