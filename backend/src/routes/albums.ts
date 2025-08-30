import express from 'express';
import { PrismaClient } from '../generated/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// 获取用户的所有相册
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    
    const albums = await prisma.album.findMany({
      where: { userId },
      include: {
        children: true,
        pages: {
          select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });
    
    res.json(albums);
  } catch (error) {
    console.error('获取相册错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 创建新相册
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { title, parentId } = req.body;
    
    const album = await prisma.album.create({
      data: {
        title,
        parentId: parentId || null,
        userId: userId!
      },
      include: {
        children: true,
        pages: true
      }
    });
    
    res.status(201).json(album);
  } catch (error) {
    console.error('创建相册错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取单个相册详情
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const albumId = parseInt(req.params.id);
    
    const album = await prisma.album.findFirst({
      where: {
        id: albumId,
        userId
      },
      include: {
        children: true,
        pages: true,
        parent: true
      }
    });
    
    if (!album) {
      return res.status(404).json({ error: '相册不存在' });
    }
    
    res.json(album);
  } catch (error) {
    console.error('获取相册详情错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 更新相册
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const albumId = parseInt(req.params.id);
    const { title, parentId } = req.body;
    
    const album = await prisma.album.findFirst({
      where: { id: albumId, userId }
    });
    
    if (!album) {
      return res.status(404).json({ error: '相册不存在' });
    }
    
    const updatedAlbum = await prisma.album.update({
      where: { id: albumId },
      data: {
        title,
        parentId: parentId || null
      },
      include: {
        children: true,
        pages: true,
        parent: true
      }
    });
    
    res.json(updatedAlbum);
  } catch (error) {
    console.error('更新相册错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 删除相册
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const albumId = parseInt(req.params.id);
    
    const album = await prisma.album.findFirst({
      where: { id: albumId, userId }
    });
    
    if (!album) {
      return res.status(404).json({ error: '相册不存在' });
    }
    
    // 递归删除所有子相册
    await deleteAlbumAndChildren(albumId);
    
    res.json({ message: '相册删除成功' });
  } catch (error) {
    console.error('删除相册错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 递归删除相册及其所有子相册
async function deleteAlbumAndChildren(albumId: number) {
  // 获取所有子相册
  const children = await prisma.album.findMany({
    where: { parentId: albumId }
  });
  
  // 递归删除子相册
  for (const child of children) {
    await deleteAlbumAndChildren(child.id);
  }
  
  // 删除相册中的所有页面
  await prisma.page.deleteMany({
    where: { albumId }
  });
  
  // 删除相册
  await prisma.album.delete({
    where: { id: albumId }
  });
}

export default router;
