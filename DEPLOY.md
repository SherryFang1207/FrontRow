# FrontRow 部署指南

项目为 **Vite + React 前端 + Express 后端**（含 `/api` 与 SSE 流），适合部署到能跑完整 Node 的托管平台。以下为免费方案与配置步骤。

---

## 推荐一：Render（免费，配置简单）

- **免费额度**：750 小时/月，休眠后冷启动约 30–50 秒
- **适合**：全栈单服务（前后端同一域名）

### 1. 在 Render 创建服务

1. 打开 [render.com](https://render.com) 并登录（可用 GitHub 登录）
2. **Dashboard** → **New** → **Web Service**
3. 连接你的 GitHub 仓库，选 `FrontRow`
4. 填写：
   - **Name**: `frontrow`（或任意）
   - **Region**: 选离用户近的（如 Oregon）
   - **Runtime**: **Node**
   - **Build Command**: `npm install --include=dev && npm run build`  
     （必须安装 devDependencies，否则会报 `vite: not found`）
   - **Start Command**: `npm start`
   - **Instance Type**: 选 **Free**

### 2. 环境变量（Environment）

在 **Environment** 里添加（Secret 可勾选以隐藏）：

| Key | Value | 说明 |
|-----|--------|------|
| `NODE_ENV` | `production` | 一般会自动设，可手动加 |
| `VITE_API_BASE` | *(留空)* | 构建时用，前端走同源 `/api` |
| `LASTFM_API_KEY` | 你的 Last.fm API Key | 艺人头像 |
| `TINYFISH_API_KEY` | 你的 TinyFish API Key | Speed/Value 搜索 |
| `APP_URL` | `https://你的服务名.onrender.com` | 首次部署后填，用于 CORS（可选） |

**重要**：`VITE_API_BASE` 必须在 **Build** 阶段存在（留空即可），这样前端才会请求同源 `/api`。

### 3. 部署

点 **Create Web Service**，等构建和部署完成。  
首次或长时间未访问会冷启动，稍等即可。

### 4. 使用 Blueprint（可选）

仓库根目录已有 `render.yaml`，在 Render 里可选用 **Blueprint** 方式连接该仓库，按 YAML 创建服务，再在 Dashboard 里补全上述环境变量。

---

## 推荐二：Railway（免费额度）

- **免费**：每月约 $5 额度，用尽即停
- **优点**：不强制休眠、部署快

### 步骤

1. [railway.app](https://railway.app) 用 GitHub 登录
2. **New Project** → **Deploy from GitHub repo** → 选 `FrontRow`
3. 在服务 **Settings** 中设置：
   - **Build Command**: `npm install --include=dev && npm run build`
   - **Start Command**: `npm start`
   - **Root Directory**: 留空（仓库根目录）
4. **Variables** 里添加与 Render 相同的环境变量（含 `VITE_API_BASE=` 留空）
5. **Settings** → **Networking** → **Generate Domain** 生成公网域名

---

## 推荐三：Vercel（仅前端 + 需单独后端）

- **免费**：前端无限部署；Serverless 有额度
- **限制**：后端含 **SSE 长连接**，Vercel Serverless 有超时与流式限制，不适合当前 TinyFish SSE 代理

若以后把 TinyFish 改为短轮询或其它短请求，可考虑：

- **前端**：Vercel（连 GitHub，Build: `npm run build`，Output: `dist`，不设 Node server）
- **后端**：单独部署到 Render/Railway，再在 Vercel 里设 `VITE_API_BASE=https://你的后端域名`

当前全栈一体部署更简单，建议先用 **Render** 或 **Railway**。

---

## 本地验证生产构建

部署前可在本机模拟生产环境：

```bash
# 构建前端
npm run build

# 以生产模式起服务（会提供 dist + /api）
NODE_ENV=production npm start
```

浏览器打开 `http://localhost:3001`，确认页面和 `/api` 都正常。

---

## 常见问题

- **冷启动慢**：Render 免费实例休眠后首次请求会慢，属正常。
- **API 404**：确认 Build 时设置了 `VITE_API_BASE`（空字符串即可），且 Start 用的是 `npm start`（跑 `server/index.js`）。
- **CORS 报错**：若前后端拆开部署，在后端设置 `APP_URL` 为前端域名，或临时允许你的前端 origin。
- **`vite: not found` / Exit 127**：Build 时未安装 devDependencies。把 Build Command 改为 `npm install --include=dev && npm run build`，或在 Environment 里加 `NPM_CONFIG_PRODUCTION` = `false`。
