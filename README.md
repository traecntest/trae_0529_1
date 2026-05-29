# 相册管理系统

基于 Angular 20 + Node.js + Express + SQLite 的现代相册管理系统。

## 功能特性

### 相册管理模块
- 创建相册
- 编辑相册信息
- 删除相册
- 设置封面

### 照片上传模块
- 多文件拖拽上传
- 上传进度显示
- 图片格式校验
- 自动生成缩略图

### 照片管理模块
- 批量选择操作
- 移动照片至不同相册
- 删除照片
- 重命名照片
- 添加标签与描述

### 浏览与展示模块
- 响应式网格布局
- 灯箱预览
- 幻灯片播放
- 按标签筛选

### 下载模块
- 单张照片下载
- 批量打包下载（ZIP）
- 整个相册下载

### 后台管理模块
- 存储空间统计
- 各相册存储使用情况
- 系统操作日志

## 技术栈

### 前端
- Angular 20
- TypeScript
- Angular Material
- RxJS

### 后端
- Node.js
- Express
- SQLite3
- Multer（文件上传）
- Sharp（图片处理）
- Archiver（ZIP打包）

## 快速开始

### 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 启动项目

#### 方式一：分别启动

```bash
# 启动后端服务（端口 3000）
cd backend
npm start

# 启动前端服务（端口 4200）
cd ../frontend
npm start
```

#### 方式二：使用根目录脚本

```bash
# 安装所有依赖
npm run install:all

# 启动后端
npm run start:backend

# 启动前端
npm run start:frontend
```

### 访问应用

- 前端地址: http://localhost:4200
- 后端API: http://localhost:3000/api

## API 文档

### 相册接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/albums | 获取所有相册 |
| GET | /api/albums/:id | 获取单个相册 |
| POST | /api/albums | 创建相册 |
| PUT | /api/albums/:id | 更新相册 |
| DELETE | /api/albums/:id | 删除相册 |
| PUT | /api/albums/:id/cover | 设置相册封面 |

### 照片接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/photos/upload/:albumId | 上传照片 |
| GET | /api/photos | 获取照片列表 |
| GET | /api/photos/:id | 获取单个照片 |
| PUT | /api/photos/:id | 更新照片信息 |
| PUT | /api/photos/:id/move | 移动照片 |
| POST | /api/photos/batch/move | 批量移动照片 |
| DELETE | /api/photos/:id | 删除照片 |
| POST | /api/photos/batch/delete | 批量删除照片 |
| GET | /api/photos/image/:filename | 获取原图 |
| GET | /api/photos/thumbnail/:filename | 获取缩略图 |
| GET | /api/photos/tags/all | 获取所有标签 |

### 管理接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/admin/stats | 获取系统统计 |
| GET | /api/admin/logs | 获取系统日志 |
| GET | /api/admin/download/:photoId | 下载单张照片 |
| POST | /api/admin/download/batch | 批量下载照片 |
| GET | /api/admin/download/album/:albumId | 下载整个相册 |

## 项目结构

```
trae_0529_1/
├── backend/                 # 后端项目
│   ├── src/
│   │   ├── models/         # 数据模型
│   │   ├── routes/         # API 路由
│   │   ├── uploads/        # 上传文件目录
│   │   └── server.js       # 服务器入口
│   └── package.json
├── frontend/               # 前端项目
│   ├── src/
│   │   ├── app/
│   │   │   ├── albums/     # 相册模块
│   │   │   ├── photos/     # 照片模块
│   │   │   ├── admin/      # 管理模块
│   │   │   ├── services/   # 服务
│   │   │   └── models/     # 类型定义
│   │   └── main.ts
│   └── package.json
└── README.md
```

## 使用说明

1. 首次启动后，系统会自动创建 SQLite 数据库
2. 在相册页面点击"创建相册"按钮创建第一个相册
3. 进入相册后可以拖拽或点击上传照片
4. 支持多选照片进行批量操作（删除、移动、下载）
5. 点击照片可进入灯箱模式查看大图，支持幻灯片播放
