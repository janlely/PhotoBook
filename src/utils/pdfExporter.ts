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

    console.log('container size:', container.style.width, container.style.height);
    
    this.virtualDocument.body.appendChild(container);
    
    // 渲染所有元素
    for (const element of pageData.elements) {
      const elementDiv = this.createElementDiv(element);
      container.appendChild(elementDiv);
    }
    
    // 调试：创建可视化预览
    // this.renderContainerDiVForDebug(container)
    
    // 转换为Canvas
    console.log('canvas size:', pageData.canvasSize.width, pageData.canvasSize.height);
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
    
    console.log('element type:', element.type, '   element size:', div.style.width, div.style.height);
    
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
    // textDiv.style.alignItems = 'center';
    
    container.appendChild(textDiv);
    return container;
  }

  private createImageElement(element: ImageElement, container: HTMLElement): HTMLElement {
    const img = this.virtualDocument.createElement('img');
    img.src = element.src;
    img.alt = element.alt || '';

    // 创建图片容器作为视窗 - 不修改传入的container样式
    const imageContainer = this.virtualDocument.createElement('div');
    imageContainer.style.position = 'relative';
    imageContainer.style.overflow = 'hidden';
    imageContainer.style.width = '100%';
    imageContainer.style.height = '100%';

    // 添加边框样式（如果有）
    if (element.border) {
      imageContainer.style.border = `${element.border.width}px solid ${element.border.color}`;
      imageContainer.style.borderRadius = `${element.border.radius}px`;
    }

    // 创建背景图片容器，使用background-size: cover来确保宽高比
    const backgroundContainer = this.virtualDocument.createElement('div');
    backgroundContainer.style.position = 'absolute';
    backgroundContainer.style.top = '0';
    backgroundContainer.style.left = '0';
    backgroundContainer.style.width = '100%';
    backgroundContainer.style.height = '100%';
    backgroundContainer.style.backgroundImage = `url(${element.src})`;
    backgroundContainer.style.backgroundSize = 'cover';
    backgroundContainer.style.backgroundPosition = 'center center';
    backgroundContainer.style.backgroundRepeat = 'no-repeat';
    backgroundContainer.style.opacity = element.opacity.toString();

    // 将背景容器添加到图片容器
    imageContainer.appendChild(backgroundContainer);
    // 将图片容器添加到传入的container
    container.appendChild(imageContainer);
    
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

    // 创建临时容器并附加到文档
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '0';
    tempContainer.style.top = '0';
    tempContainer.style.width = '0';
    tempContainer.style.height = '0';
    tempContainer.style.overflow = 'hidden';
    tempContainer.style.zIndex = '-1000';
    tempContainer.style.pointerEvents = 'none';
    document.body.appendChild(tempContainer);
    tempContainer.appendChild(container);

    try {
      // 小尺寸直接渲染
      if (size.width <= CHUNK_SIZE && size.height <= CHUNK_SIZE) {
        console.log('window.devicePixelRatio: ', window.devicePixelRatio)
        const chunk = await html2canvas(container as any, {
          // scale: window.devicePixelRatio,
          scale: 1,
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
    } finally {
      // 清理临时容器
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
    }
  }

  destroy() {
    this.virtualDocument.body.innerHTML = '';
  }

  renderContainerDiVForDebug(div: HTMLDivElement) {
    const debugWindow = window.open('', '_blank', 'width=1200,height=800');
    if (debugWindow) {
      const debugDoc = debugWindow.document;
      debugDoc.open();
      debugDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>调试 - 页面渲染预览</title>
          <style>
            body { margin: 0; padding: 20px; background: #f0f0f0; font-family: Arial, sans-serif; }
            .debug-info { 
              background: white; 
              padding: 15px; 
              margin-bottom: 15px;
              border: 1px solid #ccc;
              border-radius: 4px;
            }
            .render-container {
              border: 2px dashed #007acc;
              background: white;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              margin: 0 auto;
            }
            .element-info {
              position: absolute;
              top: 5px;
              left: 5px;
              background: rgba(0,0,0,0.7);
              color: white;
              padding: 2px 5px;
              font-size: 10px;
              border-radius: 2px;
            }
          </style>
        </head>
        <body>
        </body>
        </html>
      `);
      debugDoc.close();
      debugDoc.body.appendChild(div.cloneNode(true));
    }
  }

  renderContainerForDebug(pageData: PageCanvasData) {
    const debugWindow = window.open('', '_blank', 'width=1200,height=800');
    if (debugWindow) {
      const debugDoc = debugWindow.document;
      debugDoc.open();
      debugDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>调试 - 页面渲染预览</title>
          <style>
            body { margin: 0; padding: 20px; background: #f0f0f0; font-family: Arial, sans-serif; }
            .debug-info { 
              background: white; 
              padding: 15px; 
              margin-bottom: 15px;
              border: 1px solid #ccc;
              border-radius: 4px;
            }
            .render-container {
              border: 2px dashed #007acc;
              background: white;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              margin: 0 auto;
            }
            .element-info {
              position: absolute;
              top: 5px;
              left: 5px;
              background: rgba(0,0,0,0.7);
              color: white;
              padding: 2px 5px;
              font-size: 10px;
              border-radius: 2px;
            }
          </style>
        </head>
        <body>
          <div class="debug-info">
            <h3>页面调试信息</h3>
            <p><strong>画布尺寸:</strong> ${pageData.canvasSize.width} × ${pageData.canvasSize.height}px</p>
            <p><strong>元素数量:</strong> ${pageData.elements.length}</p>
            <p><strong>缩放比例:</strong> 100%</p>
            <p><strong>物理尺寸:</strong> ${(pageData.canvasSize.width * 0.24).toFixed(2)} × ${(pageData.canvasSize.height * 0.24).toFixed(2)}pt</p>
          </div>
          <div class="render-container" id="debug-container"></div>
        </body>
        </html>
      `);
      debugDoc.close();
      
      // 复制渲染容器到调试窗口
      const debugContainer = debugDoc.getElementById('debug-container');
      if (debugContainer) {
        debugContainer.style.width = `${pageData.canvasSize.width}px`;
        debugContainer.style.height = `${pageData.canvasSize.height}px`;
        debugContainer.style.position = 'relative';
        
        // 复制所有元素
        for (const element of pageData.elements) {
          const elementDiv = this.createElementDiv(element);
          debugContainer.appendChild(elementDiv.cloneNode(true));
        }
      }
      
      // 添加调试控制
      debugDoc.body.insertAdjacentHTML('beforeend', `
        <div style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="margin: 5px; padding: 10px 20px;">打印预览</button>
          <button onclick="window.close()" style="margin: 5px; padding: 10px 20px;">关闭</button>
        </div>
      `);
    }
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

      // 创建PDF
      let pdf: jsPDF = new jsPDF({
        orientation: options.orientation,
        unit: 'px'
      });
      pdf.deletePage(1);


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

        // 调试：在新tab中显示canvas供检查
        // this.renderCanvasForDebug(pageData, canvas, i);
        
        
        this.addPageToPDF(pdf, canvas, pageData.canvasSize);
      }

      this.updateProgress({
        currentPage: pagesData.length,
        totalPages: pagesData.length,
        progress: 95,
        status: 'generating'
      });

      const blob = pdf?.output('blob');
      
      this.updateProgress({
        currentPage: pagesData.length,
        totalPages: pagesData.length,
        progress: 100,
        status: 'complete'
      });

      return blob!;
    } catch (error) {
      console.error('PDF导出失败:', error);
      throw error;
    } finally {
      this.renderer.destroy();
    }

  }


  renderCanvasForDebug(pageData: PageCanvasData, canvas: HTMLCanvasElement, i = 0) {
    const previewWindow = window.open('', `_blank_canvas_${i}`, 'width=1300,height=900');
    if (previewWindow) {
      const previewDoc = previewWindow.document;
      previewDoc.open();
      previewDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Canvas预览 - 第${i + 1}页</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  background: #f5f5f5; 
                  font-family: Arial, sans-serif;
                  text-align: center;
                }
                .canvas-container {
                  display: inline-block;
                  border: 2px solid #007acc;
                  background: white;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                  margin: 10px;
                }
                .info-panel {
                  background: white;
                  padding: 15px;
                  margin: 10px auto;
                  max-width: 800px;
                  border-radius: 8px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                  text-align: left;
                }
                .info-panel h3 { margin-top: 0; color: #007acc; }
                .info-panel p { margin: 5px 0; }
                .canvas-info {
                  font-family: monospace;
                  background: #f8f8f8;
                  padding: 10px;
                  border-radius: 4px;
                  margin: 10px 0;
                }
              </style>
            </head>
            <body>
              <div class="info-panel">
                <h3>Canvas详细信息 - 第${i + 1}页</h3>
                <div class="canvas-info">
                  <strong>Canvas尺寸:</strong> ${canvas.width} × ${canvas.height} 像素<br>
                  <strong>CSS尺寸:</strong> ${pageData.canvasSize.width} × ${pageData.canvasSize.height}px<br>
                  <strong>物理尺寸:</strong> ${(pageData.canvasSize.width * 0.24).toFixed(2)} × ${(pageData.canvasSize.height * 0.24).toFixed(2)}pt<br>
                  <strong>像素密度:</strong> ${(canvas.width / pageData.canvasSize.width).toFixed(2)}x<br>
                  <strong>数据URL大小:</strong> ${(canvas.toDataURL().length / 1024).toFixed(2)} KB
                </div>
                <p><strong>检查要点:</strong></p>
                <ul>
                  <li>画布内容是否完整显示</li>
                  <li>元素位置是否正确</li>
                  <li>图片是否加载成功</li>
                  <li>文字是否清晰可读</li>
                </ul>
              </div>
              
              <div class="canvas-container">
                <canvas id="preview-canvas-${i}"></canvas>
              </div>
              
              <div class="info-panel">
                <button onclick="window.print()" style="margin: 5px; padding: 10px 20px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">打印预览</button>
                <button onclick="downloadCanvas()" style="margin: 5px; padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">下载图片</button>
                <button onclick="window.close()" style="margin: 5px; padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">关闭</button>
              </div>
              
              <script>
                // 将canvas绘制到预览窗口
                const canvas = document.getElementById('preview-canvas-${i}');
                const ctx = canvas.getContext('2d');
                
                // 设置canvas尺寸
                canvas.width = ${canvas.width};
                canvas.height = ${canvas.height};
                
                // 创建Image对象来绘制canvas内容
                const img = new Image();
                img.onload = function() {
                  ctx.drawImage(img, 0, 0);
                  
                  // 添加网格线帮助检查对齐
                  ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
                  ctx.lineWidth = 1;
                  for(let x = 0; x < canvas.width; x += 100) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, canvas.height);
                    ctx.stroke();
                  }
                  for(let y = 0; y < canvas.height; y += 100) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(canvas.width, y);
                    ctx.stroke();
                  }
                };
                img.src = '${canvas.toDataURL()}';
                
                // 下载功能
                function downloadCanvas() {
                  const link = document.createElement('a');
                  link.download = 'page_${i + 1}_canvas.png';
                  link.href = canvas.toDataURL('image/png');
                  link.click();
                }
                
                // 双击放大查看
                canvas.addEventListener('dblclick', function() {
                  window.open(canvas.toDataURL(), '_blank');
                });
              </script>
            </body>
            </html>
          `);
      previewDoc.close();
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
  ) {

    pdf.addPage([canvasSize.width, canvasSize.height]);

    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', 0, 0, canvasSize.width, canvasSize.height);
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
