import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { ShortCodeGenerator } from '../utils/shortCode';

const router = express.Router();
const prisma = new PrismaClient();

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // 临时文件名，后面会根据SHA256重命名
    const tempName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, tempName);
  }
});

// 文件过滤器：只允许图片
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'));
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  }
});

// 计算文件SHA256哈希
const calculateSHA256 = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
};

// 上传图片接口
router.post('/image', authenticateToken, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的图片文件' });
    }

    if (!req.user?.userId) {
      return res.status(401).json({ error: '未授权访问' });
    }

    const filePath = req.file.path;
    
    // 计算文件SHA256哈希
    const sha256 = await calculateSHA256(filePath);
    
    // 生成基于SHA256的文件名
    const fileExtension = path.extname(req.file.originalname);
    const sha256FileName = `${sha256}${fileExtension}`;
    const sha256FilePath = path.join(path.dirname(filePath), sha256FileName);
    
    // 检查是否已存在相同SHA256的文件
    const existingImage = await prisma.image.findUnique({
      where: { sha256 }
    });
    
    if (existingImage) {
      // 删除新上传的重复文件（因为已存在相同内容的文件）
      fs.unlinkSync(filePath);
      
      // 为当前用户创建新的短链接指向已存在的图片
      let shortCode = ShortCodeGenerator.generate();
      
      // 确保短代码唯一性
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        const existingLink = await prisma.imageLink.findUnique({
          where: { shortCode }
        });
        
        if (!existingLink) break;
        
        shortCode = ShortCodeGenerator.generate();
        attempts++;
      }
      
      if (attempts === maxAttempts) {
        throw new Error('无法生成唯一的短链接代码');
      }
      
      // 为当前用户创建短链接记录
      const imageLink = await prisma.imageLink.create({
        data: {
          shortCode,
          imageId: existingImage.id,
          userId: req.user.userId
        }
      });
      
      // 获取配置的图片基础URL
      const imageBaseUrl = process.env.IMAGE_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const imageUrl = `${imageBaseUrl}/img/${shortCode}`;
      
      return res.status(201).json({
        message: '图片上传成功（使用已存在的文件）',
        image: {
          id: existingImage.id,
          filename: existingImage.filename,
          originalName: req.file.originalname, // 使用用户上传的原始文件名
          mimeType: existingImage.mimeType,
          size: existingImage.size,
          sha256: existingImage.sha256,
          url: imageUrl, // 返回新生成的短链接URL
          shortCode: shortCode,
          createdAt: existingImage.createdAt
        }
      });
    }
    
    // 将临时文件重命名为SHA256文件名
    try {
      // 检查SHA256文件是否已存在（防止文件系统冲突）
      if (fs.existsSync(sha256FilePath)) {
        // 如果文件系统中已存在，删除临时文件并使用已存在的文件
        fs.unlinkSync(filePath);
        console.log(`文件系统中已存在SHA256文件: ${sha256FileName}`);
      } else {
        // 重命名为SHA256文件名
        fs.renameSync(filePath, sha256FilePath);
        console.log(`文件已重命名: ${req.file.filename} -> ${sha256FileName}`);
      }
    } catch (error) {
      console.error('文件重命名失败:', error);
      // 如果重命名失败，保留原文件名但记录SHA256名
    }
    
    // 保存文件信息到数据库
    const savedImage = await prisma.image.create({
      data: {
        filename: sha256FileName, // 使用SHA256文件名
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        sha256,
        filePath: fs.existsSync(sha256FilePath) ? sha256FilePath : filePath, // 使用实际文件路径
        userId: req.user.userId
      }
    });
    
    // 生成短链接
    let shortCode = ShortCodeGenerator.generate();
    
    // 确保短代码唯一性
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      const existingLink = await prisma.imageLink.findUnique({
        where: { shortCode }
      });
      
      if (!existingLink) break;
      
      shortCode = ShortCodeGenerator.generate();
      attempts++;
    }
    
    if (attempts === maxAttempts) {
      throw new Error('无法生成唯一的短链接代码');
    }
    
    // 创建短链接记录
    const imageLink = await prisma.imageLink.create({
      data: {
        shortCode,
        imageId: savedImage.id,
        userId: req.user.userId
      }
    });
    
    // 获取配置的图片基础URL
    const imageBaseUrl = process.env.IMAGE_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${imageBaseUrl}/img/${shortCode}`;
    
    res.status(201).json({
      message: '图片上传成功',
      image: {
        id: savedImage.id,
        filename: savedImage.filename, // SHA256文件名
        originalName: savedImage.originalName,
        mimeType: savedImage.mimeType,
        size: savedImage.size,
        sha256: savedImage.sha256,
        url: imageUrl, // 返回短链接URL
        shortCode: shortCode, // 返回短代码（可选）
        createdAt: savedImage.createdAt
      }
    });
    
  } catch (error) {
    console.error('图片上传错误:', error);
    
    // 如果出错，删除已上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: '图片上传失败',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取图片文件
router.get('/image/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '图片文件不存在' });
    }
    
    res.sendFile(filePath);
  } catch (error) {
    console.error('获取图片错误:', error);
    res.status(500).json({ error: '获取图片失败' });
  }
});

// 获取用户上传的图片列表
router.get('/images', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: '未授权访问' });
    }
    
    const images = await prisma.image.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        sha256: true,
        createdAt: true
      }
    });
    
    const imagesWithUrls = images.map((image: { filename: any; }) => ({
      ...image,
      filePath: `/api/upload/image/${image.filename}`
    }));
    
    res.json({ images: imagesWithUrls });
  } catch (error) {
    console.error('获取图片列表错误:', error);
    res.status(500).json({ error: '获取图片列表失败' });
  }
});

// 删除图片
router.delete('/image/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: '未授权访问' });
    }
    
    const imageId = parseInt(req.params.id);
    if (isNaN(imageId)) {
      return res.status(400).json({ error: '无效的图片ID' });
    }
    
    // 查找图片
    const image = await prisma.image.findFirst({
      where: { 
        id: imageId,
        userId: req.user.userId 
      }
    });
    
    if (!image) {
      return res.status(404).json({ error: '图片不存在或无权限删除' });
    }
    
    // 删除数据库记录
    await prisma.image.delete({
      where: { id: imageId }
    });
    
    // 删除文件
    if (fs.existsSync(image.filePath)) {
      fs.unlinkSync(image.filePath);
    }
    
    res.json({ message: '图片删除成功' });
  } catch (error) {
    console.error('删除图片错误:', error);
    res.status(500).json({ error: '删除图片失败' });
  }
});

export default router;