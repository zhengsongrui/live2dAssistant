# live2dNode - AI 语音助手后端

基于 Node.js + Express 的 AI 语音助手后端服务：**接收语音 → 本地 whisper 识别 → 大模型对话 → 返回文本**。

## 功能特性

- 🎙️ 语音识别（ASR）：本地 whisper-cli，中文识别，无需上传云端
- 💬 大模型对话（LLM）：OpenAI 兼容接口（默认 DeepSeek）
- ⌨️ 文字对话测试接口
- 🧱 分层模块化架构，预留联网搜索、TTS、会话记忆等扩展点

## 环境要求

- Node.js 18+（`npm run dev` 热重载需要 18.11+）
- whisper 本地二进制与模型（已包含在 `whisper/`）

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（参考 .env）
#    OPENAI_BASE_URL=https://api.deepseek.com
#    OPENAI_API_KEY=你的密钥
#    OPENAI_MODEL=deepseek-v4-flash

# 3. 启动服务
npm start          # 普通启动
npm run dev        # 热重载开发
```

服务默认监听 **8000** 端口（可用 `.env` 中的 `PORT` 修改）。

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/asr` | 语音识别 + 对话。请求体为原始 wav 音频（`Content-Type: audio/wav`），返回清理后的回复文本 |
| GET | `/asrText?text=你好` | 文字对话测试，返回回复文本 |
| GET | `/test` | 健康检查，返回「成功」 |

请求示例：

```bash
# 语音接口
curl -X POST http://localhost:8000/asr \
  -H "Content-Type: audio/wav" \
  --data-binary @audio.wav

# 文字接口
curl "http://localhost:8000/asrText?text=你好"
```

## 目录结构

```
live2dNode/
├── src/
│   ├── server.js              # 入口：加载 dotenv，启动服务
│   ├── app.js                 # Express 装配：中间件、路由挂载
│   ├── config/                # 配置层：端口、whisper、LLM
│   │   ├── index.js
│   │   ├── whisper.js
│   │   └── llm.js
│   ├── routes/                # 路由层：URL -> 控制器
│   │   ├── asr.routes.js
│   │   └── chat.routes.js
│   ├── controllers/           # 控制器层：参数校验、响应组装
│   │   ├── asr.controller.js
│   │   └── chat.controller.js
│   ├── services/              # 业务逻辑层（按领域分子目录）
│   │   ├── asr/whisperService.js
│   │   ├── llm/chatService.js
│   │   └── tts/               # 预留：语音合成
│   ├── tools/                 # 预留：外部能力（联网搜索等）
│   ├── middlewares/           # 预留：日志/鉴权/限流
│   ├── models/                # 预留：会话记忆/历史记录
│   ├── websocket/             # 预留：SSE/WebSocket 流式输出
│   └── utils/textClean.js     # 通用工具
├── whisper/                   # 本地 whisper 二进制与模型
├── .env                       # 环境变量（不提交）
└── package.json
```

## 架构说明

分层**单向依赖**，新增功能只需加文件、不动既有流程：

```
routes → controllers → services → config / utils / models / tools
```

- **routes** 只做 URL 映射
- **controllers** 处理请求参数与响应
- **services** 承载纯业务逻辑，不感知 HTTP
- **tools** 每个外部能力是一个统一接口的工具，可被 LLM 调用

## 扩展指南

| 需求 | 做法 |
|------|------|
| 联网搜索 | 在 `src/tools/` 新建工具（如 `search/`），实现 `{ name, description, parameters, execute(args) }` 统一接口后注册 |
| 新 HTTP 接口 | `src/routes/` 注册 + `src/controllers/` 实现处理 |
| 语音合成 TTS | 在 `src/services/tts/` 下实现 |
| 流式输出 | 使用 `src/websocket/` 配合 SSE/WebSocket |
| 多轮记忆 | 在 `src/models/` 定义会话模型，`chatService` 中维护消息历史 |

## 常见问题

- **端口被占用**：在 `.env` 中设置 `PORT` 后重启。
- **识别失败**：确认 `whisper/whisper-cli.exe` 与 `whisper/models/ggml-base.bin` 存在。
- **对话无响应**：检查 `.env` 中的 `OPENAI_API_KEY`、`OPENAI_BASE_URL` 是否正确。
