import express from "express";
import {
  handleTts,
  handleTtsGet,
  handleEmotionTts,
  handleEmotionTtsGet,
  handleListVoices,
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

// 获取全部音色列表接口：列出全部音色 id 及其参考音频路径（转发 F5-TTS 服务端）
router.get("/voices", handleListVoices);

export default router;
