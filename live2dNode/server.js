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

// --- 新增：全局 GET 请求检测中间件 ---
// app.use((req, res, next) => {
//   if (req.method === 'GET') {
//     console.log(`[${new Date().toLocaleString()}] 收到 GET 请求: ${req.url}`);
//     // 你可以记录更多信息，比如查询参数
//     console.log('查询参数:', req.query);
//   }
//   next(); // 必须调用 next()，否则请求会卡在这里，无法进入后续路由
// });
// ------------------------------------

// 接收 raw audio
app.use(express.raw({ type: "audio/wav", limit: "100mb" }));

app.use(asrRouter);

app.listen(8000, () => {
  console.log("ASR server listening on 8000");
});