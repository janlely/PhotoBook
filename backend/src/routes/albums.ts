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
      select: {
        id: true,
        title: true,
        parentId: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        background: true,
        isUseGlobalBackground: true,
        children: {
          select: {
            id: true,
            title: true,
            parentId: true,
            createdAt: true,
            updatedAt: true
          }
        },
        pages: {
          select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
            background: true
          }
        }
      }
    });
    
    console.log('获取用户的所有相册:', JSON.stringify(albums));
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

    console.log('🔄 Backend: 创建相册开始', { userId, title, parentId, timestamp: Date.now() });

    const album = await prisma.album.create({
      data: {
        title,
        parentId: parentId || null,
        userId: userId!
      },
      select: {
        id: true,
        title: true,
        parentId: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        background: true,
        isUseGlobalBackground: true,
        children: {
          select: {
            id: true,
            title: true,
            parentId: true,
            createdAt: true,
            updatedAt: true
          }
        },
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

    console.log('✅ Backend: 相册创建成功', { albumId: album.id, title, timestamp: Date.now() });

    res.status(201).json(album);
  } catch (error) {
    console.error('❌ Backend: 创建相册错误:', error);
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
      select: {
        id: true,
        title: true,
        parentId: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        background: true,
        isUseGlobalBackground: true,
        children: {
          select: {
            id: true,
            title: true,
            parentId: true,
            createdAt: true,
            updatedAt: true
          }
        },
        pages: {
          select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true
          }
        },
        parent: {
          select: {
            id: true,
            title: true
          }
        }
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
      select: {
        id: true,
        title: true,
        parentId: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        background: true,
        isUseGlobalBackground: true,
        children: {
          select: {
            id: true,
            title: true,
            parentId: true,
            createdAt: true,
            updatedAt: true
          }
        },
        pages: {
          select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true
          }
        },
        parent: {
          select: {
            id: true,
            title: true
          }
        }
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

// 更新相册背景
router.put('/:id/background', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const albumId = parseInt(req.params.id);
    const { background } = req.body;

    const album = await prisma.album.findFirst({
      where: { id: albumId, userId }
    });

    if (!album) {
      return res.status(404).json({ error: '相册不存在' });
    }

    const updatedAlbum = await prisma.album.update({
      where: { id: albumId },
      data: {
        background: background || null
      }
    });

    res.json({ message: '相册背景更新成功', background: updatedAlbum.background });
  } catch (error) {
    console.error('更新相册背景错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取相册背景
router.get('/:id/background', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const albumId = parseInt(req.params.id);

    const album = await prisma.album.findFirst({
      where: {
        id: albumId,
        userId
      },
      select: {
        background: true,
        isUseGlobalBackground: true
      }
    });

    if (!album) {
      return res.status(404).json({ error: '相册不存在' });
    }

    // 向后兼容：如果没有新background字段但有旧字段，返回转换后的格式
    let background = album.background;

    res.json({
      background,
      isUseGlobalBackground: album.isUseGlobalBackground
    });
  } catch (error) {
    console.error('获取相册背景错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 更新相册全局背景设置
router.put('/:id/global-background', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const albumId = parseInt(req.params.id);
    const { isUseGlobalBackground } = req.body;

    const album = await prisma.album.findFirst({
      where: { id: albumId, userId }
    });

    if (!album) {
      return res.status(404).json({ error: '相册不存在' });
    }

    const updatedAlbum = await prisma.album.update({
      where: { id: albumId },
      data: {
        isUseGlobalBackground: isUseGlobalBackground || false
      }
    });

    res.json({
      message: '相册全局背景设置更新成功',
      isUseGlobalBackground: updatedAlbum.isUseGlobalBackground
    });
  } catch (error) {
    console.error('更新相册全局背景设置错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
