import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { PrismaClient } from './generated/prisma';
import authRoutes from './routes/auth';
import albumRoutes from './routes/albums';
import pageRoutes from './routes/pages';

const app = express();
const prisma = new PrismaClient();

// 中间件
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/pages', pageRoutes);

// 健康检查
app.get('/', (req, res) => {
  res.json({ message: 'PhotoBook API is running!' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
