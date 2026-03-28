# 快速开始：沉浸式小说阅读器

**分支**: `001-immersive-novel-reader`
**前置条件**: Node.js 20+、PostgreSQL 运行中

## 环境配置

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入：
#   DATABASE_URL="postgresql://user:password@localhost:5432/bookworm"
#   AI_API_KEY="your-ai-service-api-key"
#   AI_PROVIDER="openai"  # 或 "anthropic" / "google"

# 3. 初始化数据库
npx prisma migrate dev --name init-expanded-schema
npx prisma db seed
```

## 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 核心功能验证

### 1. 书架与导入
- 访问 `/shelf` 页面查看书架
- 拖放或点击上传一本 epub 文件
- 验证书籍出现在书架中

### 2. 阅读体验
- 点击书籍卡片进入阅读界面
- 使用侧边栏目录跳转章节
- 验证阅读进度自动保存和恢复

### 3. 人物追踪
- 悬停人名查看信息卡片
- 点击人名固定到侧边栏
- 使用人名切换按钮在全名/简写模式间切换

### 4. 双语阅读
- 开启翻译模式查看段落翻译
- 手动编辑翻译文本

### 5. 词汇学习
- 点击外文单词查看释义
- 在 `/vocabulary` 页面浏览生词本
- 在 `/review` 页面进行 SRS 复习

## 运行测试

```bash
# 单元测试
npx vitest

# 端到端测试
npx playwright test
```
