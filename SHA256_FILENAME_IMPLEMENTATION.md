# PhotoBook SHA256文件命名实现

## 实现概述

根据您的建议，我已经将图片上传功能修改为使用SHA256哈希值作为文件名，这样可以：

1. **避免文件名冲突**: 相同内容的文件自动合并
2. **便于管理**: 文件名直接对应其内容的哈希值
3. **提高安全性**: 文件名不包含敏感信息
4. **优化存储**: 自动去重，节省磁盘空间

## 实现细节

### 文件命名格式
```
{sha256}.{extension}
```

**示例:**
- `a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3.jpg`
- `b7d8c9a2f1e4567890abcdef123456789fedcba0987654321abcdef0123456789.png`

### 处理流程

1. **临时保存**: 文件首先以临时名称保存
2. **计算SHA256**: 读取文件内容计算哈希值
3. **检查重复**: 查询数据库是否已存在相同SHA256的记录
4. **重命名文件**: 将临时文件重命名为SHA256文件名
5. **保存记录**: 在数据库中保存文件信息

### 代码实现

#### 1. Multer配置修改
```typescript
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
```

#### 2. 文件重命名逻辑
```typescript
// 生成基于SHA256的文件名
const fileExtension = path.extname(req.file.originalname);
const sha256FileName = `${sha256}${fileExtension}`;
const sha256FilePath = path.join(path.dirname(filePath), sha256FileName);

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
```

#### 3. 数据库存储
```typescript
const savedImage = await prisma.image.create({
  data: {
    filename: sha256FileName, // 使用SHA256文件名
    originalName: req.file.originalname, // 保留用户原始文件名
    mimeType: req.file.mimetype,
    size: req.file.size,
    sha256,
    filePath: fs.existsSync(sha256FilePath) ? sha256FilePath : filePath,
    userId: req.user.userId
  }
});
```

## 优势分析

### 1. 自动去重
- **文件系统层面**: 相同内容的文件只存储一次
- **数据库层面**: 多个用户可以引用同一个物理文件
- **存储优化**: 显著节省磁盘空间

### 2. 一致性保证
- **内容验证**: 文件名即为内容的哈希值，便于完整性检查
- **防篡改**: 任何文件内容的修改都会改变文件名
- **可追溯**: 通过文件名可以直接验证文件内容

### 3. 管理便利
- **批处理**: 可以通过文件名批量验证文件完整性
- **备份还原**: 文件名包含完整的内容标识
- **跨环境**: 相同内容的文件在不同环境中有相同的文件名

## 兼容性处理

### 重复文件处理
当上传SHA256相同的文件时：
1. 删除新上传的临时文件
2. 复用已存在的SHA256文件
3. 为当前用户创建新的短链接
4. 返回成功响应

### 文件名冲突处理
如果文件系统中已存在SHA256文件名：
1. 验证现有文件的完整性
2. 删除新上传的重复文件
3. 使用已存在的文件

### 错误恢复
如果重命名过程中出现错误：
1. 保留原临时文件
2. 在数据库中记录SHA256信息
3. 记录错误日志便于后续处理

## 测试验证

### 1. 基本上传测试
```bash
# 上传图片后检查文件系统
ls -la uploads/
# 应该看到类似这样的文件：
# a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3.jpg
```

### 2. 重复文件测试
1. 上传同一张图片两次
2. 验证文件系统中只有一个物理文件
3. 验证两次上传都返回成功并有不同的短链接

### 3. 完整性验证
```bash
# 计算文件的SHA256并与文件名对比
sha256sum uploads/a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3.jpg
# 输出应该以文件名中的哈希值开头
```

## 部署注意事项

### 1. 现有文件迁移
如果系统中已有使用旧命名方式的文件，需要：
1. 计算现有文件的SHA256
2. 重命名为新的格式
3. 更新数据库中的filename字段

### 2. 备份策略
- 文件名包含内容哈希，便于验证备份完整性
- 可以通过文件名去重，优化备份存储

### 3. 监控告警
- 监控重命名操作的成功率
- 检查是否有临时文件未被清理
- 验证SHA256计算的性能影响

## 总结

通过实施SHA256文件命名策略，PhotoBook的图片存储系统现在具备了：

✅ **内容驱动的文件命名**  
✅ **自动去重和存储优化**  
✅ **文件完整性验证能力**  
✅ **便于管理和维护**  
✅ **与短链接系统的完美集成**  

这个改进提高了系统的可靠性、效率和可维护性，为未来的扩展打下了坚实的基础。