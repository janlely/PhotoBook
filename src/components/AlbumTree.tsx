import React, { useState, useEffect } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { albumsAPI } from '../api/albums';
import type { Album, Page } from '../api/albums';
import { ChevronRightIcon, ChevronDownIcon, FolderIcon, PlusIcon, DocumentIcon, MinusIcon } from '@heroicons/react/24/outline';

interface AlbumTreeProps {
  onAlbumSelect: (album: Album) => void;
  selectedAlbumId?: number;
  onPageSelect?: (page: Page) => void;
  selectedPageId?: number;
  onCreatePage?: (albumId: number) => void;
  onDeletePage?: (pageId: number, albumId: number) => void;
  onAlbumsChange?: (albums: Album[]) => void;
  albums?: Album[]; // 新增：从外部传入相册数据
}

interface AlbumTreeItemProps {
  album: Album;
  level: number;
  onAlbumSelect: (album: Album) => void;
  selectedAlbumId?: number;
  onRefresh: () => void;
  onPageSelect?: (page: Page) => void;
  selectedPageId?: number;
  onCreatePage?: (albumId: number) => void;
  onDeletePage?: (pageId: number, albumId: number) => void;
}

const AlbumTreeItem: React.FC<AlbumTreeItemProps> = ({
  album,
  level,
  onAlbumSelect,
  selectedAlbumId,
  onRefresh,
  onPageSelect,
  selectedPageId,
  onCreatePage,
  onDeletePage,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<Album[]>([]);

  const hasChildren = album.children && album.children.length > 0;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      // 展开时自动选中这个相册
      onAlbumSelect(album);
    }
  };

  const handleSelect = () => {
    onAlbumSelect(album);
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  useEffect(() => {
    if (isExpanded && hasChildren) {
      const loadChildren = async () => {
        try {
          const albumDetail = await albumsAPI.getById(album.id);
          setChildren(albumDetail.children || []);
        } catch (error) {
          console.error('加载子相册失败:', error);
        }
      };
      loadChildren();
    }
  }, [isExpanded, hasChildren, album.id]);

  return (
    <div>
      <div
        className={`flex items-center px-2 py-1 rounded cursor-pointer hover:bg-gray-100 ${
          selectedAlbumId === album.id ? 'bg-indigo-100 text-indigo-700' : ''
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
      >
        <button
          className="mr-1 p-1 hover:bg-gray-200 rounded"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )
          ) : (
            <span className="w-4 h-4 inline-block" />
          )}
        </button>
        <FolderIcon className="h-5 w-5 text-gray-400 mr-2" />
        <span className="text-sm flex-1">{album.title}</span>
        <span className="text-xs text-gray-500">
          {album.pages?.length || 0} 页面
        </span>
      </div>
      
      {isExpanded && (
        <div>
          {/* 显示页面列表 */}
          {album.pages && album.pages.length > 0 && (
            <div>
              {album.pages.map((page) => (
                <div
                  key={page.id}
                  className={`flex items-center px-2 py-1 ml-6 rounded hover:bg-gray-50 ${
                    selectedPageId === page.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
                  }`}
                >
                  <DocumentIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span 
                    className="text-sm flex-1 cursor-pointer"
                    onClick={() => onPageSelect?.(page)}
                  >
                    {page.title}
                  </span>
                  <span className="text-xs text-gray-400 mr-2">
                    {new Date(page.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage?.(page.id, album.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="删除页面"
                  >
                    <MinusIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* 新建页面按钮 */}
          <div
            className="flex items-center px-2 py-1 ml-6 rounded cursor-pointer hover:bg-gray-50 text-gray-500"
            onClick={() => onCreatePage?.(album.id)}
          >
            <PlusIcon className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-sm">新建页面</span>
          </div>
          
          {/* 子相册（如果有的话） */}
          {hasChildren && (
            <div>
              {children.map((child) => (
                <AlbumTreeItem
                  key={child.id}
                  album={child}
                  level={level + 1}
                  onAlbumSelect={onAlbumSelect}
                  selectedAlbumId={selectedAlbumId}
                  onRefresh={onRefresh}
                  onPageSelect={onPageSelect}
                  selectedPageId={selectedPageId}
                  onCreatePage={onCreatePage}
                  onDeletePage={onDeletePage}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AlbumTree: React.FC<AlbumTreeProps> = ({ 
  onAlbumSelect, 
  selectedAlbumId, 
  onPageSelect, 
  selectedPageId, 
  onCreatePage,
  onDeletePage,
  onAlbumsChange,
  albums: externalAlbums
}) => {
  const [internalAlbums, setInternalAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<{ id: number; title: string; albumId: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 优先使用外部传入的 albums，如果没有则使用内部状态
  const albums = externalAlbums || internalAlbums;

  const loadAlbums = async () => {
    try {
      setLoading(true);
      const data = await albumsAPI.getAll();
      setInternalAlbums(data);
      // 通知父组件数据变化
      onAlbumsChange?.(data);
    } catch (err: any) {
      setError(err.response?.data?.error || '加载相册失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumTitle.trim()) return;
    
    try {
      setCreating(true);
      await albumsAPI.create(newAlbumTitle.trim());
      setNewAlbumTitle('');
      setShowCreateModal(false);
      await loadAlbums(); // 重新加载相册列表
    } catch (err: any) {
      setError(err.response?.data?.error || '创建相册失败');
    } finally {
      setCreating(false);
    }
  };

  const openCreateModal = () => {
    setNewAlbumTitle('');
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setNewAlbumTitle('');
  };

  const handleDeletePage = (pageId: number, albumId: number) => {
    // 找到要删除的页面信息
    const album = albums.find(a => a.id === albumId);
    const page = album?.pages?.find(p => p.id === pageId);
    if (page) {
      setPageToDelete({ id: pageId, title: page.title, albumId });
      setShowDeleteModal(true);
    }
  };

  const confirmDeletePage = async () => {
    if (!pageToDelete) return;
    
    try {
      setDeleting(true);
      await import('../api/pages').then(module => module.pagesAPI.delete(pageToDelete.id));
      
      // 通知父组件页面已删除
      onDeletePage?.(pageToDelete.id, pageToDelete.albumId);
      
      setShowDeleteModal(false);
      setPageToDelete(null);
    } catch (err: any) {
      setError(err.response?.data?.error || '删除页面失败');
    } finally {
      setDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setPageToDelete(null);
  };

  useEffect(() => {
    // 只有在没有外部数据时才加载
    if (!externalAlbums) {
      loadAlbums();
    } else {
      setLoading(false);
    }
  }, [externalAlbums]);

  const rootAlbums = albums.filter(album => !album.parentId);

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">相册</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => openCreateModal()}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="w-3 h-3 mr-1" />
                新建
              </button>
              <button
                onClick={loadAlbums}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                刷新
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-2">
          {rootAlbums.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FolderIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>暂无相册</p>
            </div>
          ) : (
            rootAlbums.map((album) => (
              <AlbumTreeItem
                key={album.id}
                album={album}
                level={0}
                onAlbumSelect={onAlbumSelect}
                selectedAlbumId={selectedAlbumId}
                onRefresh={loadAlbums}
                onPageSelect={onPageSelect}
                selectedPageId={selectedPageId}
                onCreatePage={onCreatePage}
                onDeletePage={handleDeletePage}
              />
            ))
          )}
        </div>
      </div>

      {/* Create Album Modal */}
      <Dialog open={showCreateModal} onClose={closeCreateModal} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-lg space-y-4 border bg-white p-6 rounded-lg shadow-xl">
            <DialogTitle className="text-lg font-semibold">
              创建新相册
            </DialogTitle>
            
            <div>
              <label htmlFor="albumTitle" className="block text-sm font-medium text-gray-700 mb-2">
                相册名称
              </label>
              <input
                id="albumTitle"
                type="text"
                value={newAlbumTitle}
                onChange={(e) => setNewAlbumTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateAlbum()}
                placeholder="请输入相册名称"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                autoFocus
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeCreateModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCreateAlbum}
                disabled={!newAlbumTitle.trim() || creating}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Delete Page Confirmation Modal */}
      <Dialog open={showDeleteModal} onClose={closeDeleteModal} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-md space-y-4 border bg-white p-6 rounded-lg shadow-xl">
            <DialogTitle className="text-lg font-semibold text-red-600">
              确认删除页面
            </DialogTitle>
            
            <div className="text-sm text-gray-600">
              您确定要删除页面 <span className="font-medium text-gray-900">"{pageToDelete?.title}"</span> 吗？
              <br />
              <span className="text-red-500">此操作无法撤销。</span>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeDeleteModal}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={confirmDeletePage}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
      
    </>
  );
};

export default AlbumTree;
