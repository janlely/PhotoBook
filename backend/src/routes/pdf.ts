import express from 'express';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

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
    const baseStyle = `position:absolute;left:${transform.x}px;top:${transform.y}px;width:${transform.width}px;height:${transform.height}px;transform:rotate(${transform.rotation}deg) scale(${transform.scaleX}, ${transform.scaleY});transform-origin:center center;z-index:${element.zIndex};`;

    switch (element.type) {
      case 'text':
        const textStyle = `${baseStyle}font-size:${element.fontSize || 16}px;font-family:${element.fontFamily || 'Arial'},sans-serif;font-weight:${element.fontWeight || 'normal'};font-style:${element.fontStyle || 'normal'};color:${element.color || '#000000'};text-align:${element.textAlign || 'left'};line-height:${element.lineHeight || 1.2};white-space:pre-wrap;word-break:break-word;opacity:${element.opacity || 1};`;
        return `<div style="${textStyle}">${element.content || ''}</div>`;

      case 'image':
        const borderStyle = element.border ?
          `border:${element.border.width}px solid ${element.border.color};border-radius:${element.border.radius}px;` : '';
        const imageContainerStyle = `${baseStyle}${borderStyle}overflow:hidden;opacity:${element.opacity || 1};`;
        const imageStyle = 'width:100%;height:100%;object-fit:cover;display:block;';
        return `<div style="${imageContainerStyle}"><img src="${element.src}" style="${imageStyle}" /></div>`;

      case 'shape':
        const shapeStyle = element.shapeType === 'circle' ? 'border-radius:50%;' : '';
        const shapeElementStyle = `${baseStyle}background-color:${element.fill || 'transparent'};border:${element.strokeWidth || 1}px solid ${element.stroke || '#000000'};${shapeStyle}opacity:${element.opacity || 1};`;
        return `<div style="${shapeElementStyle}"></div>`;

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

// 创建PDF导出任务
router.post('/tasks', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { albumId } = req.body;

    if (!albumId) {
      return res.status(400).json({ error: '相册ID不能为空' });
    }

    // 验证相册权限
    const album = await prisma.album.findFirst({
      where: { id: parseInt(albumId), userId },
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

    // 创建导出任务
    const task = await prisma.pdfExportTask.create({
      data: {
        userId: userId!,
        albumId: parseInt(albumId),
        status: 'pending',
        progress: 0
      }
    });

    // 异步处理PDF生成
    processPdfExport(task.id);

    res.json({
      taskId: task.id,
      message: 'PDF导出任务已创建，开始处理中...'
    });

  } catch (error) {
    console.error('创建PDF导出任务失败:', error);
    res.status(500).json({ error: '创建导出任务失败' });
  }
});

// 获取任务进度
router.get('/tasks/:taskId/progress', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const taskId = parseInt(req.params.taskId);

    const task = await prisma.pdfExportTask.findFirst({
      where: { id: taskId, userId }
    });

    if (!task) {
      return res.status(404).json({ error: '任务不存在或无权限访问' });
    }

    res.json({
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      errorMessage: task.errorMessage
    });

  } catch (error) {
    console.error('获取任务进度失败:', error);
    res.status(500).json({ error: '获取任务进度失败' });
  }
});

