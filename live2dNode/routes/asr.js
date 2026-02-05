import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { transcribe } from "../services/asrService.js";
import { chatWithGPT } from "../services/chatService.js";
import { cleanOutput } from "../utils/textClean.js";


const router = express.Router();

const TEMP_DIR = path.resolve("temp");

router.post("/asr", async (req, res) => {
  try {
    const audioBuffer = req.body;

    // ✅ 确保 temp 目录存在
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    const fileName = `${Date.now()}-${crypto.randomUUID()}.wav`;
    const audioPath = path.join(TEMP_DIR, fileName);

    fs.writeFileSync(audioPath, audioBuffer);

    const userText = await transcribe(audioPath);
    console.log("用户说:" + userText);

    // 2️⃣ GPT 对话
    const replyText = await chatWithGPT(userText);
    // console.log("GPT 回答:" + replyText);

    // 可选：识别完删除
    // fs.unlinkSync(audioPath);
    const cleanText = cleanOutput(replyText);
    console.log("格式化后的回答:" + cleanText);
    res.send(cleanText);
  } catch (err) {
    console.error(err);
    res.status(500).send("ASR server error");
  }
});
router.get("/asrText", async (req, res) => {
  try {
  
    const userText = '你好'
    console.log("用户说:" + userText);

    // 2️⃣ GPT 对话
    const replyText = await chatWithGPT(userText);
    // console.log("GPT 回答:" + replyText);

    // 可选：识别完删除
    // fs.unlinkSync(audioPath);
    const cleanText = cleanOutput(replyText);
    console.log("格式化后的回答:" + cleanText);
    res.send(cleanText);
  } catch (err) {
    console.error(err);
    res.status(500).send("ASR server error");
  }
});
router.get("/test", async (req, res) => {
  
    res.send('成功');
});
export default router;
