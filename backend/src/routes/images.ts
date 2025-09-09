import express from 'express';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { ShortCodeGenerator } from '../utils/shortCode';

const router = express.Router();
const prisma = new PrismaClient();

// 通过短链接访问图片
router.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    
    // 验证短代码格式
    if (!ShortCodeGenerator.isValid(shortCode)) {
      return res.status(400).json({ error: '无效的短链接代码' });
    }
    
    // 查找短链接记录
    const imageLink = await prisma.imageLink.findUnique({
      where: { shortCode },
      include: {
        image: true
      }
    });
    
    if (!imageLink) {
      return res.status(404).json({ error: '短链接不存在' });
    }
    
    // 检查链接是否激活
    if (!imageLink.isActive) {
      return res.status(404).json({ error: '链接已失效' });
    }
    
    // 检查是否过期
    if (imageLink.expiresAt && imageLink.expiresAt < new Date()) {
      return res.status(404).json({ error: '链接已过期' });
    }
    
    // 检查文件是否存在
    const filePath = imageLink.image.filePath;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '图片文件不存在' });
    }
    
    // 更新访问计数（异步，不影响响应速度）
    prisma.imageLink.update({
      where: { id: imageLink.id },
      data: { 
        accessCount: { increment: 1 },
        updatedAt: new Date()
      }
    }).catch(err => {
      console.error('更新访问计数失败:', err);
    });
    
    // 设置缓存头
    const etag = `"${imageLink.image.sha256.substring(0, 16)}"`;
    res.set({
      'Cache-Control': 'public, max-age=31536000', // 1年缓存
      'ETag': etag,
      'Content-Type': imageLink.image.mimeType,
      'Content-Length': imageLink.image.size.toString()
    });
    
    // 检查客户端缓存
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).send();
    }
    
    // 返回图片文件
    res.sendFile(path.resolve(filePath));
    
  } catch (error) {
    console.error('短链接访问错误:', error);
    res.status(500).json({ error: '获取图片失败' });
  }
});

// 获取短链接信息（需要认证）
router.get('/:shortCode/info', async (req, res) => {
  try {
    const { shortCode } = req.params;
    
    const imageLink = await prisma.imageLink.findUnique({
      where: { shortCode },
      include: {
        image: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
            createdAt: true
          }
        }
      }
    });
    
    if (!imageLink) {
      return res.status(404).json({ error: '短链接不存在' });
    }
    
    res.json({
      shortCode: imageLink.shortCode,
      accessCount: imageLink.accessCount,
      isActive: imageLink.isActive,
      expiresAt: imageLink.expiresAt,
      createdAt: imageLink.createdAt,
      image: imageLink.image
    });
    
  } catch (error) {
    console.error('获取短链接信息错误:', error);
    res.status(500).json({ error: '获取短链接信息失败' });
  }
});

export default router;