import fs from "fs";
import path from "path";
import crypto from "crypto";
import { TEMP_DIR } from "../config/index.js";
import { transcribe } from "../services/asr/whisperService.js";
import { chatWithGPT } from "../services/llm/chatService.js";
import { cleanOutput } from "../utils/textClean.js";

/**
 * 处理 /asr 语音识别对话接口：
 * 接收原始音频 -> whisper 识别 -> 大模型对话 -> 清理输出 -> 返回文本
 */
export async function handleAsr(req, res) {
  try {
    const audioBuffer = req.body;

    // 确保 temp 目录存在
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    const fileName = `${Date.now()}-${crypto.randomUUID()}.mp3`;
    const audioPath = path.join(TEMP_DIR, fileName);

    fs.writeFileSync(audioPath, audioBuffer);

    const userText = await transcribe(audioPath);
    console.log("用户说:" + userText);

    const replyText = await chatWithGPT(userText);

    const cleanText = cleanOutput(replyText);
    console.log("格式化后的回答:" + cleanText);
    res.send(cleanText);
  } catch (err) {
    console.error(err);
    res.status(500).send("ASR server error");
  }
}
