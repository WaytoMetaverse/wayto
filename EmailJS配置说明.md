# EmailJS 表单配置说明

## 📋 概述

网站的联系表单已集成 EmailJS，可以将表单提交的内容自动发送到您的邮箱 `wayto.metaverse@gmail.com`。

## 🚀 快速开始

### 步骤 1：注册 EmailJS 账号

1. 访问 https://www.emailjs.com/
2. 点击 "Sign Up" 注册免费账号
3. 验证邮箱地址

### 步骤 2：添加 Email 服务

1. 登录后，进入 **Email Services** 页面
2. 点击 **Add New Service**
3. 选择 **Gmail**（推荐）或其他邮件服务
4. 按照提示连接您的 Gmail 账号（`wayto.metaverse@gmail.com`）
5. 完成后，记录下 **Service ID**（例如：`service_xxxxxxx`）

### 步骤 3：创建邮件模板

1. 进入 **Email Templates** 页面
2. 点击 **Create New Template**
3. 使用以下模板内容：

**模板设置：**
- **Template Name**: Wayto Contact Form
- **Subject**: 新联系表单提交 - {{from_name}}

**邮件内容：**
```
来自网站联系表单的新消息

姓名：{{from_name}}
Email：{{from_email}}
电话：{{phone}}

消息内容：
{{message}}

---
此邮件由 Wayto Metaverse 网站自动发送
```

4. 保存模板，记录下 **Template ID**（例如：`template_xxxxxxx`）

### 步骤 4：获取 Public Key

1. 进入 **Account** > **General**
2. 找到 **Public Key**（或 **API Keys**）
3. 复制 Public Key（例如：`xxxxxxxxxxxxxxxxxxxx`）

### 步骤 5：配置网站

1. 打开 `services.html` 文件
2. 找到以下代码（约第 548 行）：

```javascript
const EMAILJS_CONFIG = {
  publicKey: 'YOUR_PUBLIC_KEY', // 替换为您的 EmailJS Public Key
  serviceId: 'YOUR_SERVICE_ID',  // 替换为您的 EmailJS Service ID
  templateId: 'YOUR_TEMPLATE_ID' // 替换为您的 EmailJS Template ID
};
```

3. 将三个值替换为您在 EmailJS 中获取的实际值：

```javascript
const EMAILJS_CONFIG = {
  publicKey: 'xxxxxxxxxxxxxxxxxxxx',
  serviceId: 'service_xxxxxxx',
  templateId: 'template_xxxxxxx'
};
```

4. 保存文件

## ✅ 测试

1. 打开网站的联系表单页面
2. 填写测试信息并提交
3. 检查您的邮箱 `wayto.metaverse@gmail.com` 是否收到邮件

## 📊 EmailJS 免费版限制

- **每月 200 封邮件**（足够小型网站使用）
- 如果需要更多，可以升级到付费版

## 🔧 故障排除

### 问题：表单提交后没有收到邮件

1. **检查配置**：确认三个 ID 都正确填写
2. **检查控制台**：按 F12 打开开发者工具，查看 Console 是否有错误信息
3. **检查 EmailJS 仪表板**：登录 EmailJS，查看 **Logs** 页面，检查是否有发送记录和错误信息
4. **检查垃圾邮件文件夹**：邮件可能被标记为垃圾邮件

### 问题：显示 "EmailJS Error"

1. 检查网络连接
2. 确认 Public Key 正确
3. 检查 Service ID 和 Template ID 是否正确
4. 查看浏览器控制台的详细错误信息

## 📝 注意事项

- **安全性**：Public Key 是公开的，可以放在前端代码中
- **隐私**：EmailJS 会处理表单数据，请确保符合您的隐私政策要求
- **备用方案**：如果 EmailJS 配置失败，表单会显示演示模式提示，用户仍可看到提交成功的消息

## 🆘 需要帮助？

如果遇到问题，可以：
1. 查看 EmailJS 官方文档：https://www.emailjs.com/docs/
2. 检查浏览器控制台的错误信息
3. 查看 EmailJS 仪表板的 Logs 页面

---

**配置完成后，表单将自动发送邮件到 `wayto.metaverse@gmail.com`**

