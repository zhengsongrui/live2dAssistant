# live2dNode - AI 语音助手后端

基于 Node.js + Express 的 AI 语音助手后端服务：**语音识别（ASR）→ 大模型对话（LLM）→ 语音合成（TTS）**，支持联网搜索工具自动调用。

## 功能特性

- 🎙️ **语音识别**：本地 whisper-cli，中文识别，无需上传云端
- 💬 **大模型对话**：OpenAI 兼容接口（默认 DeepSeek），支持工具自动调用
- 🔍 **联网搜索**：Tavily 工具（`web_search`），模型按需自动搜索实时信息
- 🔊 **语音合成**：F5-TTS 合成 mp3，数字自动转中文读法，可调音色/语速/种子
- 🔄 **语音全链路**：`/asrVoice` 语音进语音出、`/chatVoice` 文字进语音出
- 🧱 分层模块化架构，新增功能只需加文件，不动既有流程

## 环境要求

- Node.js 18+
- whisper 本地二进制与模型（已含于 `whisper/`）
- 可选：F5-TTS 服务、Tavily API Key

## 快速开始

```bash
npm install
cp .env.example .env   # 按需填写密钥
npm start              # 或 npm run dev（热重载）
```

服务默认监听 **8999** 端口（见 [`src/config/index.js`](src/config/index.js:4)），可用 `.env` 的 `PORT` 修改。

### 环境变量

| 变量 | 说明 |
|------|------|
| `OPENAI_BASE_URL` / `OPENAI_API_KEY` / `OPENAI_MODEL` | 大模型接口（必填） |
| `TAVILY_API_KEY` / `TAVILY_API_URL` | 联网搜索（可选） |
| `F5_TTS_URL` | F5-TTS 服务地址（可选，默认 `localhost:8000`） |

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/asr` | 语音识别 + 对话，body 为原始音频（`audio/mp3`），返回文本 |
| GET | `/asrText?text=` | 文字对话，返回文本 |
| GET | `/chatVoice?text=` | 文字 → 回复 → 语音，返回 mp3 |
| POST | `/asrVoice` | 语音 → 识别 → 回复 → 语音，body 为原始音频，返回 mp3 |
| POST | `/tts` | 文本合成语音（JSON），返回 mp3 |
| GET | `/tts?text=` | 合成语音（浏览器测试），返回 mp3 |
| GET | `/test` | 健康检查，返回「成功」 |

### TTS 参数（`/tts`）

| 参数 | 类型 | 说明 |
|------|------|------|
| `text` | string | 要合成的文本（必填） |
| `voice` | string | 音色 id（见 F5-TTS 服务端 `voices.yaml`） |
| `speed` | number | 语速，默认 1.0 |
| `seed` | number | 随机种子（固定可复现结果） |
| `removeSilence` | boolean | 是否去除静音 |

POST 用 JSON body，GET 用同名查询参数（数值自动归一）。

### 请求示例

```bash
# 语音识别对话
curl -X POST http://localhost:8999/asr \
  -H "Content-Type: audio/mp3" --data-binary @audio.mp3

# 文字对话
curl "http://localhost:8999/asrText?text=你好"

# 文字 → 语音（浏览器直接访问即可试听）
curl "http://localhost:8999/tts?text=你好世界" -o out.mp3

# 文字对话 + 语音
curl "http://localhost:8999/chatVoice?text=今天天气怎么样" -o reply.mp3
```

## 目录结构

```
live2dNode/
├── src/
│   ├── server.js              # 入口：加载 dotenv、启动服务
│   ├── app.js                 # Express 装配：CORS、raw 音频、路由挂载
│   ├── config/                # 配置收口：端口、whisper、LLM、TTS、Tavily
│   ├── routes/                # 路由层：URL → 控制器
│   ├── controllers/           # 控制器层：参数校验、响应组装
│   ├── services/              # 业务逻辑（asr / llm / tts）
│   │   └── tts/               # f5TtsService 合成、tts-example 参考示例
│   ├── tools/                 # 外部能力工具（tavily 联网搜索）
│   ├── middlewares/           # 预留：日志/鉴权/限流
│   ├── models/                # 预留：会话记忆
│   ├── websocket/             # 预留：SSE/WebSocket 流式输出
│   └── utils/                 # textClean 文本清理、numToChinese 数字转中文
├── whisper/                   # 本地 whisper 二进制与模型
└── .env                       # 环境变量（不提交）
```

## 架构说明

分层**单向依赖**，新增功能只需加文件：

```
routes → controllers → services → config / utils / models / tools
```

- **routes** 仅做 URL 映射
- **controllers** 处理请求参数与响应
- **services** 承载纯业务逻辑，不感知 HTTP
- **tools** 统一接口 `{ name, description, parameters, execute(args) }`，注册后被大模型自动调用（工具循环见 [`src/services/llm/chatService.js`](src/services/llm/chatService.js:23)）

## 扩展指南

| 需求 | 做法 |
|------|------|
| 新增工具 | `src/tools/` 新建工具，在 [`src/tools/index.js`](src/tools/index.js:4) 注册一行即可，模型自动获得能力 |
| 新 HTTP 接口 | `src/routes/` 注册 + `src/controllers/` 实现 |
| 换 TTS 引擎 | 在 `src/services/tts/` 实现 `synthesize(text, options)` |
| 流式输出 | 使用 `src/websocket/` 配合 SSE/WebSocket |
| 多轮记忆 | 在 `src/models/` 定义会话模型，`chatService` 维护历史 |

## 常见问题

- **端口被占用**：`.env` 设置 `PORT` 后重启。
- **识别失败**：确认 `whisper/whisper-cli.exe` 与 `whisper/models/ggml-base.bin` 存在。
- **对话无响应**：检查 `.env` 的 `OPENAI_API_KEY`、`OPENAI_BASE_URL`。
- **TTS 失败**：确认 F5-TTS 服务已启动，且 `F5_TTS_URL` 指向正确地址。
