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
      orderBy: { createdAt: 'asc' }
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

export default router;