// 下载完成的PDF
router.get('/tasks/:taskId/download', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const taskId = parseInt(req.params.taskId);

    const task = await prisma.pdfExportTask.findFirst({
      where: { id: taskId, userId },
      include: { album: true }
    });

    if (!task) {
      return res.status(404).json({ error: '任务不存在或无权限访问' });
    }

    if (task.status !== 'completed') {
      return res.status(400).json({ error: '任务尚未完成' });
    }

    if (!task.filePath || !fs.existsSync(task.filePath)) {
      return res.status(404).json({ error: 'PDF文件不存在' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${task.album.title}.pdf"`);

    const fileStream = fs.createReadStream(task.filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('下载PDF失败:', error);
    res.status(500).json({ error: '下载PDF失败' });
  }
});

// 获取用户的所有任务
router.get('/tasks', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;

    const tasks = await prisma.pdfExportTask.findMany({
      where: { userId },
      include: {
        album: {
          select: { id: true, title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tasks);

  } catch (error) {
    console.error('获取任务列表失败:', error);
    res.status(500).json({ error: '获取任务列表失败' });
  }
});

// 异步PDF生成函数
async function processPdfExport(taskId: number) {
  try {
    // 更新任务状态为处理中
    await prisma.pdfExportTask.update({
      where: { id: taskId },
      data: { status: 'processing', progress: 5 }
    });

    const task = await prisma.pdfExportTask.findUnique({
      where: { id: taskId },
      include: {
        album: {
          include: {
            pages: {
              orderBy: { createdAt: 'asc' }
            }
          }
        }
      }
    });

    if (!task) {
      throw new Error('任务不存在');
    }

    const album = task.album;
    const totalPages = album.pages.length;

    // 启动Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    // 获取画布尺寸
    const firstPageData = JSON.parse(album.pages[0].content || '{}');
    const canvasSize = firstPageData.canvasSize || { width: 800, height: 600 };

    const pdfBuffers: Buffer[] = [];

    for (let i = 0; i < totalPages; i++) {
      const pageData = album.pages[i];
      const progress = Math.floor(5 + (i / totalPages) * 85);

      await prisma.pdfExportTask.update({
        where: { id: taskId },
        data: { progress }
      });

      // 处理页面生成PDF的逻辑（复用原有代码）
      const page = await browser.newPage();
      page.setDefaultTimeout(60000);
      page.setDefaultNavigationTimeout(60000);

      await page.setViewport({
        width: Math.ceil(canvasSize.width),
        height: Math.ceil(canvasSize.height),
        deviceScaleFactor: 1
      });

      try {
        const canvasData: PageCanvasData = JSON.parse(pageData.content || '{}');

        let background: BackgroundStyle = { type: 'solid', color: '#FFFFFF' };

        if (album.isUseGlobalBackground) {
          if (pageData.background) {
            background = pageData.background as unknown as BackgroundStyle;
          }
        } else {
          if (album.background) {
            background = album.background as unknown as BackgroundStyle;
          }
        }

        const html = generateHTMLTemplate(canvasData, background);

        await page.setContent(html, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 5000));

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

        pdfBuffers.push(Buffer.from(pdfBuffer));

      } catch (error) {
        console.error(`处理页面 ${pageData.id} 时出错:`, error);
      } finally {
        try {
          if (!page.isClosed()) {
            await page.close();
          }
        } catch (closeError) {
          console.error(`关闭页面 ${pageData.id} 时出错:`, closeError);
        }
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    await browser.close();

    if (pdfBuffers.length === 0) {
      throw new Error('PDF生成失败');
    }

    // 合并PDF
    let finalPdfBuffer: Buffer;
    if (pdfBuffers.length === 1) {
      finalPdfBuffer = pdfBuffers[0];
    } else {
      const mergedPdf = await PDFDocument.create();
      for (const pdfBuffer of pdfBuffers) {
        const pdf = await PDFDocument.load(pdfBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      finalPdfBuffer = Buffer.from(await mergedPdf.save());
    }

    // 保存文件
    const pdfDir = path.join(__dirname, '../../pdf_exports');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const fileName = `export_${taskId}_${Date.now()}.pdf`;
    const filePath = path.join(pdfDir, fileName);

    fs.writeFileSync(filePath, finalPdfBuffer);

    // 更新任务状态为完成
    await prisma.pdfExportTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        progress: 100,
        filePath,
        fileSize: finalPdfBuffer.length
      }
    });

  } catch (error) {
    console.error('PDF导出处理失败:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    await prisma.pdfExportTask.update({
      where: { id: taskId },
      data: {
        status: 'failed',
        errorMessage
      }
    });
  }
}

// 保留原有路由用于向后兼容（重定向到新API）
router.get('/album/:albumId', authenticateToken, async (req: AuthRequest, res) => {
  res.status(410).json({
    error: '此API已废弃，请使用POST /api/pdf/tasks创建异步导出任务',
    deprecated: true
  });
});

export default router;