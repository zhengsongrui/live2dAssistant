import express from "express";
import {
  handleChatVoice,
  handleAsrVoice,
} from "../controllers/voice.controller.js";

const router = express.Router();

// 文字 -> AI 回复 -> 语音，返回 音频
router.get("/chatVoice", handleChatVoice);

// 语音 -> ASR -> AI 回复 -> 语音，返回 音频
router.post("/asrVoice", handleAsrVoice);

export default router;
