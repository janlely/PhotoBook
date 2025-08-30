import React, { useState, useEffect, useRef } from 'react';
import { CanvasProvider, useCanvas } from '../contexts/CanvasContext';
import { useDrag } from 'react-dnd';
import AlbumTree from '../components/AlbumTree';
import DragDropCanvas from '../components/DragDropCanvas';
import type { Album, Page } from '../api/albums';
import { albumsAPI } from '../api/albums';
import { pagesAPI } from '../api/pages';
import { uploadImage } from '../api/upload';
import { DocumentTextIcon, PhotoIcon, Square3Stack3DIcon } from '@heroicons/react/24/outline';
import { ItemTypes } from '../types/dnd';
import type { ToolDragItem } from '../types/dnd';
import type { CanvasElement, ImageElement, TextElement } from '../contexts/CanvasContext';

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

// 主页面内容组件 - 在CanvasProvider内部，可以访问canvas context
const HomePageContent: React.FC = () => {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [albums, setAlbums] = useState<Album[]>([]);
  
  // 用于文本编辑的状态
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  
  // 用于图片上传的文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 当前正在处理上传的图片元素ID
  const currentImageElementRef = useRef<string | null>(null);
  
  // 获取画布状态和操作函数
  const { toggleGrid, toggleSnapToGrid, setGridSize, state } = useCanvas();

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
  };

  const handlePageSelect = (page: Page) => {
    setSelectedPage(page);
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
  
  // 元素双击编辑处理函数
  const handleElementDoubleClick = (element: CanvasElement) => {
    if (element.type === 'text') {
      // 文本元素：进入编辑模式
      const textElement = element as TextElement;
      setEditingElement(element.id);
      setEditingText(textElement.content);
      
      // 延迟聚焦到文本输入框
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.focus();
          textInputRef.current.select();
        }
      }, 100);
    } else if (element.type === 'image') {
      // 图片元素：记录当前元素ID并触发文件选择
      currentImageElementRef.current = element.id;
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };
  
  // 图片上传处理函数  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // 清空文件输入，为下一次选择做准备
    if (event.target) {
      event.target.value = '';
    }
  };

  // 保存文本编辑
  const handleSaveTextEdit = () => {
    if (editingElement) {
      // 这里会在CanvasContent组件中实际更新元素
      console.log('Text edited, need to update element');
      setEditingElement(null);
      setEditingText('');
    }
  };
  
  // 取消文本编辑
  const handleCancelTextEdit = () => {
    setEditingElement(null);
    setEditingText('');
  };
  
  // 处理文本编辑的键盘事件
  const handleTextEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveTextEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelTextEdit();
    }
  };

// 画布内容组件 - 在CanvasProvider内部，可以访问canvas context
const CanvasContent: React.FC<{
  selectedPage: Page | null;
  selectedAlbum: Album | null;
  canvasSize: { width: number; height: number };
  editingElement: string | null;
  editingText: string;
  textInputRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  currentImageElementRef: React.RefObject<string | null>;
  onElementDoubleClick: (element: CanvasElement) => void;
  onSaveTextEdit: () => void;
  onCancelTextEdit: () => void;
  onTextEditKeyDown: (e: React.KeyboardEvent) => void;
  onTextChange: (value: string) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ 
  selectedPage, 
  selectedAlbum, 
  canvasSize, 
  editingElement, 
  editingText, 
  textInputRef, 
  fileInputRef,
  currentImageElementRef,
  onElementDoubleClick,
  onSaveTextEdit,
  onCancelTextEdit,
  onTextEditKeyDown,
  onTextChange,
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
  
  // 保存文本编辑
  const handleSaveTextEdit = () => {
    if (editingElement) {
      updateElement(editingElement, { content: editingText });
      onSaveTextEdit();
    }
  };
  
  return (
    <>
      <div className="flex-1 p-6 overflow-auto bg-gray-50 rounded-b-lg">
        <div className="flex justify-center">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <DragDropCanvas 
              className="border-2 border-gray-300"
              onElementDoubleClick={onElementDoubleClick}
            />
          </div>
        </div>
      </div>
      
      {/* 文本编辑弹窗 */}
      {editingElement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <h3 className="text-lg font-semibold mb-4">编辑文本</h3>
            <textarea
              ref={textInputRef}
              value={editingText}
              onChange={(e) => onTextChange(e.target.value)}
              onKeyDown={onTextEditKeyDown}
              className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="输入文本内容..."
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={onCancelTextEdit}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveTextEdit}
                className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
      
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
            editingElement={editingElement}
            editingText={editingText}
            textInputRef={textInputRef}
            fileInputRef={fileInputRef}
            currentImageElementRef={currentImageElementRef}
            onElementDoubleClick={handleElementDoubleClick}
            onSaveTextEdit={handleSaveTextEdit}
            onCancelTextEdit={handleCancelTextEdit}
            onTextEditKeyDown={handleTextEditKeyDown}
            onTextChange={setEditingText}
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
          <div className="p-4 flex-1 overflow-y-auto">
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

          {/* 使用说明 */}
          <div className="p-4 border-t border-gray-200">
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
          </div>
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

export default HomePage;