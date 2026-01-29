import express from "express";
import cors from 'cors'; // 添加CORS导入
import 'dotenv/config';
import asrRouter from "./routes/asr.js";

const app = express();

// 配置CORS选项 - 允许跨域请求
app.use(cors({
  origin: '*', // 生产环境建议指定具体域名，如 ['http://localhost:3000', 'http://yourdomain.com']
  credentials: true, // 如果需要携带cookie等认证信息
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 接收 raw audio
app.use(express.raw({ type: "audio/wav", limit: "100mb" }));

app.use(asrRouter);

app.listen(8000, () => {
  console.log("ASR server listening on 8000");
});