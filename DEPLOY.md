# Vercel 部署指南

本指南将帮助您将 Wayto Metaverse 网站部署到 Vercel。

## 📋 前置要求

- Vercel 账号（免费注册：https://vercel.com）
- 项目文件已准备好
- EmailJS 已配置完成（可选，用于联系表单）

## 🚀 部署方式

### 方式 A：通过 Vercel CLI（推荐）

这是最快速和灵活的方式，适合开发人员。

#### 步骤 1：安装 Vercel CLI

```bash
npm install -g vercel
```

或者使用其他包管理器：

```bash
# 使用 yarn
yarn global add vercel

# 使用 pnpm
pnpm add -g vercel
```

#### 步骤 2：登录 Vercel

```bash
vercel login
```

按照提示在浏览器中完成登录。

#### 步骤 3：部署项目

在项目根目录运行：

```bash
vercel
```

首次部署会询问一些问题：
- **Set up and deploy?** → 输入 `Y`
- **Which scope?** → 选择您的账号
- **Link to existing project?** → 输入 `N`（首次部署）
- **What's your project's name?** → 输入项目名称（如：`wayto-metaverse`）
- **In which directory is your code located?** → 输入 `./`（当前目录）

#### 步骤 4：部署到生产环境

预览部署成功后，运行：

```bash
vercel --prod
```

这将部署到生产环境，并获得一个永久的 URL。

#### 常用命令

```bash
# 部署预览环境
vercel

# 部署生产环境
vercel --prod

# 查看部署列表
vercel ls

# 查看部署详情
vercel inspect [deployment-url]

# 删除部署
vercel remove [deployment-name]
```

---

### 方式 B：通过 Git 集成（推荐用于持续部署）

这种方式可以自动部署每次代码推送，适合团队协作。

#### 步骤 1：准备 Git 仓库

确保项目已推送到 GitHub、GitLab 或 Bitbucket。

#### 步骤 2：连接 Vercel

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **Add New Project**
3. 选择 **Import Git Repository**
4. 选择您的 Git 提供商并授权
5. 选择项目仓库

#### 步骤 3：配置项目

Vercel 会自动检测项目类型。对于静态网站：
- **Framework Preset**: Other
- **Root Directory**: `./`（默认）
- **Build Command**: 留空（静态网站不需要构建）
- **Output Directory**: `./`（默认）

#### 步骤 4：部署

点击 **Deploy**，Vercel 会自动：
- 部署项目
- 生成预览 URL
- 设置自动部署（每次推送代码时）

#### 自动部署设置

- **Production Branch**: 通常是 `main` 或 `master`
- **Preview Deployments**: 每个 Pull Request 会自动创建预览部署
- **Automatic Deployments**: 每次推送到主分支会自动部署到生产环境

---

### 方式 C：通过 Vercel Dashboard（最简单）

适合快速测试，但不支持自动部署。

#### 步骤 1：访问 Vercel Dashboard

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **Add New Project**

#### 步骤 2：上传项目

1. 选择 **Deploy from a Git Repository** 或 **Upload Files**
2. 如果选择上传文件：
   - 将项目文件夹压缩为 ZIP
   - 拖拽 ZIP 文件到上传区域
   - 等待上传完成

#### 步骤 3：配置和部署

- 项目名称：输入 `wayto-metaverse` 或您喜欢的名称
- 点击 **Deploy**

---

## ⚙️ 项目配置说明

### vercel.json

项目已包含 `vercel.json` 配置文件，包含：

- **路由规则**：确保所有 HTML 页面和静态资源正确访问
- **缓存策略**：
  - HTML 文件：不缓存（确保更新及时）
  - 图片和静态资源：长期缓存（提高性能）
- **安全头**：添加基本的安全 HTTP 头

### .vercelignore

已配置 `.vercelignore` 文件，排除：
- 开发文档（EmailJS配置说明.md 等）
- 本地开发服务器（server.js）
- 临时文件和系统文件

---

## 🔧 部署后配置

### 1. 自定义域名（可选）

如果需要使用自定义域名（如 wayto.com.tw）：

1. 在 Vercel Dashboard 中打开项目
2. 进入 **Settings** > **Domains**
3. 添加您的域名
4. 按照提示配置 DNS 记录

### 2. 环境变量（如果需要）

如果将来需要环境变量：

1. 进入 **Settings** > **Environment Variables**
2. 添加变量（如 EmailJS 配置等）
3. 重新部署项目

### 3. 查看部署日志

1. 在 Vercel Dashboard 中打开项目
2. 点击任意部署
3. 查看 **Build Logs** 和 **Function Logs**

---

## ✅ 部署后验证清单

部署完成后，请检查以下项目：

- [ ] 首页（index.html）正常加载
- [ ] 所有页面都能正常访问：
  - [ ] portfolio.html
  - [ ] process.html
  - [ ] services.html
  - [ ] tech.html
  - [ ] visual.html
- [ ] 图片和 LOGO 正常显示
- [ ] 联系表单功能正常（如果已配置 EmailJS）
- [ ] robots.txt 和 sitemap.xml 可访问
- [ ] 移动端显示正常
- [ ] 页面加载速度正常

---

## 🐛 常见问题

### 问题 1：页面显示 404

**解决方案**：
- 检查 `vercel.json` 中的路由配置
- 确保 HTML 文件在项目根目录
- 检查文件路径是否正确

### 问题 2：图片无法加载

**解决方案**：
- 检查图片路径（使用相对路径）
- 确保图片文件已上传
- 检查 `.vercelignore` 是否意外排除了图片

### 问题 3：EmailJS 表单不工作

**解决方案**：
- 检查 `services.html` 中的 EmailJS 配置
- 确认 Public Key、Service ID 和 Template ID 正确
- 检查浏览器控制台是否有错误
- 查看 EmailJS Dashboard 的日志

### 问题 4：部署速度慢

**解决方案**：
- 检查 `.vercelignore` 是否排除了大文件
- 优化图片大小
- 使用 Vercel 的图片优化功能

---

## 📊 Vercel 免费套餐限制

- **带宽**：100GB/月
- **构建时间**：6000 分钟/月
- **函数执行时间**：100GB-小时/月
- **项目数量**：无限制
- **自定义域名**：支持

对于静态网站，免费套餐通常足够使用。

---

## 🔄 更新网站

### 使用 CLI

```bash
# 在项目目录中
vercel --prod
```

### 使用 Git 集成

只需推送代码到连接的仓库，Vercel 会自动部署。

### 使用 Dashboard

重新上传文件或通过 Git 集成触发部署。

---

## 📚 相关资源

- [Vercel 官方文档](https://vercel.com/docs)
- [Vercel CLI 文档](https://vercel.com/docs/cli)
- [Vercel 部署最佳实践](https://vercel.com/docs/deployments/overview)

---

## 🆘 需要帮助？

如果遇到问题：
1. 查看 Vercel Dashboard 的部署日志
2. 检查浏览器控制台的错误信息
3. 参考 [Vercel 支持文档](https://vercel.com/support)
4. 查看项目的 GitHub Issues（如果使用 Git 集成）

---

**部署完成后，您的网站将获得一个类似 `https://wayto-metaverse.vercel.app` 的 URL。**

