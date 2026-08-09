import express from "express";
import { handleTts, handleTtsGet } from "../controllers/tts.controller.js";

const router = express.Router();

// 文本合成语音接口，返回 mp3 音频
router.post("/tts", handleTts);

// 浏览器测试接口，GET 请求通过 url 的 text 参数快速拿到音频，如 /tts?text=你好世界
router.get("/tts", handleTtsGet);

export default router;
