import express from "express";
import {
  handleNovelTts,
  handleNovelAnalyze,
  handleNovelSegmentsTts,
} from "../controllers/novel.controller.js";

const router = express.Router();

// 完整链路接口（保留）：小说文本 -> 角色/情感识别 + 分段情感 TTS + FFmpeg 合并，返回最终音频
router.post("/novelToTts", handleNovelTts);

// 情感分析接口：小说文本 -> LLM 角色/情感识别，返回 JSON segments
router.post("/novel/analyze", handleNovelAnalyze);

// 情感分析结果转语音接口：JSON segments -> 分段情感 TTS + FFmpeg 合并，返回最终音频
router.post("/novel/analyzeToTts", handleNovelSegmentsTts);

export default router;
