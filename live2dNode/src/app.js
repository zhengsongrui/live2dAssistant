import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import asrRouter from "./routes/asr.routes.js";
import chatRouter from "./routes/chat.routes.js";
import ttsRouter from "./routes/tts.routes.js";
import voiceRouter from "./routes/voice.routes.js";
import novelRouter from "./routes/novel.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// 配置 CORS 选项 - 允许跨域请求
app.use(
  cors({
    origin: "*", // 生产环境建议指定具体域名，如 ['http://localhost:3000', 'http://yourdomain.com']
    credentials: true, // 如果需要携带 cookie 等认证信息
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 接收 raw audio（mp3）
app.use(express.raw({ type: "audio/mp3", limit: "100mb" }));

// 解析 JSON 请求体
app.use(express.json());

// 根路由：返回自包含 HTML 的 API 接口文档页（供网页开发者浏览示例）
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "api-doc.html"));
});

// 挂载路由
app.use(asrRouter);
app.use(chatRouter);
app.use(ttsRouter);
app.use(voiceRouter);
app.use(novelRouter);

export default app;
