import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { PageCanvasData } from '../api/pages';
import type { CanvasElement, ImageElement, TextElement, ShapeElement } from '../contexts/CanvasContext';
import { albumsAPI } from '../api/albums';
import { pagesAPI } from '../api/pages';

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

class VirtualRenderer {
  private virtualDocument: Document;
  private stylesCloned = false;
  
  constructor() {
    const parser = new DOMParser();
    this.virtualDocument = parser.parseFromString(
      '<!DOCTYPE html><html><head></head><body></body></html>',
      'text/html'
    );
  }

  private cloneStyles() {
    if (this.stylesCloned) return;
    
    // 克隆所有样式表
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach(style => {
      this.virtualDocument.head.appendChild(style.cloneNode(true));
    });
    
    this.stylesCloned = true;
  }

  async renderPage(pageData: PageCanvasData): Promise<HTMLCanvasElement> {
    this.cloneStyles();
    
    const container = this.virtualDocument.createElement('div');
    container.id = 'virtual-canvas-container';
    container.style.width = `${pageData.canvasSize.width}px`;
    container.style.height = `${pageData.canvasSize.height}px`;
    container.style.backgroundColor = '#ffffff';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    
    this.virtualDocument.body.appendChild(container);
    
    // 渲染所有元素
    for (const element of pageData.elements) {
      const elementDiv = this.createElementDiv(element);
      container.appendChild(elementDiv);
    }
    
    // 转换为Canvas
    return this.chunkedRendering(container, pageData.canvasSize);
  }
  
  private createElementDiv(element: CanvasElement): HTMLElement {
    const div = this.virtualDocument.createElement('div');
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
    const textDiv = this.virtualDocument.createElement('div');
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
    const img = this.virtualDocument.createElement('img');
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

  private async chunkedRendering(
    container: HTMLElement, 
    size: { width: number; height: number }
  ): Promise<HTMLCanvasElement> {
    const CHUNK_SIZE = 4096; // 4K分块
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d')!;

    // 小尺寸直接渲染
    if (size.width <= CHUNK_SIZE && size.height <= CHUNK_SIZE) {
      const chunk = await html2canvas(container as any, {
        scale: window.devicePixelRatio,
        width: size.width,
        height: size.height,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      ctx.drawImage(chunk, 0, 0);
      return canvas;
    }

    // 大尺寸分块渲染
    for (let y = 0; y < size.height; y += CHUNK_SIZE) {
      for (let x = 0; x < size.width; x += CHUNK_SIZE) {
        container.style.transform = `translate(-${x}px, -${y}px)`;
        
        const chunk = await html2canvas(container as any, {
          scale: window.devicePixelRatio,
          width: Math.min(CHUNK_SIZE, size.width - x),
          height: Math.min(CHUNK_SIZE, size.height - y),
          x,
          y,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });
        
        ctx.drawImage(chunk, x, y);
      }
    }
    return canvas;
  }

  destroy() {
    this.virtualDocument.body.innerHTML = '';
  }
}

export class AlbumPDFExporter {
  private progressCallback?: (progress: ExportProgress) => void;
  private renderer: VirtualRenderer;

  constructor() {
    this.renderer = new VirtualRenderer();
  }

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
        pages.map((page: { id: number }) => this.getPageCanvasData(page.id))
      );

      // 确定PDF尺寸
      const formatSize = this.getPDFFormat(options.format, pagesData[0]?.canvasSize);
      
      // 创建PDF
      const pdf = new jsPDF({
        orientation: options.orientation,
        unit: 'pt',
        format: formatSize
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

        // 虚拟渲染页面
        const canvas = await this.renderer.renderPage(pageData);
        
        // 添加到PDF
        if (i > 0) {
          pdf.addPage();
        }
        
        this.addPageToPDF(pdf, canvas, pageData.canvasSize, options);
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
    } finally {
      this.renderer.destroy();
    }
  }

  private getPDFFormat(format: string, canvasSize: { width: number; height: number }): [number, number] {
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

  private addPageToPDF(
    pdf: jsPDF,
    canvas: HTMLCanvasElement,
    canvasSize: { width: number; height: number },
    options: ExportOptions
  ) {
    const scale = options.quality === 'high' ? 2 : options.quality === 'standard' ? 1.5 : 1;
    const imgData = canvas.toDataURL('image/png', 1.0);
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    let scaleRatio = 1;
    if (options.format !== 'original') {
      scaleRatio = Math.min(pdfWidth / canvasSize.width, pdfHeight / canvasSize.height);
    }
    
    const finalWidth = canvasSize.width * scaleRatio;
    const finalHeight = canvasSize.height * scaleRatio;
    
    const x = (pdfWidth - finalWidth) / 2;
    const y = (pdfHeight - finalHeight) / 2;
    
    pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
  }

  private async getAlbumData(albumId: number) {
    return albumsAPI.getById(albumId);
  }

  private async getPageCanvasData(pageId: number): Promise<PageCanvasData> {
    return pagesAPI.getCanvas(pageId);
  }
}

// 单例导出
export const pdfExporter = new AlbumPDFExporter();
