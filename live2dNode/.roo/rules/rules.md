# Zoo Code 开发规则

## 项目定位
AI 语音助手 Node.js 后端（Express + 本地 whisper ASR + LLM 对话），分层模块化架构。

## 目录约定（单向依赖，禁止反向/跨层调用）
`routes → controllers → services → config / utils / models / tools`

- `src/routes/`：仅定义 URL 映射，不写业务逻辑
- `src/controllers/`：解析参数、调用 service、组装响应、捕获错误
- `src/services/`：纯业务逻辑，按领域分子目录（asr/、llm/、tts/），不感知 HTTP
- `src/tools/`：外部能力工具，统一接口 `{ name, description, parameters, execute(args) }`
- `src/middlewares/`：全局中间件（日志、鉴权、限流）
- `src/models/`：数据模型（会话记忆等）
- `src/websocket/`：流式通信（SSE/WebSocket）
- `src/config/`：配置统一收口，禁止硬编码路径/密钥
- `src/utils/`：纯函数工具
- `whisper/`：本地二进制与模型，勿改动

## 开发规范
- 新增功能：优先「加新文件 + 注册路由」，不改既有流程
- 依赖方向：上层依赖下层，service 之间不互相 import
- ESM 导入必须带 `.js` 扩展名
- 配置一律从 `src/config/` 读取（经 `.env`），业务代码不得写死
- 注释与日志使用简体中文
