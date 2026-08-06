import express from "express";
import cors from "cors";
import asrRouter from "./routes/asr.routes.js";
import chatRouter from "./routes/chat.routes.js";

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

// 接收 raw audio（wav）
app.use(express.raw({ type: "audio/wav", limit: "100mb" }));

// 解析 JSON 请求体
app.use(express.json());

// 挂载路由
app.use(asrRouter);
app.use(chatRouter);

export default app;
