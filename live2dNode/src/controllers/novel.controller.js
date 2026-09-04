import {
  analyzeSegments,
  synthesizeSegments,
  synthesizeNovel,
} from "../services/novel/novelService.js";

/** 统一发送音频响应 */
function sendAudio(res, { audio, contentType, format }) {
  res.set("Content-Type", contentType);
  res.set("Content-Disposition", `inline; filename="novel-tts.${format}"`);
  res.send(audio);
}

/** 统一兜底错误 */
function fail(res, err, label) {
  console.error(label, err);
  if (!res.headersSent) res.status(500).send("novel server error");
}

/**
 * 处理 POST /novel-tts 完整链路接口（保留）：
 * 小说文本 -> LLM 识别 -> 分段情感 TTS -> FFmpeg 合并，返回最终音频。
 */
export async function handleNovelTts(req, res) {
  const { text, ...opts } = req.body ?? {};
  if (!text) return res.status(400).send("缺少 text 参数");
  try {
    sendAudio(res, await synthesizeNovel(text, opts));
  } catch (err) {
    fail(res, err, "小说语音合成失败:");
  }
}

/**
 * 处理 POST /novel/analyze 情感分析接口：
 * 小说文本（text）+ 可选 roles -> LLM 角色识别 + 8 维情感向量识别，返回 JSON segments（每段含 emoVector）。
 */
export async function handleNovelAnalyze(req, res) {
  const { text, ...opts } = req.body ?? {};
  if (!text) return res.status(400).send("缺少 text 参数");
  try {
    res.json({ segments: await analyzeSegments(text, opts) });
  } catch (err) {
    fail(res, err, "小说情感分析失败:");
  }
}

/**
 * 处理 POST /novel/tts 情感分析结果转语音接口：
 * JSON segments 数组（每段含 8 维情感向量 emoVector）+ 可选参数（voice/speed/format/bitrate）
 * -> 分段情感 TTS -> FFmpeg 合并，返回最终音频。
 */
export async function handleNovelSegmentsTts(req, res) {
  const { segments, ...opts } = req.body ?? {};
  if (!Array.isArray(segments) || segments.length === 0) {
    return res.status(400).send("缺少 segments 参数");
  }
  try {
    sendAudio(res, await synthesizeSegments(segments, opts));
  } catch (err) {
    fail(res, err, "小说分段语音合成失败:");
  }
}
