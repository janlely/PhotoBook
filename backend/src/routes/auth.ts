import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, username } = req.body;

    // 检查邮箱是否已存在
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    });

    if (existingEmail) {
      res.status(400).json({ error: '邮箱已被注册' });
      return;
    }

    // 检查用户名是否已存在
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUsername) {
      res.status(400).json({ error: '用户名已被使用' });
      return;
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建新用户
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // 生成JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: '用户注册成功',
      user,
      token
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // 查找用户（通过用户名或邮箱）
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier }
        ]
      }
    });

    if (!user) {
      res.status(400).json({ error: '用户名或邮箱不存在' });
      return;
    }
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      res.status(400).json({ error: '密码错误' });
      return;
    }
    
    // 生成JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({
      message: '登录成功',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      token
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
