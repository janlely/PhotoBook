# PhotoBook 图片上传功能

## 功能概述

PhotoBook 现在支持带有 SHA256 重复性校验的图片上传功能。这个功能确保不会存储重复的图片文件，通过计算文件的 SHA256 哈希值来检测重复内容。

## 已实现的功能

### 1. 后端 API

#### 数据库模型
- 添加了 `Image` 模型存储图片元数据
- 包含字段：`filename`、`originalName`、`mimeType`、`size`、`sha256`、`filePath`、`userId`
- `sha256` 字段设置为唯一索引，防止重复文件

#### API 端点

**POST /api/upload/image**
- 上传图片文件
- 自动计算 SHA256 哈希值
- 检测重复文件并拒绝上传
- 需要用户认证

**GET /api/upload/image/:filename**
- 获取上传的图片文件
- 直接返回图片二进制数据

**GET /api/upload/images**
- 获取当前用户上传的所有图片列表
- 需要用户认证

**DELETE /api/upload/image/:id**
- 删除指定的图片文件和数据库记录
- 只能删除自己上传的图片
- 需要用户认证

#### 重复文件处理
- 当上传重复文件时，系统会：
  - 计算新文件的 SHA256 哈希值
  - 检查数据库中是否已存在相同哈希值的文件
  - 如果存在，删除新上传的文件并返回错误信息
  - 如果不存在，正常保存文件

### 2. 前端组件

#### ImageUpload 组件
- 支持拖拽上传和点击选择文件
- 实时显示上传进度
- 文件类型和大小验证（最大 10MB）
- 图片列表展示和管理
- 删除确认对话框

#### API 客户端
- `uploadImage()` - 上传图片
- `getUserImages()` - 获取图片列表  
- `deleteImage()` - 删除图片
- `getImageUrl()` - 生成图片访问URL

## 技术实现

### 依赖包
- **multer**: 处理文件上传
- **crypto**: 计算 SHA256 哈希值
- **@types/multer**: TypeScript 类型定义

### 安全特性
- 文件类型验证（只允许图片）
- 文件大小限制（10MB）
- 用户身份认证
- 权限控制（只能操作自己的文件）
- 路径安全（防止目录遍历）

### 存储策略
- 文件存储在 `backend/uploads/` 目录
- 使用时间戳 + 随机数生成唯一文件名
- 数据库存储文件元数据和SHA256哈希值

## 使用方法

### 1. 启动后端服务器
```bash
cd backend
npm run dev
```

### 2. 启动前端开发服务器
```bash
npm run dev
```

### 3. 访问上传页面
- 登录后访问 `http://localhost:5173/upload`
- 或者在应用中添加导航链接到 `/upload`

## 测试步骤

1. **基本上传测试**
   - 选择一张图片上传
   - 验证上传成功并显示在列表中

2. **重复文件测试**
   - 再次上传相同的图片
   - 验证系统检测到重复并拒绝上传
   - 确认错误信息正确显示

3. **文件类型验证**
   - 尝试上传非图片文件
   - 验证系统拒绝并显示错误信息

4. **文件大小限制**
   - 上传超过10MB的图片
   - 验证系统拒绝并显示错误信息

5. **删除功能**
   - 删除已上传的图片
   - 验证文件从服务器和数据库中删除

## API 响应示例

### 成功上传
```json
{
  "message": "图片上传成功",
  "image": {
    "id": 1,
    "filename": "image-1693123456789-123456789.jpg",
    "originalName": "my-photo.jpg",
    "mimeType": "image/jpeg",
    "size": 1024000,
    "sha256": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
    "filePath": "/api/upload/image/image-1693123456789-123456789.jpg",
    "createdAt": "2023-08-27T12:34:56.789Z"
  }
}
```

### 重复文件错误
```json
{
  "error": "文件已存在",
  "message": "相同内容的图片已经存在于系统中",
  "existingImage": {
    "id": 1,
    "filename": "existing-image.jpg",
    "originalName": "photo.jpg",
    "filePath": "/api/upload/image/existing-image.jpg",
    "createdAt": "2023-08-27T10:00:00.000Z"
  }
}
```

## 注意事项

1. **环境变量**: 确保设置了正确的 `JWT_SECRET`
2. **目录权限**: 确保 `backend/uploads/` 目录有写权限
3. **磁盘空间**: 监控上传目录的磁盘使用情况
4. **数据库备份**: 定期备份包含图片元数据的数据库

## 未来改进计划

- [ ] 图片压缩和多尺寸生成
- [ ] 云存储集成 (AWS S3, 阿里云OSS等)
- [ ] 图片标签和分类功能
- [ ] 批量上传支持
- [ ] 上传进度条优化
- [ ] 图片预览和编辑功能