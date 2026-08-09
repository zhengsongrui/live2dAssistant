import fs from "fs";
import path from "path";
import crypto from "crypto";
import { TEMP_DIR } from "../config/index.js";
import { transcribe } from "../services/asr/whisperService.js";
import { chatWithGPT } from "../services/llm/chatService.js";
import { synthesize } from "../services/tts/f5TtsService.js";
import { cleanOutput } from "../utils/textClean.js";

/**
 * 文字 -> AI 回复 -> 语音
 * 接收文本，经大模型回复并合成语音，返回 mp3 音频
 */
export async function handleChatVoice(req, res) {
  try {
    const userText = req.query.text || "你好";
    console.log("用户说:" + userText);

    const replyText = cleanOutput(await chatWithGPT(userText)) || "好的";
    console.log("回答:" + replyText);

    const audio = await synthesize(replyText);
    res.set("Content-Type", "audio/mp3");
    res.send(audio);
  } catch (err) {
    console.error(err);
    res.status(500).send("Voice server error");
  }
}

/**
 * 语音 -> ASR -> AI 回复 -> 语音
 * 接收原始音频，识别后经大模型回复并合成语音，返回 音频
 */
export async function handleAsrVoice(req, res) {
  try {
    const audioBuffer = req.body;

    // 确保 temp 目录存在，写入临时 mp3 供 whisper 识别
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    const filePath = path.join(
      TEMP_DIR,
      `${Date.now()}-${crypto.randomUUID()}.mp3`
    );
    fs.writeFileSync(filePath, audioBuffer);

    const userText = await transcribe(filePath);
    console.log("用户说:" + userText);

    const replyText = cleanOutput(await chatWithGPT(userText)) || "好的";
    console.log("回答:" + replyText);

    const audio = await synthesize(replyText);
    res.set("Content-Type", "audio/mp3");
    res.send(audio);
  } catch (err) {
    console.error(err);
    res.status(500).send("Voice server error");
  }
}
