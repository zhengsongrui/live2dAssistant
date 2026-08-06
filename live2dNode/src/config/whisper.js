import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 项目根目录（src/ 的上一级）
const ROOT_DIR = path.resolve(__dirname, "../..");

// whisper 本地二进制与模型配置集中管理
export const whisperConfig = {
  exePath: path.resolve(ROOT_DIR, "whisper/whisper-cli.exe"),
  modelPath: path.resolve(ROOT_DIR, "whisper/models/ggml-base.bin"),
  language: "zh",
};
