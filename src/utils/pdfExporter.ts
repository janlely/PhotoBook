import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { PageCanvasData } from '../api/pages';
import type { CanvasElement, ImageElement, TextElement, ShapeElement } from '../contexts/CanvasContext';

export interface ExportOptions {
  format: 'A4' | 'A5' | 'original';
  quality: 'draft' | 'standard' | 'high';
  includeBleed: boolean;
  orientation: 'portrait' | 'landscape';
}

export interface ExportProgress {
  currentPage: number;
  totalPages: number;
  progress: number;
  status: 'preparing' | 'rendering' | 'generating' | 'complete';
}

export class AlbumPDFExporter {
  private progressCallback?: (progress: ExportProgress) => void;

  onProgress(callback: (progress: ExportProgress) => void) {
    this.progressCallback = callback;
  }

  private updateProgress(progress: ExportProgress) {
    this.progressCallback?.(progress);
  }

  async exportAlbum(albumId: number, options: ExportOptions = {
    format: 'A4',
    quality: 'high',
    includeBleed: false,
    orientation: 'portrait'
  }): Promise<Blob> {
    try {
      this.updateProgress({
        currentPage: 0,
        totalPages: 0,
        progress: 0,
        status: 'preparing'
      });

      // 获取相册数据
      const album = await this.getAlbumData(albumId);
      const pages = album.pages || [];
      
      if (pages.length === 0) {
        throw new Error('相册中没有页面');
      }

      this.updateProgress({
        currentPage: 0,
        totalPages: pages.length,
        progress: 5,
        status: 'rendering'
      });

      // 获取所有页面数据
      const pagesData = await Promise.all(
        pages.map(page => this.getPageCanvasData(page.id))
      );

      // 创建PDF
      const pdf = new jsPDF({
        orientation: options.orientation,
        unit: 'pt',
        format: this.getPDFFormat(options.format, pagesData[0]?.canvasSize)
      });

      // 逐页处理
      for (let i = 0; i < pagesData.length; i++) {
        const pageData = pagesData[i];
        
        this.updateProgress({
          currentPage: i + 1,
          totalPages: pagesData.length,
          progress: 5 + (i / pagesData.length) * 85,
          status: 'rendering'
        });

        // 渲染页面到canvas
        const canvas = await this.renderPageToCanvas(pageData);
        
        // 添加到PDF
        if (i > 0) {
          pdf.addPage();
        }
        
        this.addCanvasToPDF(pdf, canvas, pageData.canvasSize, options);
        
        // 清理canvas
        canvas.remove();
      }

      this.updateProgress({
        currentPage: pagesData.length,
        totalPages: pagesData.length,
        progress: 95,
        status: 'generating'
      });

      const blob = pdf.output('blob');
      
      this.updateProgress({
        currentPage: pagesData.length,
        totalPages: pagesData.length,
        progress: 100,
        status: 'complete'
      });

      return blob;
    } catch (error) {
      console.error('PDF导出失败:', error);
      throw error;
    }
  }

  private async getAlbumData(albumId: number) {
    // 模拟API调用，实际使用albumsAPI
    const response = await fetch(`/api/albums/${albumId}`);
    if (!response.ok) throw new Error('获取相册数据失败');
    return response.json();
  }

  private async getPageCanvasData(pageId: number): Promise<PageCanvasData> {
    // 模拟API调用，实际使用pagesAPI
    const response = await fetch(`/api/pages/${pageId}/canvas`);
    if (!response.ok) throw new Error('获取页面数据失败');
    return response.json();
  }

  private async renderPageToCanvas(pageData: PageCanvasData): Promise<HTMLDivElement> {
    // 创建虚拟容器
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = `${pageData.canvasSize.width}px`;
    container.style.height = `${pageData.canvasSize.height}px`;
    container.style.backgroundColor = '#ffffff';
    container.style.overflow = 'hidden';
    
    // 渲染所有元素
    for (const element of pageData.elements) {
      const elementDiv = this.createElementDiv(element);
      container.appendChild(elementDiv);
    }
    
    document.body.appendChild(container);
    
    // 等待资源加载
    await this.waitForResources(container);
    
    return container;
  }

