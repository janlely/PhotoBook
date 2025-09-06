import express from 'express';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { PrismaClient } from '../generated/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import path from 'path';

const router = express.Router();
const prisma = new PrismaClient();

// 数据类型定义
interface CanvasElement {
  id: string;
  type: 'image' | 'text' | 'shape';
  transform: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
  };
  visible: boolean;
  locked: boolean;
  zIndex: number;
  src?: string;
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  color?: string;
  textAlign?: string;
  lineHeight?: number;
  opacity?: number;
  border?: {
    width: number;
    color: string;
    radius: number;
  };
  shapeType?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

interface PageCanvasData {
  canvasSize: { width: number; height: number };
  elements: CanvasElement[];
  version?: number;
  lastModified?: string;
}

interface BackgroundStyle {
  type: 'solid' | 'gradient' | 'image';
  color?: string;
  url?: string;
  size?: string;
  gradientType?: 'linear' | 'radial';
  direction?: string;
  stops?: Array<{ color: string; position: number }>;
}

// 生成HTML模板
function generateHTMLTemplate(pageData: PageCanvasData, background: BackgroundStyle): string {
  const { canvasSize, elements } = pageData;

  // 生成背景样式
  const getBackgroundStyle = (bg: BackgroundStyle): string => {
    switch (bg.type) {
      case 'solid':
        return `background-color: ${bg.color || '#FFFFFF'};`;
      case 'gradient':
        if (bg.gradientType === 'linear') {
          const stops = bg.stops?.map(stop => `${stop.color} ${stop.position}%`).join(', ') || '';
          return `background: linear-gradient(${bg.direction || 'to bottom'}, ${stops});`;
        } else {
          const stops = bg.stops?.map(stop => `${stop.color} ${stop.position}%`).join(', ') || '';
          return `background: radial-gradient(circle, ${stops});`;
        }
      case 'image':
        return `background-image: url(${bg.url}); background-size: ${bg.size || 'cover'}; background-position: center; background-repeat: no-repeat;`;
      default:
        return 'background-color: #FFFFFF;';
    }
  };

  // 生成元素HTML
  const generateElementHTML = (element: CanvasElement): string => {
    const { transform } = element;
    const baseStyle = `
      position: absolute;
      left: ${transform.x}px;
      top: ${transform.y}px;
      width: ${transform.width}px;
      height: ${transform.height}px;
      transform: rotate(${transform.rotation}deg) scale(${transform.scaleX}, ${transform.scaleY});
      transform-origin: center center;
      z-index: ${element.zIndex};
    `;

    switch (element.type) {
      case 'text':
        return `
          <div style="
            ${baseStyle}
            font-size: ${element.fontSize || 16}px;
            font-family: ${element.fontFamily || 'Arial'}, sans-serif;
            font-weight: ${element.fontWeight || 'normal'};
            font-style: ${element.fontStyle || 'normal'};
            color: ${element.color || '#000000'};
            text-align: ${element.textAlign || 'left'};
            line-height: ${element.lineHeight || 1.2};
            white-space: pre-wrap;
            word-break: break-word;
            opacity: ${element.opacity || 1};
          ">
            ${element.content || ''}
          </div>
        `;

      case 'image':
        const borderStyle = element.border ?
          `border: ${element.border.width}px solid ${element.border.color}; border-radius: ${element.border.radius}px;` : '';

        return `
          <div style="
            ${baseStyle}
            ${borderStyle}
            overflow: hidden;
            opacity: ${element.opacity || 1};
          ">
            <img src="${element.src}" style="
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            " />
          </div>
        `;

      case 'shape':
        const shapeStyle = element.shapeType === 'circle' ? 'border-radius: 50%;' : '';
        return `
          <div style="
            ${baseStyle}
            background-color: ${element.fill || 'transparent'};
            border: ${element.strokeWidth || 1}px solid ${element.stroke || '#000000'};
            ${shapeStyle}
            opacity: ${element.opacity || 1};
          "></div>
        `;

      default:
        return '';
    }
  };

  // 按zIndex排序元素
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);
  const elementsHTML = sortedElements.map(generateElementHTML).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PhotoBook Page</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          width: ${canvasSize.width}px;
          height: ${canvasSize.height}px;
          ${getBackgroundStyle(background)}
          position: relative;
          overflow: hidden;
        }

        .canvas-container {
          width: 100%;
          height: 100%;
          position: relative;
        }

        img {
          max-width: 100%;
          height: auto;
        }
      </style>
    </head>
    <body>
      <div class="canvas-container">
        ${elementsHTML}
      </div>
    </body>
    </html>
  `;
}

// 导出相册为PDF
router.get('/album/:albumId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const albumId = parseInt(req.params.albumId);

    // 验证相册权限
    const album = await prisma.album.findFirst({
      where: { id: albumId, userId },
      include: {
        pages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!album) {
      return res.status(404).json({ error: '相册不存在或无权限访问' });
    }

    if (album.pages.length === 0) {
      return res.status(400).json({ error: '相册中没有页面' });
    }

    // 启动Puppeteer - 使用更简单的配置
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    // 获取画布尺寸（从第一页获取）
    const firstPageData = JSON.parse(album.pages[0].content || '{}');
    const canvasSize = firstPageData.canvasSize || { width: 800, height: 600 };
    console.log('画布尺寸:', canvasSize);

    // 处理每一页
    const pdfBuffers: Buffer[] = [];
    console.log(`开始处理相册 ${albumId}，共有 ${album.pages.length} 个页面`);

    for (let i = 0; i < album.pages.length; i++) {
      const pageData = album.pages[i];
      console.log(`处理第 ${i + 1} 页，页面ID: ${pageData.id}`);

      // 在处理每个页面之间添加延迟，避免资源竞争
      if (i > 0) {
        console.log(`等待 2 秒后处理下一个页面...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // 为每个页面创建新的Puppeteer页面对象
      const page = await browser.newPage();

      // 设置页面超时和视口
      page.setDefaultTimeout(60000); // 60秒超时
      page.setDefaultNavigationTimeout(60000);

      await page.setViewport({
        width: Math.ceil(canvasSize.width),
        height: Math.ceil(canvasSize.height),
        deviceScaleFactor: 1
      });

      try {
        // 解析画布数据
        const canvasData: PageCanvasData = JSON.parse(pageData.content || '{}');
        console.log(`页面 ${pageData.id} 的画布数据:`, {
          canvasSize: canvasData.canvasSize,
          elementsCount: canvasData.elements?.length || 0
        });

        // 获取页面背景
        let background: BackgroundStyle = { type: 'solid', color: '#FFFFFF' };

        if (album.isUseGlobalBackground) {
          // 使用页面背景
          if (pageData.background) {
            background = pageData.background as unknown as BackgroundStyle;
            console.log(`页面 ${pageData.id} 使用页面背景:`, background);
          }
        } else {
          // 使用相册背景
          if (album.background) {
            background = album.background as unknown as BackgroundStyle;
            console.log(`页面 ${pageData.id} 使用相册背景:`, background);
          }
        }

        // 生成HTML
        let html = generateHTMLTemplate(canvasData, background);

        // 如果有图片元素，尝试将图片转换为base64嵌入，避免网络请求问题
        if (canvasData.elements.some(el => el.type === 'image')) {
          console.log(`页面 ${pageData.id} 包含图片元素，尝试转换图片URL`);

          // 这里可以添加图片预处理逻辑
          // 暂时保持原有逻辑
        }

        // 保存HTML文件用于调试
        const fs = require('fs');
        const path = require('path');
        const htmlDir = path.join(__dirname, '../../html_debug');
        if (!fs.existsSync(htmlDir)) {
          fs.mkdirSync(htmlDir, { recursive: true });
        }
        const htmlFileName = `${albumId}-${pageData.id}.html`;
        const htmlFilePath = path.join(htmlDir, htmlFileName);
        fs.writeFileSync(htmlFilePath, html);
        console.log(`HTML文件已保存: ${htmlFilePath}`);

        // 设置页面内容
        console.log(`设置页面 ${pageData.id} 内容，HTML大小: ${html.length} 字符`);
        await page.setContent(html, {
          waitUntil: 'domcontentloaded', // 改为只等待DOM加载，不等待网络请求
          timeout: 30000
        });

        // 等待一小段时间让页面稳定
        console.log(`等待页面 ${pageData.id} 稳定`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 生成PDF
        const pdfBuffer = await page.pdf({
          width: `${canvasSize.width}px`,
          height: `${canvasSize.height}px`,
          printBackground: true,
          preferCSSPageSize: true,
          margin: {
            top: '0px',
            right: '0px',
            bottom: '0px',
            left: '0px'
          }
        });

        const buffer = Buffer.from(pdfBuffer);
        pdfBuffers.push(buffer);
        console.log(`页面 ${pageData.id} PDF生成完成，缓冲区大小: ${buffer.length} bytes`);

      } catch (error) {
        console.error(`处理页面 ${pageData.id} 时出错:`, error);
        // 如果是连接问题，停止处理后续页面
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Connection') || errorMessage.includes('detached')) {
          console.error('检测到连接问题，停止处理后续页面');
          break;
        }
        // 继续处理其他页面
      } finally {
        // 确保页面被关闭
        try {
          if (!page.isClosed()) {
            await page.close();
            console.log(`页面 ${pageData.id} 已关闭`);
          }
        } catch (closeError) {
          console.error(`关闭页面 ${pageData.id} 时出错:`, closeError);
        }

        // 在页面处理完成后添加额外延迟，避免资源竞争
        console.log(`页面 ${pageData.id} 处理完成，等待 3 秒...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log(`PDF缓冲区数组长度: ${pdfBuffers.length}`);

    // 关闭浏览器
    try {
      await browser.close();
      console.log('浏览器已关闭');
    } catch (closeError) {
      console.error('关闭浏览器时出错:', closeError);
    }

    if (pdfBuffers.length === 0) {
      return res.status(500).json({ error: 'PDF生成失败' });
    }

    // 处理PDF输出
    let finalPdfBuffer: Buffer;
    console.log(`开始处理PDF输出，缓冲区数量: ${pdfBuffers.length}`);

    if (pdfBuffers.length === 1) {
      // 单个页面直接返回
      console.log('单个页面，直接返回');
      finalPdfBuffer = pdfBuffers[0];
    } else {
      // 多个页面需要合并
      console.log('多个页面，开始合并PDF');
      const mergedPdf = await PDFDocument.create();
      console.log('创建了新的PDF文档');

      let totalPages = 0;
      for (let i = 0; i < pdfBuffers.length; i++) {
        const pdfBuffer = pdfBuffers[i];
        console.log(`处理第 ${i + 1} 个PDF缓冲区，大小: ${pdfBuffer.length} bytes`);

        const pdf = await PDFDocument.load(pdfBuffer);
        const pageCount = pdf.getPageCount();
        console.log(`PDF ${i + 1} 有 ${pageCount} 页`);

        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        console.log(`复制了 ${copiedPages.length} 页`);

        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
          totalPages++;
        });
      }

      console.log(`合并完成，总共 ${totalPages} 页`);
      finalPdfBuffer = Buffer.from(await mergedPdf.save());
      console.log(`最终PDF大小: ${finalPdfBuffer.length} bytes`);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${album.title}.pdf"`);
    res.send(finalPdfBuffer);

  } catch (error) {
    console.error('PDF导出错误:', error);
    res.status(500).json({ error: 'PDF导出失败' });
  }
});

export default router;