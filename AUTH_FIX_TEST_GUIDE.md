# 图片上传认证问题修复指南

## 问题描述
用户在使用图片上传功能时遇到错误："图片上传失败: 未提供访问令牌"

## 问题原因
图片上传API使用原生fetch请求，但没有正确发送JWT认证令牌。其他API使用axios配置了自动添加Authorization header，但图片上传API需要手动添加。

## 修复内容

### 1. 主要修改
- 修改了 `/src/api/upload.ts` 文件
- 添加了 `getAuthHeaders()` 辅助函数自动获取JWT token
- 更新了所有上传相关API函数以正确发送Authorization header

### 2. 修复前后对比

**修复前：**
```javascript
const response = await fetch(`${API_URL}/upload/image`, {
  method: 'POST',
  credentials: 'include',  // 使用cookies，但后端期望的是Bearer token
  body: formData,
});
```

**修复后：**
```javascript
const response = await fetch(`${API_URL}/upload/image`, {
  method: 'POST',
  headers: getAuthHeaders(),  // 正确发送 Authorization: Bearer <token>
  body: formData,
});
```

### 3. 新增的辅助函数
```javascript
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};
```

## 测试步骤

### 1. 确保用户已登录
1. 打开浏览器开发者工具
2. 在控制台中检查localStorage是否包含token：
   ```javascript
   localStorage.getItem('token')
   ```
3. 如果没有token，请先登录

### 2. 测试双击上传功能
1. 进入PhotoBook主页面
2. 选择一个相册和页面
3. 拖拽一个图片框到画布
4. 双击图片框
5. 选择一张图片文件
6. 验证：
   - 不再出现"未提供访问令牌"错误
   - 控制台显示"图片上传成功"
   - 图片正确显示在画布中

### 3. 测试拖拽上传功能
1. 从计算机文件管理器拖拽图片到画布
2. 验证：
   - 上传成功
   - 自动创建图片元素
   - 图片正确显示

### 4. 验证网络请求
1. 打开浏览器开发者工具 → Network面板
2. 执行上传操作
3. 查看对 `/api/upload/image` 的POST请求
4. 验证Request Headers中包含：
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 5. 测试认证失效场景
1. 在控制台中清除token：
   ```javascript
   localStorage.removeItem('token')
   ```
2. 尝试上传图片
3. 验证：
   - 收到"未提供访问令牌"错误
   - 这是预期行为，表明认证检查正常工作

## 预期结果

### 成功情况
- ✅ 图片上传不再报认证错误
- ✅ 网络请求包含正确的Authorization header
- ✅ 后端能够识别用户身份
- ✅ 图片正确保存并关联到当前用户

### 失败情况处理
- 如果仍然收到认证错误，检查localStorage中是否有有效的token
- 如果token过期，需要重新登录
- 检查后端服务器是否正常运行

## 相关文件修改
- `/src/api/upload.ts` - 主要修改文件
- 认证逻辑与其他API（albums.ts, pages.ts）保持一致

## 注意事项
1. 确保用户在使用上传功能前已经登录
2. JWT token存储在localStorage中
3. token过期时需要重新登录
4. 所有图片上传API现在都需要认证

通过以上修复，图片上传功能现在与项目中其他API的认证方式保持一致，解决了"未提供访问令牌"的错误。