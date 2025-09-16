import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { UserIcon } from '@heroicons/react/20/solid';
import useStore from '../store/useStore';
import DownloadTasksButton from './DownloadTasksButton';
import TaskFlyInAnimation from './TaskFlyInAnimation';

// 用户菜单组件
const UserMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { user, isAuthenticated, logout, checkAuth } = useStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogin = () => {
    window.location.href = '/login';
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  // 显示菜单
  const showMenu = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    setIsOpen(true);
  };

  // 隐藏菜单（带延迟）
  const hideMenu = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  return (
    <div className="relative">
      <button
        onMouseEnter={showMenu}
        onMouseLeave={hideMenu}
        className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 transition-colors"
        title={isAuthenticated ? user?.name || user?.username || '用户' : '未登录'}
      >
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <UserIcon className="w-5 h-5 text-gray-600" />
        </div>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50 transition-all duration-200 ease-out"
          onMouseEnter={showMenu}
          onMouseLeave={hideMenu}
        >
          <div className="py-1">
            {isAuthenticated ? (
              <>
                <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
                  {user?.name || user?.username || user?.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  登出
                </button>
              </>
            ) : (
              <button
                onClick={handleLogin}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                登录
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Layout: React.FC = () => {
  const [animationState, setAnimationState] = useState<{
    isVisible: boolean;
    startPosition: { x: number; y: number };
    endPosition: { x: number; y: number };
    albumTitle: string;
  } | null>(null);

  const downloadTasksButtonRef = useRef<HTMLDivElement>(null);

  // 触发动画
  const handleAnimationTrigger = (startPosition: { x: number; y: number }, albumTitle: string) => {
    if (downloadTasksButtonRef.current) {
      const endRect = downloadTasksButtonRef.current.getBoundingClientRect();
      const endPosition = {
        x: endRect.left + endRect.width / 2,
        y: endRect.top + endRect.height / 2
      };

      setAnimationState({
        isVisible: true,
        startPosition,
        endPosition,
        albumTitle
      });
    }
  };

  // 动画完成处理
  const handleAnimationComplete = () => {
    setAnimationState(null);
    // 这里可以触发下载任务列表的刷新
  };

  return (
    <div className="h-screen overflow-hidden">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <div className="text-xl font-bold text-indigo-600">PhotoBook</div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link to="/" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Home
                </Link>
                <Link to="/about" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  About
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div ref={downloadTasksButtonRef}>
                <DownloadTasksButton />
              </div>
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>
      <main>
        <Outlet context={{ onAnimationTrigger: handleAnimationTrigger }} />
      </main>

      {/* 飞入动画 */}
      {animationState && (
        <TaskFlyInAnimation
          isVisible={animationState.isVisible}
          startPosition={animationState.startPosition}
          endPosition={animationState.endPosition}
          albumTitle={animationState.albumTitle}
          onAnimationComplete={handleAnimationComplete}
        />
      )}
    </div>
  );
};

export default Layout;
