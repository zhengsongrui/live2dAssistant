import express from "express";
import {
  handleTts,
  handleTtsGet,
  handleEmotionTts,
  handleEmotionTtsGet,
} from "../controllers/tts.controller.js";

const router = express.Router();

// 文本合成语音接口，返回 mp3 音频
router.post("/tts", handleTts);

// 浏览器测试接口，GET 请求通过 url 的 text 参数快速拿到音频，如 /tts?text=你好世界
router.get("/tts", handleTtsGet);

// 语气（情感）语音合成接口，支持三种情感控制方式，返回音频（默认 mp3）
router.post("/emotion-tts", handleEmotionTts);

// 浏览器测试接口，仅需 text 参数，其余使用默认值，如 /emotion-tts?text=今天天气真好
router.get("/emotion-tts", handleEmotionTtsGet);

export default router;
