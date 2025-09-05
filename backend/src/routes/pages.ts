import express from 'express';
import { PrismaClient } from '../generated/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// 获取相册中的所有页面
router.get('/album/:albumId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const albumId = parseInt(req.params.albumId);
    
    // 验证相册属于当前用户
    const album = await prisma.album.findFirst({
      where: { id: albumId, userId }
    });
    
    if (!album) {
      return res.status(404).json({ error: '相册不存在或无权限访问' });
    }
    
    const pages = await prisma.page.findMany({
      where: { albumId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        content: true,
        albumId: true,
        createdAt: true,
        updatedAt: true,
        background: true,
        backgroundColor: true,
        backgroundImage: true
      }
    });
    
    res.json(pages);
  } catch (error) {
    console.error('获取页面错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取单个页面详情
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const pageId = parseInt(req.params.id);
    
    const page = await prisma.page.findFirst({
      where: {
        id: pageId,
        album: {
          userId
        }
      }
    });
    
    if (!page) {
      return res.status(404).json({ error: '页面不存在或无权限访问' });
    }
    
    res.json(page);
  } catch (error) {
    console.error('获取页面详情错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 创建新页面
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { title, content, albumId } = req.body;
    
    // 验证相册属于当前用户
    const album = await prisma.album.findFirst({
      where: { id: albumId, userId }
    });
    
    if (!album) {
      return res.status(404).json({ error: '相册不存在或无权限访问' });
    }
    
    const page = await prisma.page.create({
      data: {
        title,
        content: content || '{}',
        albumId
      },
      select: {
        id: true,
        title: true,
        content: true,
        albumId: true,
        createdAt: true,
        updatedAt: true,
        background: true,
        backgroundColor: true,
        backgroundImage: true
      }
    });
    
    res.status(201).json(page);
  } catch (error) {
    console.error('创建页面错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 更新页面
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const pageId = parseInt(req.params.id);
    const { title, content } = req.body;
    
    const page = await prisma.page.findFirst({
      where: {
        id: pageId,
        album: {
          userId
        }
      }
    });
    
    if (!page) {
      return res.status(404).json({ error: '页面不存在或无权限访问' });
    }
    
    const updatedPage = await prisma.page.update({
      where: { id: pageId },
      data: {
        title,
        content
      },
      select: {
        id: true,
        title: true,
        content: true,
        albumId: true,
        createdAt: true,
        updatedAt: true,
        background: true,
        backgroundColor: true,
        backgroundImage: true
      }
    });
    
    res.json(updatedPage);
  } catch (error) {
    console.error('更新页面错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 删除页面
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const pageId = parseInt(req.params.id);
    
    const page = await prisma.page.findFirst({
      where: {
        id: pageId,
        album: {
          userId
        }
      }
    });
    
    if (!page) {
      return res.status(404).json({ error: '页面不存在或无权限访问' });
    }
    
    await prisma.page.delete({
      where: { id: pageId }
    });
    
    res.json({ message: '页面删除成功' });
  } catch (error) {
    console.error('删除页面错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 更新页面画布数据
router.put('/:id/canvas', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const pageId = parseInt(req.params.id);
    const { canvasSize, elements, version } = req.body;
    
    const page = await prisma.page.findFirst({
      where: {
        id: pageId,
        album: {
          userId
        }
      },
      select: {
        id: true,
        title: true,
        content: true,
        albumId: true,
        createdAt: true,
        updatedAt: true,
        background: true,
        backgroundColor: true,
        backgroundImage: true
      }
    });
    
    if (!page) {
      return res.status(404).json({ error: '页面不存在或无权限访问' });
    }
    
    const canvasData = {
      canvasSize,
      elements,
      version: version || 1,
      lastModified: new Date().toISOString()
    };
    
    const updatedPage = await prisma.page.update({
      where: { id: pageId },
      data: {
        content: JSON.stringify(canvasData)
      },
      select: {
        id: true,
        title: true,
        content: true,
        albumId: true,
        createdAt: true,
        updatedAt: true,
        background: true,
        backgroundColor: true,
        backgroundImage: true
      }
    });
    
    res.json({ message: '画布数据保存成功', lastModified: canvasData.lastModified });
  } catch (error) {
    console.error('保存画布数据错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取页面画布数据
router.get('/:id/canvas', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const pageId = parseInt(req.params.id);
    
    const page = await prisma.page.findFirst({
      where: {
        id: pageId,
        album: {
          userId
        }
      }
    });
    
    if (!page) {
      return res.status(404).json({ error: '页面不存在或无权限访问' });
    }
    
    try {
      const canvasData = page.content ? JSON.parse(page.content) : {
        canvasSize: { width: 800, height: 600 },
        elements: [],
        version: 1,
        lastModified: new Date().toISOString()
      };
      
      res.json(canvasData);
    } catch (parseError) {
      console.error('解析画布数据错误:', parseError);
      // 如果内容解析失败，返回默认数据
      res.json({
        canvasSize: { width: 800, height: 600 },
        elements: [],
        version: 1,
        lastModified: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('获取画布数据错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 更新页面背景
router.put('/:id/background', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const pageId = parseInt(req.params.id);
    const { background } = req.body;

    const page = await prisma.page.findFirst({
      where: {
        id: pageId,
        album: {
          userId
        }
      }
    });

    if (!page) {
      return res.status(404).json({ error: '页面不存在或无权限访问' });
    }

    const updatedPage = await prisma.page.update({
      where: { id: pageId },
      data: {
        background: background || null
      },
      select: {
        id: true,
        title: true,
        content: true,
        albumId: true,
        createdAt: true,
        updatedAt: true,
        background: true,
        backgroundColor: true,
        backgroundImage: true
      }
    });

    res.json({ message: '页面背景更新成功', background: updatedPage.background });
  } catch (error) {
    console.error('更新页面背景错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取页面背景
router.get('/:id/background', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const pageId = parseInt(req.params.id);

    const page = await prisma.page.findFirst({
      where: {
        id: pageId,
        album: {
          userId
        }
      },
      select: {
        background: true,
        backgroundColor: true,
        backgroundImage: true
      }
    });

    if (!page) {
      return res.status(404).json({ error: '页面不存在或无权限访问' });
    }

    // 向后兼容：如果没有新background字段但有旧字段，返回转换后的格式
    let background = page.background;
    if (!background) {
      if (page.backgroundImage) {
        background = {
          type: 'image',
          url: page.backgroundImage
        };
      } else if (page.backgroundColor) {
        background = {
          type: 'solid',
          color: page.backgroundColor
        };
      } else {
        background = {
          type: 'solid',
          color: '#FFFFFF'
        };
      }
    }

    res.json({ background });
  } catch (error) {
    console.error('获取页面背景错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