  private createElementDiv(element: CanvasElement): HTMLElement {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.left = `${element.transform.x}px`;
    div.style.top = `${element.transform.y}px`;
    div.style.width = `${element.transform.width}px`;
    div.style.height = `${element.transform.height}px`;
    div.style.transform = `rotate(${element.transform.rotation}deg) scale(${element.transform.scaleX}, ${element.transform.scaleY})`;
    div.style.transformOrigin = 'center center';
    div.style.zIndex = element.zIndex.toString();
    
    switch (element.type) {
      case 'text':
        return this.createTextElement(element as TextElement, div);
      case 'image':
        return this.createImageElement(element as ImageElement, div);
      case 'shape':
        return this.createShapeElement(element as ShapeElement, div);
      default:
        return div;
    }
  }

  private createTextElement(element: TextElement, container: HTMLElement): HTMLElement {
    const textDiv = document.createElement('div');
    textDiv.textContent = element.content;
    textDiv.style.fontSize = `${element.fontSize}px`;
    textDiv.style.fontFamily = element.fontFamily;
    textDiv.style.fontWeight = element.fontWeight;
    textDiv.style.fontStyle = element.fontStyle;
    textDiv.style.color = element.color;
    textDiv.style.textAlign = element.textAlign;
    textDiv.style.lineHeight = element.lineHeight.toString();
    textDiv.style.whiteSpace = 'pre-wrap';
    textDiv.style.wordBreak = 'break-word';
    textDiv.style.width = '100%';
    textDiv.style.height = '100%';
    textDiv.style.display = 'flex';
    textDiv.style.alignItems = 'center';
    
    container.appendChild(textDiv);
    return container;
  }

  private createImageElement(element: ImageElement, container: HTMLElement): HTMLElement {
    const img = document.createElement('img');
    img.src = element.src;
    img.alt = element.alt || '';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.opacity = element.opacity.toString();
    
    if (element.border) {
      container.style.border = `${element.border.width}px solid ${element.border.color}`;
      container.style.borderRadius = `${element.border.radius}px`;
    }
    
    container.appendChild(img);
    return container;
  }

  private createShapeElement(element: ShapeElement, container: HTMLElement): HTMLElement {
    container.style.backgroundColor = element.fill;
    container.style.border = `${element.strokeWidth}px solid ${element.stroke}`;
    container.style.opacity = element.opacity.toString();
    
    if (element.shapeType === 'circle') {
      container.style.borderRadius = '50%';
    }
    
    return container;
  }

  private async waitForResources(container: HTMLElement): Promise<void> {
    const images = container.querySelectorAll('img');
    const promises = Array.from(images).map(img => {
      return new Promise<void>((resolve, reject) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`图片加载失败: ${img.src}`));
        }
      });
    });
    
    await Promise.all(promises);
    
    // 额外等待确保所有样式应用
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private getPDFFormat(format: string, canvasSize: Size): [number, number] {
    switch (format) {
      case 'A4':
        return [595.28, 841.89]; // A4 in points
      case 'A5':
        return [419.53, 595.28]; // A5 in points
      case 'original':
      default:
        return [canvasSize.width, canvasSize.height];
    }
  }

  private addCanvasToPDF(
    pdf: jsPDF,
    container: HTMLDivElement,
    canvasSize: Size,
    options: ExportOptions
  ) {
    const scale = options.quality === 'high' ? 2 : options.quality === 'standard' ? 1.5 : 1;
    
    return html2canvas(container, {
      scale,
      width: canvasSize.width,
      height: canvasSize.height,
      useCORS: true,
      backgroundColor: '#ffffff',
      allowTaint: true,
      removeContainer: true
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      let scaleRatio = 1;
      if (options.format !== 'original') {
        scaleRatio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      }
      
      const finalWidth = imgWidth * scaleRatio;
      const finalHeight = imgHeight * scaleRatio;
      
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
      
      // 清理容器
      container.remove();
    });
  }
}

// 单例导出
export const pdfExporter = new AlbumPDFExporter();
