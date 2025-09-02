import React, { useState } from 'react';
import { pdfExporter, type ExportOptions, type ExportProgress } from '../utils/pdfExporter';
import { albumsAPI } from '../api/albums';

interface AlbumExportButtonProps {
  albumId: number;
  albumTitle: string;
}

export const AlbumExportButton: React.FC<AlbumExportButtonProps> = ({ albumId, albumTitle }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress>({
    currentPage: 0,
    totalPages: 0,
    progress: 0,
    status: 'preparing'
  });

  const handleExport = async () => {
    if (!albumId) return;

    setIsExporting(true);
    setProgress({
      currentPage: 0,
      totalPages: 0,
      progress: 0,
      status: 'preparing'
    });

    pdfExporter.onProgress(setProgress);

    try {
      const pdfBlob = await pdfExporter.exportAlbum(albumId, {
        format: 'A4',
        quality: 'high',
        includeBleed: false,
        orientation: 'portrait'
      });

      // 创建下载链接
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${albumTitle || '相册'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // 清理
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleExport}
        disabled={isExporting || !albumId}
        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="将相册导出为PDF文件"
      >
        {isExporting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            导出中...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            导出PDF
          </>
        )}
      </button>

      {isExporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">正在导出相册</h3>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{progress.status === 'preparing' ? '准备中...' : 
                       progress.status === 'rendering' ? `渲染第 ${progress.currentPage}/${progress.totalPages} 页` :
                       progress.status === 'generating' ? '生成PDF...' : '完成'}</span>
                <span>{Math.round(progress.progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>

            <div className="text-sm text-gray-600">
              {progress.status === 'preparing' && '正在准备导出数据...'}
              {progress.status === 'rendering' && '正在渲染页面，请稍候...'}
              {progress.status === 'generating' && '正在生成PDF文件...'}
              {progress.status === 'complete' && '导出完成！'}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AlbumExportButton;
