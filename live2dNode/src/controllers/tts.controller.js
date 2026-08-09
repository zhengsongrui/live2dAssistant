import { synthesize } from "../services/tts/f5TtsService.js";

/**
 * 处理 POST /tts 文本合成语音接口：
 * 请求体 JSON 接收 text 及可选参数（voice/speed/seed/removeSilence）
 * 除 text 外其余字段直接透传给 synthesize（对齐 f5TtsService.js 的参数）
 */
export async function handleTts(req, res) {
  const { text, ...options } = req.body ?? {};
  if (!text) return res.status(400).send("缺少 text 参数");
  try {
    const audio = await synthesize(text, options);
    res.set("Content-Type", "audio/mp3");
    res.send(audio);
  } catch (err) {
    console.error("TTS 合成失败:", err);
    res.status(500).send("TTS server error");
  }
}

/**
 * 处理 GET /tts 文本合成语音接口（浏览器测试用）：
 * url 查询参数接收 text 及可选参数（voice/speed/seed/removeSilence）
 * 浏览器直接访问即可快速拿到 mp3 音频文件
 */
export async function handleTtsGet(req, res) {
  const { text, voice, speed, seed, removeSilence } = req.query ?? {};
  if (!text) return res.status(400).send("缺少 text 参数");
  try {
    // GET 查询参数均为字符串，此处做类型归一，对齐 POST 的 JSON 传参
    const options = {
      ...(voice && { voice }),
      ...(speed !== undefined && { speed: Number(speed) }),
      ...(seed !== undefined && { seed: Number(seed) }),
      ...(removeSilence !== undefined && { removeSilence: removeSilence === "true" }),
    };
    const audio = await synthesize(text, options);
    res.set("Content-Type", "audio/mp3");
    res.set("Content-Disposition", 'inline; filename="tts.mp3"');
    res.send(audio);
  } catch (err) {
    console.error("TTS 合成失败:", err);
    res.status(500).send("TTS server error");
  }
}
