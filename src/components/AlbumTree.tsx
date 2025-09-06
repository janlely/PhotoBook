import React, { useState, useEffect } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import type { Album } from '../api/albums';
import type { Page } from '../api/pages';
import { ChevronRightIcon, ChevronDownIcon, FolderIcon, PlusIcon, DocumentIcon, MinusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { AlbumExportButton } from './AlbumExportButton';
import useStore from '../store/useStore';

interface AlbumTreeProps {
  onAlbumSelect: (album: Album) => void;
  selectedAlbumId?: number;
  onPageSelect?: (page: Page) => void;
  selectedPageId?: number;
  onCreatePage?: (albumId: number) => void;
  onDeletePage?: (pageId: number, albumId: number) => void;
  onDeleteAlbum?: (albumId: number, albumTitle: string) => void;
}

interface AlbumTreeItemProps {
  album: Album;
  level: number;
  onAlbumSelect: (album: Album) => void;
  selectedAlbumId?: number;
  onPageSelect?: (page: Page) => void;
  selectedPageId?: number;
  onCreatePage?: (albumId: number) => void;
  onDeletePage?: (pageId: number, albumId: number) => void;
  onDeleteAlbum?: (albumId: number, albumTitle: string) => void;
}

const AlbumTreeItem: React.FC<AlbumTreeItemProps> = ({
  album,
  level,
  onAlbumSelect,
  selectedAlbumId,
  onPageSelect,
  selectedPageId,
  onCreatePage,
  onDeletePage,
  onDeleteAlbum,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

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
          {
            isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )
          }
        </button>
        <FolderIcon className="h-5 w-5 text-gray-400 mr-2" />
        <span className="text-sm flex-1">{album.title}</span>
        <span className="text-xs text-gray-500 mr-2">
          {album.pages?.length || 0} 页面
        </span>
        <AlbumExportButton
          albumId={album.id}
          albumTitle={album.title}
          className="ml-1"
          iconOnly={true}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteAlbum?.(album.id, album.title);
          }}
          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors ml-1"
          title="删除相册"
        >
          <TrashIcon className="h-3 w-3" />
        </button>
      </div>
      
      {isExpanded && (
        <div>
          {/* 显示页面列表 */}
          {album.pages && album.pages.length > 0 && (
            <div>
              {album.pages
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                .map((page, index) => (
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
                    {index + 1}
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
  onDeleteAlbum
}) => {
  // 使用Zustand store作为唯一数据源
  const {
    albums: storeAlbums,
    pages: storePages,
    loading,
    errors,
    fetchAlbums,
    createAlbum,
    createPage,
    deletePage,
    deleteAlbum
  } = useStore();

  // Extract albums loading state
  const albumsLoading = loading['albums'];

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<{ id: number; title: string; albumId: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteAlbumModal, setShowDeleteAlbumModal] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState<{ id: number; title: string } | null>(null);
  const [deletingAlbum, setDeletingAlbum] = useState(false);

  // 统一使用store数据
  const albums = storeAlbums.data;

  const loadAlbums = React.useCallback(async (force = false) => {
    try {
      await fetchAlbums(force);
      // 数据已自动更新到store中，无需额外通知
    } catch (error) {
      console.error('Failed to load albums from store:', error);
      // 错误已由store的errorHandler处理
    }
  }, [fetchAlbums]);

  const handleCreateAlbum = async () => {
    if (!newAlbumTitle.trim()) return;

    try {
      setCreating(true);
      await createAlbum({
        title: newAlbumTitle.trim(),
        children: [],
        pages: [],
        userId: 0 // 这将在服务端设置
      });
      setNewAlbumTitle('');
      setShowCreateModal(false);
      // 数据会自动更新，无需重新加载
    } catch (err: any) {
      console.error('创建相册失败:', err);
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
    const album = albums.find((a: Album) => a.id === albumId);
    const page = album?.pages?.find((p: Page) => p.id === pageId);
    if (page) {
      setPageToDelete({ id: pageId, title: page.title, albumId });
      setShowDeleteModal(true);
    }
  };

  /**
   * 处理页面创建的最佳实践：
   * 1. 使用store方法而不是直接调用API，确保状态一致性
   * 2. 页面名称现在基于渲染时的顺序自动计算，无需存储
   * 3. store会自动更新所有相关缓存，无需手动刷新
   * 4. 错误处理应该在UI层面提供用户反馈
   */
  const handleCreatePage = async (albumId: number) => {
    try {
      // 页面名称现在在渲染时根据顺序自动计算，这里只需提供一个默认标题
      await createPage({
        title: '新页面', // 存储时使用默认标题，渲染时会显示为数字
        albumId,
        content: '{}'
      });
      // 页面创建成功后，store会自动更新状态，AlbumTree会重新渲染
    } catch (error) {
      console.error('创建页面失败:', error);
      // 可以在这里添加错误处理，比如显示错误提示
    }
  };

  const confirmDeletePage = async () => {
    if (!pageToDelete) return;

    try {
      setDeleting(true);
      // 使用store的deletePage方法，它会自动更新所有相关缓存
      await deletePage(pageToDelete.id);

      // 通知父组件页面已删除
      onDeletePage?.(pageToDelete.id, pageToDelete.albumId);

      setShowDeleteModal(false);
      setPageToDelete(null);
    } catch (err: any) {
      console.error('删除页面失败:', err);
    } finally {
      setDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setPageToDelete(null);
  };

  const handleDeleteAlbum = (albumId: number, albumTitle: string) => {
    setAlbumToDelete({ id: albumId, title: albumTitle });
    setShowDeleteAlbumModal(true);
  };

  const confirmDeleteAlbum = async () => {
    if (!albumToDelete) return;

    try {
      setDeletingAlbum(true);
      await deleteAlbum(albumToDelete.id);
      setShowDeleteAlbumModal(false);
      setAlbumToDelete(null);
    } catch (err: any) {
      console.error('删除相册失败:', err);
    } finally {
      setDeletingAlbum(false);
    }
  };

  const closeDeleteAlbumModal = () => {
    setShowDeleteAlbumModal(false);
    setAlbumToDelete(null);
  };

  useEffect(() => {
    // console.log('AlbumTree useEffect:', {
    //   storeAlbums: storeAlbums.data,
    //   albumsLoading
    // });

    // 统一从store加载数据
    if (storeAlbums.data.length === 0 && !albumsLoading) {
      console.log('Loading albums from store');
      loadAlbums();
    }
  }, [storeAlbums.data.length, albumsLoading, loadAlbums]);

  const rootAlbums = albums.filter((album: Album) => !album.parentId);

  // console.log('AlbumTree render:', {
  //   albums: albums.length,
  //   rootAlbums: rootAlbums.length,
  //   loading,
  //   storeAlbums: storeAlbums.data.length
  // });

  if (albumsLoading) {
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

  const albumError = errors['albums'];
  if (albumError) {
    return (
      <div className="p-4 text-center text-red-500">
        {albumError}
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
                onClick={() => loadAlbums(true)}
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
                onPageSelect={onPageSelect}
                selectedPageId={selectedPageId}
                onCreatePage={handleCreatePage}
                onDeletePage={handleDeletePage}
                onDeleteAlbum={handleDeleteAlbum}
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

      {/* Delete Album Confirmation Modal */}
      <Dialog open={showDeleteAlbumModal} onClose={closeDeleteAlbumModal} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-md space-y-4 border bg-white p-6 rounded-lg shadow-xl">
            <DialogTitle className="text-lg font-semibold text-red-600">
              确认删除相册
            </DialogTitle>

            <div className="text-sm text-gray-600">
              您确定要删除相册 <span className="font-medium text-gray-900">"{albumToDelete?.title}"</span> 吗？
              <br />
              <span className="text-red-500">此操作将同时删除相册中的所有页面，无法撤销。</span>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={closeDeleteAlbumModal}
                disabled={deletingAlbum}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteAlbum}
                disabled={deletingAlbum}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingAlbum ? '删除中...' : '确认删除'}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
      
    </>
  );
};

export default AlbumTree;
