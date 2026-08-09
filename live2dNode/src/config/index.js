import path from "path";

// 服务端口，优先读环境变量，默认 8000
export const PORT = Number(process.env.PORT) || 8999;

// 临时音频文件目录（位于项目根目录）
export const TEMP_DIR = path.resolve("temp");
