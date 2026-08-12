import express from "express";
import cors from "cors";
import asrRouter from "./routes/asr.routes.js";
import chatRouter from "./routes/chat.routes.js";
import ttsRouter from "./routes/tts.routes.js";
import voiceRouter from "./routes/voice.routes.js";

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

// 根路由：返回服务说明文本
app.get("/", (req, res) => {
  res.type("text/plain").send("AI 语音助手后端服务已启动，欢迎使用！");
});

// 挂载路由
app.use(asrRouter);
app.use(chatRouter);
app.use(ttsRouter);
app.use(voiceRouter);

export default app;
